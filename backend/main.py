"""
main.py
-------
FastAPI entry point — wires the fetcher, ranker, email generator, PDF generator
and optional weather booster into the HTTP surface documented in PRD §8.

Run:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response

from email_gen import render_email
from fetcher import (
    UpstreamUnavailableError,
    fetch_all,
    fetch_products,
    fetch_users,
)
from pdf_gen import generate_coupon_pdf
from ranker import DISCOUNT_BY_DAYS_LEFT, rank_products_for_user
from weather import get_boosted_categories

load_dotenv()

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000").rstrip("/")
VALID_DISCOUNTS = set(DISCOUNT_BY_DAYS_LEFT.values())  # {0, 20, 50}

app = FastAPI(
    title="Smart Promo Email Generator",
    version="1.0.0",
    description="Hackathon backend that turns expiring inventory into personalised emails + PDF coupons.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.exception_handler(UpstreamUnavailableError)
async def _upstream_error_handler(_request: Request, exc: UpstreamUnavailableError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": "upstream API unavailable",
            "source": exc.source,
            "detail": exc.detail,
        },
    )


def _find_user(users: list[dict[str, Any]], user_id: str) -> dict[str, Any] | None:
    target = str(user_id)
    for u in users:
        if isinstance(u, dict) and str(u.get("id")) == target:
            return u
    return None


@app.get("/")
async def health() -> dict[str, str]:
    return {"status": "Smart Promo Backend Running 🚀"}


# Browsers probe these paths automatically for tab/bookmark icons. We don't
# ship any, so answer with a silent 204 to keep the uvicorn log clean.
@app.get("/favicon.ico", include_in_schema=False)
@app.get("/apple-touch-icon.png", include_in_schema=False)
@app.get("/apple-touch-icon-precomposed.png", include_in_schema=False)
async def _no_icon() -> Response:
    return Response(status_code=204)


@app.get("/users")
async def list_users() -> list[dict[str, Any]]:
    return await fetch_users()


@app.get("/products")
async def list_products() -> list[dict[str, Any]]:
    return await fetch_products()


@app.get("/ranked/{user_id}")
async def ranked_for_user(user_id: str) -> dict[str, Any]:
    products, users = await fetch_all()
    user = _find_user(users, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail={"error": "User not found"})

    boost = await get_boosted_categories()
    ranked = rank_products_for_user(products, user, weather_boost_categories=boost)
    return {
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
        },
        "weather_boost_categories": boost,
        "count": len(ranked),
        "products": ranked,
    }


@app.get("/email/{user_id}", response_class=HTMLResponse)
async def email_for_user(user_id: str) -> HTMLResponse:
    try:
        products, users = await fetch_all()
    except UpstreamUnavailableError:
        raise
    user = _find_user(users, user_id)
    if user is None:
        return JSONResponse(status_code=404, content={"error": "User not found"})

    boost = await get_boosted_categories()
    ranked = rank_products_for_user(products, user, weather_boost_categories=boost)
    html = render_email(user=user, ranked=ranked, base_url=BACKEND_BASE_URL)
    return HTMLResponse(content=html, status_code=200)


@app.get("/coupon/{sku}/{discount}")
async def coupon(
    sku: str,
    discount: int,
    user_name: str = Query("Customer", min_length=1, max_length=80),
) -> FileResponse:
    if discount not in VALID_DISCOUNTS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid discount",
                "allowed": sorted(VALID_DISCOUNTS),
            },
        )

    # We try to enrich the coupon with the real product name + expiry.
    # If the upstream is temporarily flaky we still issue a coupon — it just
    # omits those fields rather than failing the judge's demo.
    product_name = sku
    expiry_date = "—"
    try:
        products = await fetch_products()
        for p in products:
            if isinstance(p, dict) and str(p.get("sku")) == str(sku):
                product_name = str(p.get("name") or sku)
                expiry_date = str(p.get("expiry_date") or "—")
                break
    except UpstreamUnavailableError as exc:
        print(f"[main] coupon endpoint ignoring upstream error: {exc}")

    path = generate_coupon_pdf(
        user_name=user_name,
        sku=sku,
        discount=discount,
        product_name=product_name,
        expiry_date=expiry_date,
    )
    filename = os.path.basename(path)
    return FileResponse(path=path, media_type="application/pdf", filename=filename)
