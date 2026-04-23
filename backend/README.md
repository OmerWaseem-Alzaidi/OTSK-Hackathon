# Smart Promo Email Generator — Backend

Hackathon-grade FastAPI backend that turns soon-to-expire inventory into a
personalised HTML promo email and a scannable PDF coupon.

The authoritative spec is [`../PRD.md`](../PRD.md). Every module maps 1:1 to a
section there.

---

## 1. What's in the box

```
backend/
├── main.py          FastAPI app, CORS, all routes
├── fetcher.py       async httpx calls (products + users in parallel)
├── ranker.py        filter expired, score relevance, sort, cap at 10
├── email_gen.py     inline-CSS HTML email template
├── pdf_gen.py       A4 PDF coupon + Code128 barcode (python-barcode)
├── weather.py       optional OpenWeatherMap boost, 30-min in-memory cache
├── requirements.txt pinned min versions
├── .env.example     copy to .env to configure secrets
└── README.md        this file
```

---

## 2. Requirements

- **Python 3.11+** (uses `list[dict]` PEP-585 generics and `X | Y` unions)
- Network access to `api1.nagya.app` (hackathon product + user APIs)
- Optional: an OpenWeatherMap API key for the weather boost

---

## 3. Setup (2 minutes)

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

cp .env.example .env
# (optional) open .env and paste your OPENWEATHERMAP_API_KEY
```

---

## 4. Run

```bash
uvicorn main:app --reload --port 8000
```

Open <http://localhost:8000/> — you should see:

```json
{"status": "Smart Promo Backend Running 🚀"}
```

---

## 5. Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/` | health check |
| GET | `/users` | raw list of users from the upstream API |
| GET | `/products` | raw list of products from the upstream API |
| GET | `/ranked/{user_id}` | top-10 ranked products for a user (JSON, with metadata) |
| GET | `/email/{user_id}` | the full HTML promo email — open this in a browser |
| GET | `/coupon/{sku}/{discount}?user_name=NAME` | downloads a PDF coupon with a scannable Code128 barcode |

`discount` must be one of `0`, `20`, `50` (the canonical tiers from the PRD).

---

## 6. Quick manual test

```bash
# 1. Health
curl -s http://localhost:8000/

# 2. Pick a user
curl -s http://localhost:8000/users | python -m json.tool | head

# 3. Preview their ranked deals
curl -s http://localhost:8000/ranked/1 | python -m json.tool

# 4. Render the email (in a browser for the pretty version)
open http://localhost:8000/email/1

# 5. Download a coupon
curl -OJ "http://localhost:8000/coupon/SKU123/50?user_name=Sarah"
# -> coupon_SKU123_Sarah.pdf lands in the current dir. Open it and scan the barcode.
```

---

## 7. Configuration (environment variables)

All optional — sensible defaults are in place for a local demo.

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_BASE_URL` | `http://localhost:8000` | Base URL embedded in email CTA buttons |
| `PRODUCTS_URL` | `https://api1.nagya.app/products` | Upstream products endpoint |
| `USERS_URL` | `https://api1.nagya.app/users` | Upstream users endpoint |
| `OPENWEATHERMAP_API_KEY` | *(empty)* | Enables the weather boost when set |
| `WEATHER_CITY` | `Budapest,HU` | City used for the weather boost lookup |
| `HTTP_TIMEOUT_SECONDS` | `10` | httpx timeout for upstream calls |

---

## 8. Business rules (quick reference — the full rules live in the PRD)

- Never show expired items or items > 3 days from expiry.
- Never show more than 10 products per email.
- Discount tiers are hard-coded: `3d → highlight`, `2d → 20%`, `1d → 50%`, `0d → skip`.
- Ranking is `(days_left ASC, relevance_score DESC, sku ASC)`.
- Relevance = `+3 history`, `+2 diet match`, `+1 not-past-couponed`, `+5 weather boost`.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `503 upstream API unavailable` | `api1.nagya.app` unreachable | check VPN / hackathon Wi-Fi |
| `404 User not found` | The upstream returned a different set of users | `curl /users` to see valid ids |
| `400 invalid discount` | Discount isn't one of `0,20,50` | use a canonical tier |
| PDF missing barcode | `python-barcode` / `Pillow` import failed | `pip install -r requirements.txt` again inside the venv |
| Weather boost never applied | No `OPENWEATHERMAP_API_KEY` set | add one to `.env` and restart |

Everything logs with a `[module]` prefix on stdout — tail `uvicorn` to see what
happened.

---

## 10. License

Hackathon prototype — MIT-style "do what you want, no warranty".
