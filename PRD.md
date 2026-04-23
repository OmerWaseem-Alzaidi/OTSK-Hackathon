# Smart Promo Email Generator — PRD & Technical Specification

> **Status:** v1.0 — authoritative reference for the entire hackathon build.
> **Audience:** every code change in this repo must conform to this document.
> **If a conflict arises between the PRD and an implementation detail, the PRD wins unless a new revision of this document supersedes it.**

---

## 1. Product Vision

Retailers sit on large amounts of soon-to-expire inventory every day. A one-size-fits-all "daily deals" email converts poorly and trains users to ignore promotions. **Smart Promo Email Generator** turns the same inventory into a *per-user*, *urgency-driven*, *beautifully branded* email with a *scannable, single-use looking* PDF coupon attached on click.

The system is a pure backend demo (Python + FastAPI) that any frontend can point at. During the hackathon demo the judges will:

1. Open `GET /email/{user_id}` in a browser and see a full HTML email rendered.
2. Click a discount button, which downloads a real PDF coupon with a scannable Code128 barcode.
3. Watch us scan that barcode with a phone — the wow moment.

---

## 2. Goals & Non-Goals

### 2.1 Goals (must-have)

1. Pull products and users from two external REST APIs **in parallel**.
2. Rank products for a specific user by expiry urgency and personal relevance.
3. Render a beautiful, inline-styled HTML email preview per user, capped at 10 products.
4. Generate a per-user + per-SKU PDF coupon carrying a real Code128 barcode.
5. Be runnable with `uvicorn main:app --reload --port 8000` after a single `pip install -r requirements.txt`.

### 2.2 Stretch goals

6. Boost weather-relevant product categories using live weather from OpenWeatherMap (Budapest, HU), cached 30 min.

### 2.3 Non-goals (explicitly out of scope)

- Real authentication, user accounts, or rate-limiting.
- Persisting coupons or emails to a database.
- Actually sending emails via SMTP.
- Tracking redemptions or revocation of coupons.
- Internationalisation (English-only strings).
- Unit-test coverage beyond a smoke path.

---

## 3. Personas & Primary Flow

**Persona — "Sarah the shopper":** signed up to the store's loyalty program, has a purchase history and dietary preferences (e.g. `vegetarian`, `gluten-free`). She expects the retailer to only show her deals she will actually use.

**Primary flow (judge demo):**

1. Judge opens `http://localhost:8000/users` in a browser → JSON of users, picks `id=1`.
2. Judge opens `http://localhost:8000/email/1` → gorgeous HTML email renders for Sarah.
3. Judge clicks the big red **"50% OFF — Download Coupon"** button.
4. Browser downloads `coupon_{SKU}.pdf`. Opening it shows Sarah's name, product, discount, a real Code128 barcode, and expiry.
5. Judge scans the PDF with a phone barcode scanner → it reads the SKU.

---

## 4. External Data Sources (READ-ONLY)

### 4.1 Products API

- **Endpoint:** `GET https://api1.nagya.app/products`
- **Response:** JSON array of product objects. Each object has:
  - `sku` (string) — unique identifier, used as barcode payload.
  - `name` (string) — human-readable product name.
  - `expiry_date` (string, `YYYY-MM-DD`) — date of expiry.
  - `stock_level` (integer) — units on hand; informational only.
  - `category` (string) — e.g. `Dairy`, `BBQ`, `Bakery`.
  - `price` (number) — base price in the store's currency (assumed EUR or HUF; treated as opaque).

### 4.2 Users API

- **Endpoint:** `GET https://api1.nagya.app/users`
- **Response:** JSON array of user objects. Each object has:
  - `id` (string or int) — primary key for lookup in `/email/{user_id}`.
  - `name` (string) — full display name.
  - `email` (string) — shown informally, not used to *send* mail in v1.
  - `purchase_history` (array of SKU strings).
  - `dietary_preferences` (array of strings, e.g. `["vegetarian", "dairy-free"]`).
  - `past_coupons` (array of SKU strings already couponed to this user).

### 4.3 Weather API (optional)

- **Endpoint:** `https://api.openweathermap.org/data/2.5/weather?q=Budapest,HU&appid={KEY}`
- Read key from `.env` → `OPENWEATHERMAP_API_KEY`.
- 30-minute in-process cache.

---

## 5. Business Rules (hard constraints — never violate)

