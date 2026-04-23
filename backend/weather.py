"""
weather.py
----------
Optional OpenWeatherMap integration that returns a list of product categories
to boost for the day based on current conditions in Budapest, HU.

All failures are swallowed — the app must keep running even when the key is
missing or the service is down. See PRD §5.2 and §7.5.
"""

from __future__ import annotations

import os
import time
from typing import Optional

import httpx

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
CITY = os.getenv("WEATHER_CITY", "Budapest,HU")
CACHE_TTL_SECONDS = 30 * 60  # 30 minutes per PRD

_SUNNY_BOOST = ["BBQ", "Grill", "Outdoor", "Ice Cream"]
_RAINY_BOOST = ["Soup", "Hot Drinks", "Comfort Food"]

# Module-level single-slot cache: (expires_at_epoch, categories).
_cache: Optional[tuple[float, list[str]]] = None


def _map_weather_to_boost(main: str) -> list[str]:
    main_lc = (main or "").lower()
    if main_lc in {"clear", "clouds"}:
        return list(_SUNNY_BOOST)
    if main_lc in {"rain", "drizzle", "thunderstorm"}:
        return list(_RAINY_BOOST)
    return []


async def get_boosted_categories() -> list[str]:
    """Return the list of category names to boost, possibly empty."""
    global _cache

    now = time.time()
    if _cache is not None and _cache[0] > now:
        return list(_cache[1])

    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "").strip()
    if not api_key:
        print("[weather] OPENWEATHERMAP_API_KEY not set — skipping weather boost")
        _cache = (now + CACHE_TTL_SECONDS, [])
        return []

    params = {"q": CITY, "appid": api_key, "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(OPENWEATHER_URL, params=params)
        if resp.status_code != 200:
            print(f"[weather] OpenWeatherMap HTTP {resp.status_code}: {resp.text[:120]}")
            _cache = (now + CACHE_TTL_SECONDS, [])
            return []
        payload = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"[weather] fetch failed: {exc!r}")
        _cache = (now + CACHE_TTL_SECONDS, [])
        return []

    try:
        main = payload["weather"][0]["main"]
    except (KeyError, IndexError, TypeError):
        print(f"[weather] unexpected payload shape: {payload!r}")
        _cache = (now + CACHE_TTL_SECONDS, [])
        return []

    boost = _map_weather_to_boost(main)
    print(f"[weather] {CITY} -> {main!r} -> boost={boost}")
    _cache = (now + CACHE_TTL_SECONDS, boost)
    return list(boost)


__all__ = ["get_boosted_categories"]
