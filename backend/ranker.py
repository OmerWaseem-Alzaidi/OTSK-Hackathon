"""
ranker.py
---------
Pure business logic for filtering, scoring and ranking the product catalogue
for a specific user. No network, no file I/O — easy to reason about and,
if we ever want to, trivial to unit test.

Implements rules BR-1 through BR-6 and BR-9 from the PRD.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Iterable

# Canonical discount mapping — matches PRD §5.1 exactly.
DISCOUNT_BY_DAYS_LEFT: dict[int, int] = {
    3: 0,   # highlight only
    2: 20,
    1: 50,
}

# Keep the set of days_left values we're willing to show. Everything else
# (expired, or too-far-out) is excluded.
ELIGIBLE_DAYS_LEFT: set[int] = set(DISCOUNT_BY_DAYS_LEFT.keys())


def _parse_expiry(value: Any) -> date | None:
    """Parse the upstream `expiry_date` string. Returns None when unusable."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None
    # Accept `YYYY-MM-DD` and a few common variants without over-engineering.
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def days_left(expiry_value: Any, today: date | None = None) -> int | None:
    """Number of whole days between `today` and `expiry_value`. None if invalid."""
    expiry = _parse_expiry(expiry_value)
    if expiry is None:
        return None
    today = today or date.today()
    return (expiry - today).days


def _norm_set(values: Iterable[Any] | None) -> set[str]:
    """Lower-case, strip, and coerce to a set of strings — robust to messy input."""
    if not values:
        return set()
    out: set[str] = set()
    for v in values:
        if v is None:
            continue
        out.add(str(v).strip().lower())
    return out


def relevance_score(
    product: dict[str, Any],
    user: dict[str, Any],
    weather_boost_categories: Iterable[str] | None = None,
) -> int:
    """Implements BR-6 from the PRD."""
    sku = str(product.get("sku", "")).strip().lower()
    category = str(product.get("category", "")).strip().lower()

    history = _norm_set(user.get("purchase_history"))
    diets = _norm_set(user.get("dietary_preferences"))
    past_coupons = _norm_set(user.get("past_coupons"))
    boost = _norm_set(weather_boost_categories)

    score = 0
    if sku and sku in history:
        score += 3
    if category and category in diets:
        score += 2
    if sku and sku not in past_coupons:
        score += 1
    if category and category in boost:
        score += 5
    return score


def rank_products_for_user(
    products: list[dict[str, Any]],
    user: dict[str, Any],
    weather_boost_categories: Iterable[str] | None = None,
    today: date | None = None,
    max_items: int = 10,
) -> list[dict[str, Any]]:
    """Return at most `max_items` ranked products for the given user.

    Each returned dict contains all keys documented in PRD §7.2.
    """
    ranked: list[dict[str, Any]] = []
    today = today or date.today()

    for product in products:
        if not isinstance(product, dict):
            continue

        expiry_raw = product.get("expiry_date")
        dleft = days_left(expiry_raw, today=today)
        if dleft is None:
            print(f"[ranker] skipping product without parseable expiry: {product.get('sku')!r}")
            continue
        if dleft not in ELIGIBLE_DAYS_LEFT:
            # BR-1, BR-4, and the "skip expired (0 or negative)" rules.
            continue

        discount = DISCOUNT_BY_DAYS_LEFT[dleft]
        score = relevance_score(product, user, weather_boost_categories)

        ranked.append(
            {
                "sku": product.get("sku"),
                "name": product.get("name"),
                "category": product.get("category"),
                "price": product.get("price"),
                "stock_level": product.get("stock_level"),
                "expiry_date": str(expiry_raw),
                "days_left": dleft,
                "discount_percent": discount,
                "relevance_score": score,
                "highlight": dleft == 3,
            }
        )

    # Primary: days_left asc (most urgent first).
    # Secondary: relevance desc (most relevant wins ties).
    # Tertiary: sku asc — deterministic tiebreak so output is stable.
    ranked.sort(key=lambda p: (p["days_left"], -p["relevance_score"], str(p.get("sku") or "")))

    return ranked[:max_items]
