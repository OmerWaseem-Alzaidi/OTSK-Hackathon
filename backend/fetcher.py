"""
fetcher.py
----------
Thin async client for the two upstream REST APIs defined in the PRD
(§4 and §7.1). All network I/O for the product and user feeds lives here
so the rest of the app can stay pure.

Public surface:
    fetch_products()  -> list[dict]
    fetch_users()     -> list[dict]
    fetch_all()       -> tuple[list[dict], list[dict]]   # parallel

Failures surface as UpstreamUnavailableError so main.py can translate them
into a clean HTTP 503 for the client.
"""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any

import httpx

PRODUCTS_URL = os.getenv("PRODUCTS_URL", "https://api.nagya.app/products")
USERS_URL = os.getenv("USERS_URL", "https://api.nagya.app/users")
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "10"))


def _normalize_product(raw: dict[str, Any]) -> dict[str, Any]:
    """Map upstream product fields to the PRD schema used by the ranker."""
    if not isinstance(raw, dict):
        return {}
    price_raw = raw.get("price")
    if isinstance(price_raw, dict):
        price = price_raw.get("value")
    else:
        price = price_raw
    stock_raw = raw.get("stock")
    if isinstance(stock_raw, dict):
        stock_level = stock_raw.get("current")
    else:
        stock_level = raw.get("stock_level")
    return {
        **raw,
        "sku": raw.get("sku"),
        "name": raw.get("name") or raw.get("title"),
        "category": raw.get("category"),
        "expiry_date": raw.get("expiry_date") or raw.get("expiration_date"),
        "price": price,
        "stock_level": stock_level,
    }


def _normalize_user(raw: dict[str, Any]) -> dict[str, Any]:
    """Map upstream user fields to the PRD schema used by the ranker."""
    if not isinstance(raw, dict):
        return {}
    diets = raw.get("dietary_preferences")
    if not diets:
        fav = raw.get("favorite_category")
        diets = [fav] if fav else []
    return {
        **raw,
        "id": raw.get("id"),
        "name": raw.get("name"),
        "email": raw.get("email"),
        "dietary_preferences": diets,
        "purchase_history": raw.get("purchase_history") or [],
        "past_coupons": raw.get("past_coupons") or [],
    }


class UpstreamUnavailableError(RuntimeError):
    """Raised when a required upstream API fails (network / 5xx / bad JSON)."""

    def __init__(self, source: str, detail: str) -> None:
        super().__init__(f"{source}: {detail}")
        self.source = source
        self.detail = detail


async def _get_json(client: httpx.AsyncClient, url: str, label: str) -> list[dict[str, Any]]:
    start = time.perf_counter()
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        print(f"[fetcher] {label} network failure for {url}: {exc!r}")
        raise UpstreamUnavailableError(label, f"network error: {exc}") from exc

    if response.status_code >= 400:
        print(f"[fetcher] {label} HTTP {response.status_code} from {url}")
        raise UpstreamUnavailableError(label, f"HTTP {response.status_code}")

    try:
        payload = response.json()
    except ValueError as exc:
        print(f"[fetcher] {label} non-JSON body from {url}: {exc!r}")
        raise UpstreamUnavailableError(label, "invalid JSON body") from exc

    # Some APIs nest under `data` / `items`; be forgiving.
    if isinstance(payload, dict):
        for key in ("data", "items", "results", label.lower()):
            if key in payload and isinstance(payload[key], list):
                payload = payload[key]
                break

    if not isinstance(payload, list):
        print(f"[fetcher] {label} payload was not a list: {type(payload).__name__}")
        raise UpstreamUnavailableError(label, "payload was not a list")

    elapsed_ms = (time.perf_counter() - start) * 1000
    print(f"[fetcher] fetched {len(payload)} {label} in {elapsed_ms:.0f} ms")
    return payload


async def fetch_products() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        raw = await _get_json(client, PRODUCTS_URL, "products")
    return [_normalize_product(p) for p in raw]


async def fetch_users() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        raw = await _get_json(client, USERS_URL, "users")
    return [_normalize_user(u) for u in raw]


async def fetch_all() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Fetch products and users concurrently. Returns (products, users)."""
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        products_task = _get_json(client, PRODUCTS_URL, "products")
        users_task = _get_json(client, USERS_URL, "users")
        raw_products, raw_users = await asyncio.gather(products_task, users_task)
    return (
        [_normalize_product(p) for p in raw_products],
        [_normalize_user(u) for u in raw_users],
    )