| # | Rule |
|---|------|
| BR-1 | **Never** show a product whose expiry has already passed (`days_left < 0`). |
| BR-2 | **Never** show more than **10** products per email. |
| BR-3 | Discount tier is fixed by `days_left` and cannot be overridden: `3 → highlight only (0%)`, `2 → 20%`, `1 → 50%`, `0 → skip (expired)`. |
| BR-4 | Products with `days_left > 3` are **not** urgent deals and are excluded from the email. |
| BR-5 | Ranking: primary key `days_left ASC`, secondary key `relevance_score DESC`, tertiary (tiebreak) `sku ASC` for determinism. |
| BR-6 | Relevance scoring (additive, integer): `+3` if SKU ∈ `purchase_history`; `+2` if `category` ∈ `dietary_preferences` (case-insensitive match); `+1` if SKU ∉ `past_coupons`. Weather bonus: `+5` if category is in the active weather boost list. |
| BR-7 | Every PDF coupon includes: user's full name, product name, SKU, discount %, real scannable Code128 barcode encoding the SKU, and the coupon expiry (= product expiry). |
| BR-8 | Each coupon PDF is uniquely determined by `(user_name, sku)` and stored at `/tmp/coupon_{sku}_{user_name}.pdf` (spaces in name sanitised to `_`). |
| BR-9 | Products missing `expiry_date` are dropped silently and logged. |
| BR-10 | All external calls are async; products and users are fetched with `asyncio.gather` in parallel. |

### 5.1 Discount mapping (canonical)

```
days_left >= 4  → EXCLUDED
days_left == 3  → 0   (HIGHLIGHT only)
days_left == 2  → 20
days_left == 1  → 50
days_left == 0  → EXCLUDED (expired today)
days_left <  0  → EXCLUDED
```

### 5.2 Weather boost map (if weather feature active)

| Weather main | Boosted categories |
|---|---|
| `Clear` / `Clouds` sunny | `BBQ`, `Grill`, `Outdoor`, `Ice Cream` |
| `Rain` / `Drizzle` / `Thunderstorm` | `Soup`, `Hot Drinks`, `Comfort Food` |
| Anything else | *(no boost)* |

Boost amount: **+5** relevance per matching product.

---

## 6. Architecture Overview

```
          ┌───────────────────────────┐
 judge ─► │  FastAPI (main.py)        │
          │    routes + CORS + glue   │
          └──────────┬────────────────┘
                     │
   ┌─────────────────┼──────────────────────────┐
   │                 │                          │
┌──▼──────┐   ┌──────▼──────┐            ┌──────▼──────┐
│fetcher  │   │ ranker.py   │            │ pdf_gen.py  │
│  .py    │   │             │            │             │
│ httpx   │   │ filter +    │            │ reportlab + │
│ async   │   │ score +     │            │ python-     │
│ gather  │   │ sort + cap  │            │ barcode     │
└──┬──────┘   └──────┬──────┘            └──────┬──────┘
   │                 │                          │
   │          ┌──────▼──────┐            ┌──────▼──────┐
   │          │ email_gen   │            │  /tmp/…pdf  │
   │          │  .py (HTML) │            └─────────────┘
   │          └─────────────┘
   │
┌──▼───────────────┐      ┌──────────────────────┐
│ products API     │      │ weather.py           │
│ users API        │      │ OpenWeatherMap (opt) │
└──────────────────┘      └──────────────────────┘
```

All I/O is async where it matters; business logic is pure functions (easier to reason about during a hackathon).

---

## 7. Module-by-module Specification

### 7.1 `fetcher.py`

**Responsibility:** talk to the two external REST APIs and return parsed Python lists. Nothing else.

- Public functions (all async):
  - `async fetch_products() -> list[dict]`
  - `async fetch_users() -> list[dict]`
  - `async fetch_all() -> tuple[list[dict], list[dict]]` — uses `asyncio.gather`.
- Shared `httpx.AsyncClient` with `timeout=10s`.
- On HTTP ≥ 400 or timeout: raise `UpstreamUnavailableError` (custom). `main.py` converts that into `HTTPException(503)`.
- Logs every call with `print(...)`.

### 7.2 `ranker.py`

**Responsibility:** pure business logic; no I/O.

- `DISCOUNT_BY_DAYS_LEFT: dict[int, int]` — canonical mapping from §5.1.
- `days_left(expiry_date: str, today: date | None = None) -> int | None` — returns `None` if `expiry_date` is missing/invalid.
- `relevance_score(product, user, weather_boost_categories) -> int` — implements BR-6.
- `rank_products_for_user(products, user, weather_boost_categories=None) -> list[RankedProduct]` —
  1. Drop products without a parseable expiry.
  2. Compute `days_left`; drop if not in `{1, 2, 3}`.
  3. Compute `discount_percent` from §5.1.
  4. Compute `relevance_score`.
  5. Sort by `(days_left ASC, -relevance_score, sku ASC)`.
  6. Return the first **10**.
