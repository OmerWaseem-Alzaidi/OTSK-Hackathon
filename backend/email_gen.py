"""
email_gen.py
------------
Render a single HTML email string for a user given a pre-ranked product list.

The template is deliberately built from tables and inline styles because real
email clients (Gmail, Outlook, Apple Mail) strip `<style>` blocks and ignore
most modern layout. This also keeps the output easy to preview in a browser.
"""

from __future__ import annotations

from html import escape
from typing import Any
from urllib.parse import quote

_CONTAINER_STYLE = (
    "max-width:600px;margin:24px auto;padding:0;"
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,"
    "Helvetica,Arial,sans-serif;color:#212121;background:#ffffff;"
)

_HEADER_STYLE = (
    "background:linear-gradient(135deg,#E53935 0%,#FB8C00 100%);"
    "color:#fff;padding:28px 24px;border-radius:12px 12px 0 0;"
    "font-size:22px;font-weight:700;line-height:1.3;"
)

_CARD_STYLE = (
    "background:#fff;border:1px solid #EEEEEE;border-radius:12px;"
    "padding:20px 22px;margin:14px 0;box-shadow:0 1px 2px rgba(0,0,0,0.04);"
)

_FOOTER_STYLE = (
    "text-align:center;color:#9E9E9E;font-size:12px;"
    "padding:20px 12px 32px 12px;"
)

_PILL_STYLES = {
    1: "background:#E53935;color:#fff;",
    2: "background:#FB8C00;color:#fff;",
    3: "background:#FDD835;color:#212121;",
}

_BUTTON_STYLES = {
    50: ("background:#E53935;color:#ffffff;", "50% OFF — Download Coupon"),
    20: ("background:#FB8C00;color:#ffffff;", "20% OFF — Download Coupon"),
    0: ("background:#FDD835;color:#212121;", "⚡ Expiring Soon — Get Coupon"),
}


def _format_price(value: Any) -> str | None:
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None
    return f"€{amount:,.2f}"


def _pill(days_left: int) -> str:
    style = _PILL_STYLES.get(days_left, "background:#EEEEEE;color:#212121;")
    label = "1 day left" if days_left == 1 else f"{days_left} days left"
    return (
        f'<span style="display:inline-block;padding:4px 10px;border-radius:999px;'
        f'font-size:12px;font-weight:700;letter-spacing:0.3px;{style}">{escape(label)}</span>'
    )


def _price_block(price_raw: Any, discount: int) -> str:
    original = _format_price(price_raw)
    if original is None:
        return '<div style="color:#9E9E9E;font-size:14px;">Price unavailable</div>'

    if not discount or discount <= 0:
        return (
            f'<div style="font-size:16px;font-weight:600;color:#212121;">{escape(original)}</div>'
        )

    try:
        discounted = float(price_raw) * (1 - discount / 100.0)
        new_label = f"€{discounted:,.2f}"
    except (TypeError, ValueError):
        new_label = original

    return (
        '<div style="display:inline-block;">'
        f'<span style="text-decoration:line-through;color:#9E9E9E;font-size:14px;margin-right:8px;">'
        f"{escape(original)}</span>"
        f'<span style="font-size:20px;font-weight:800;color:#E53935;">{escape(new_label)}</span>'
        "</div>"
    )


def _button(href: str, discount: int) -> str:
    style, label = _BUTTON_STYLES.get(discount, _BUTTON_STYLES[0])
    return (
        f'<a href="{escape(href, quote=True)}" '
        f'style="display:inline-block;padding:12px 22px;border-radius:8px;'
        f'text-decoration:none;font-weight:700;font-size:15px;{style}" '
        f'target="_blank" rel="noopener">{escape(label)}</a>'
    )


def _product_card(product: dict[str, Any], base_url: str, user_name: str) -> str:
    sku = str(product.get("sku") or "UNKNOWN")
    name = str(product.get("name") or "Unnamed product")
    category = str(product.get("category") or "")
    days_left = int(product.get("days_left", 0) or 0)
    discount = int(product.get("discount_percent", 0) or 0)

    href = (
        f"{base_url.rstrip('/')}/coupon/{quote(sku, safe='')}/{discount}"
        f"?user_name={quote(user_name, safe='')}"
    )

    category_line = (
        f'<div style="font-size:12px;color:#9E9E9E;margin-top:2px;'
        f'text-transform:uppercase;letter-spacing:0.6px;">{escape(category)}</div>'
        if category
        else ""
    )

    return f"""
    <div style="{_CARD_STYLE}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:18px;font-weight:700;color:#212121;">{escape(name)}</div>
            {category_line}
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">
            {_pill(days_left)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:14px;">
            {_price_block(product.get("price"), discount)}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:16px;">
            {_button(href, discount)}
          </td>
        </tr>
      </table>
    </div>
    """


def _empty_state() -> str:
    return (
        f'<div style="{_CARD_STYLE}text-align:center;">'
        '<div style="font-size:18px;font-weight:700;margin-bottom:6px;">No urgent deals today</div>'
        '<div style="font-size:14px;color:#616161;">Check back tomorrow — we\'ll have fresh picks just for you.</div>'
        "</div>"
    )


def render_email(user: dict[str, Any], ranked: list[dict[str, Any]], base_url: str) -> str:
    """Return the full HTML document for the user's promo email."""
    user_name = str(user.get("name") or "there").strip() or "there"
    safe_name = escape(user_name)

    cards = (
        "".join(_product_card(p, base_url=base_url, user_name=user_name) for p in ranked)
        if ranked
        else _empty_state()
    )

    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Smart Promo deals</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">
  <div style="{_CONTAINER_STYLE}">
    <div style="{_HEADER_STYLE}">
      Hi {safe_name}! 👋<br />
      <span style="font-size:16px;font-weight:400;opacity:0.95;">Your exclusive deals today:</span>
    </div>
    <div style="padding:8px 12px 4px 12px;background:#F5F5F5;">
      {cards}
    </div>
    <div style="{_FOOTER_STYLE}">
      Personalized just for you &nbsp;|&nbsp; Smart Promo
    </div>
  </div>
</body>
</html>"""
    return body


__all__ = ["render_email"]