- `RankedProduct` is a plain `dict` with keys: `sku, name, category, price, expiry_date, days_left, discount_percent, relevance_score, highlight` (bool — true when `days_left == 3`).

### 7.3 `pdf_gen.py`

**Responsibility:** turn a `(user_name, sku, discount, product_name, expiry_date)` tuple into a nice A4 PDF at `/tmp/coupon_{sku}_{user_name}.pdf` and return that path.

- Uses `reportlab.pdfgen.canvas.Canvas` on A4.
- Barcode: `python-barcode` → `Code128(sku, writer=ImageWriter())`, saved to a `BytesIO`, then drawn into the PDF via `reportlab.platypus` or `drawImage`.
- If barcode generation raises: catch, log, draw `SKU: {sku}` in a large mono font instead (BR — "still return PDF without barcode but with SKU text visible").
- Sanitisation: `user_name` has spaces and non-`[A-Za-z0-9_-]` replaced with `_` for the filename only. The rendered text keeps the real name.
- Layout (top to bottom, centered where it helps):
  1. Title `EXCLUSIVE COUPON` (Helvetica-Bold, ~36pt).
  2. `For: {user_name}` (Helvetica, 16pt).
  3. Product name (Helvetica-Bold, 20pt).
  4. `SKU: {sku}` (Helvetica, 12pt).
  5. Huge `{discount}% OFF` in red (Helvetica-Bold, ~72pt). When `discount == 0` render `⚡ EXPIRING SOON` instead.
  6. `Valid until: {expiry_date}` (Helvetica, 14pt).
  7. Barcode image, centered, ~4cm tall.
  8. Footer: `Scan at checkout | Smart Promo Generator` (Helvetica-Oblique, 10pt, grey).

### 7.4 `email_gen.py`

**Responsibility:** render one HTML string for a user given their ranked products.

- Single public function: `render_email(user: dict, ranked: list[dict], base_url: str) -> str`.
- 100% **inline CSS** (email clients strip `<style>` aggressively).
- Outer container: `max-width: 600px; margin: 0 auto; font-family: -apple-system, Segoe UI, Roboto, sans-serif;`.
- Header card: greeting `Hi {user.name}! 👋 Your exclusive deals today:`.
- Product card per item (flex-like using tables for email-client compatibility):
  - Bold product name.
  - "X day(s) left" pill in a colour:
    - `1 day` → red `#E53935`
    - `2 days` → orange `#FB8C00`
    - `3 days` → yellow `#FDD835` with dark text
  - Original price `€{price}` with strikethrough when a discount applies.
  - Discounted price (when `discount > 0`): `€{price * (1 - discount/100):.2f}`.
  - CTA button (fully-inline styled `<a>`):
    - `discount == 50` → red button `"50% OFF — Download Coupon"`
    - `discount == 20` → orange button `"20% OFF — Download Coupon"`
    - `discount == 0`  → yellow button `"⚡ Expiring Soon — Get Coupon"`
  - Button `href = f"{base_url}/coupon/{sku}/{discount}?user_name={quoted name}"`.
- Footer: `Personalized just for you | Smart Promo`.
- Empty state: if `ranked` is empty, render a friendly "No urgent deals for you today — check back tomorrow!" card.

### 7.5 `weather.py`

**Responsibility:** fetch Budapest weather, translate the `weather[0].main` field into a list of boosted categories, cache for 30 minutes.

- `async get_boosted_categories() -> list[str]`.
- Uses `httpx.AsyncClient`. No key → immediately returns `[]` and logs a hint.
- Simple module-level `(timestamp, value)` tuple for cache (good enough for a hackathon, single-process demo).
- Failures (network, non-200, bad JSON) are swallowed → `[]` returned, logged.

### 7.6 `main.py`

**Responsibility:** wire everything into FastAPI.

- App creation + CORS middleware with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- `BACKEND_BASE_URL` resolved from `os.getenv("BACKEND_BASE_URL", "http://localhost:8000")` and passed to `email_gen.render_email`.
- Endpoints (see §8).
- Custom exception handler: `UpstreamUnavailableError → HTTPException(503, {"error": "upstream API unavailable", ...})`.

---

## 8. API Endpoints (contract)

| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/` | `{"status": "Smart Promo Backend Running 🚀"}` | health check |
| GET | `/users` | `list[User]` | raw passthrough from upstream |
| GET | `/products` | `list[Product]` | raw passthrough; debugging only |
| GET | `/ranked/{user_id}` | `{"user": {...}, "products": [RankedProduct × ≤10]}` | preview for the frontend |
| GET | `/email/{user_id}` | `HTMLResponse` (full email) | main demo route; 404 if user missing |
| GET | `/coupon/{sku}/{discount}?user_name=...` | `FileResponse` (PDF) | generates & downloads coupon |

### 8.1 Status codes

- `200` normal.
- `404` when user is not found in `/ranked/{user_id}` or `/email/{user_id}`.
- `503` when an upstream API is unreachable.
- `500` for anything unexpected (FastAPI default).

### 8.2 Query/Path validation

- `user_id` is treated as a **string** and compared with `str(user["id"])` — avoids breaking if the upstream returns numeric IDs.
- `discount` must be one of `{0, 20, 50}`; other values → `400 Bad Request`.
- `user_name` optional, default `"Customer"`, trimmed, length-limited to 80 chars.

---

## 9. File/Folder Layout

```
backend/
├── main.py
├── fetcher.py
├── ranker.py
├── email_gen.py
├── pdf_gen.py
├── weather.py
├── requirements.txt
├── .env.example      # committed; real secrets go into a local .env (ignored)
└── README.md
```

`.env` is **not** committed. `.env.example` shows the required variable names.

---

## 10. Dependencies (`requirements.txt`)

```
fastapi>=0.110
uvicorn[standard]>=0.27
httpx>=0.27
python-barcode>=0.15
reportlab>=4.0
pillow>=10.0
python-dotenv>=1.0
requests>=2.31
```

`requests` is listed per the spec even though `httpx` is the primary client; it remains available for ad-hoc scripts.

---

## 11. Error Handling Matrix

| Situation | Behaviour |
|---|---|
| External API 5xx / timeout / DNS fail | raise `UpstreamUnavailableError` → `503` with `{"error": "..."}` |
| `user_id` not found | `404 {"error": "User not found"}` |
| Product missing `expiry_date` | silently skipped; `print()` warning |
| Product with unparseable `expiry_date` | skipped; warning |
| Barcode generation failure | PDF still generated; SKU rendered as text; warning |
| OpenWeatherMap unavailable or key missing | no boost applied; warning |
| Invalid `discount` path param | `400 Bad Request` |

---

## 12. CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)
```

Hackathon-grade wide-open; tighten later if this project ever ships.

---

## 13. Observability

- Every module logs via `print(...)` with a `[module]` prefix (e.g. `[fetcher] fetched 132 products in 412 ms`).
- No log aggregation, no structured JSON logs — keep it readable in a single terminal.

---

## 14. Security Notes

- No PII leaves the machine.
- `/tmp` is the only write target. Filenames are sanitised to prevent path traversal: `re.sub(r"[^A-Za-z0-9_.-]", "_", ...)`.
- `.env` is git-ignored; `.env.example` documents variables.

---

## 15. Performance Targets

| Metric | Target |
|---|---|
| `/ranked/{user_id}` end-to-end (warm upstream) | < 500 ms |
| `/email/{user_id}` end-to-end (warm upstream) | < 800 ms |
| `/coupon/...` PDF generation | < 400 ms |
| Concurrent product + user fetch speedup vs serial | ≥ 1.6× |

---

## 16. Test Plan (manual, hackathon speed)

1. `curl http://localhost:8000/` → `{"status": "Smart Promo Backend Running 🚀"}`.
2. `curl http://localhost:8000/users | jq 'length'` → > 0.
3. `curl http://localhost:8000/products | jq 'length'` → > 0.
4. Pick a known user id from step 2. `curl http://localhost:8000/ranked/<id>` → ≤ 10 ranked products, all with `days_left ∈ {1,2,3}`.
5. Open `http://localhost:8000/email/<id>` in a browser → renders email, all buttons link to `/coupon/...`.
6. Click a 50% button → PDF downloads, opens, barcode scans with a phone camera.
7. Kill network / export a bad `api1.nagya.app` host → `/users` returns 503 with a helpful error body.

---

## 17. Build Order (maps to `## DEVELOPMENT PRIORITIES`)

1. `fetcher.py` — real data first.
2. `ranker.py` — core business logic.
3. `pdf_gen.py` — the wow.
4. `email_gen.py` — the pretty.
5. `main.py` — wire.
6. `weather.py` — bonus.

---

## 18. Open Questions (resolved with sensible defaults)

| Question | Decision |
|---|---|
| What if `users[i].id` is int vs string? | Compare via `str()` on both sides. |
| Prices missing or non-numeric? | Render `—` instead of computing discount math. |
| Currency symbol? | `€` (Budapest / EU default). |
| What base URL goes into email buttons? | `BACKEND_BASE_URL` env var, defaults to `http://localhost:8000`. |
| Should coupons for `0% highlight` still generate a PDF? | Yes — it's an "expiring soon" reminder with a barcode. |

---

## 19. Revision Log

- **v1.0 (2026-04-23)** — initial authoritative PRD.
