"""
pdf_gen.py
----------
Turn a (user, product, discount) tuple into a pretty A4 PDF coupon with a real
scannable Code128 barcode. Written to `/tmp/coupon_{sku}_{user_name}.pdf`
(filename sanitised) and the path returned.

Matches PRD §7.3 and BR-7/BR-8.
"""

from __future__ import annotations

import os
import re
import tempfile
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

try:
    import barcode
    from barcode.writer import ImageWriter
    _BARCODE_AVAILABLE = True
except Exception as exc:  # pragma: no cover - only trips when python-barcode missing
    print(f"[pdf_gen] python-barcode unavailable at import time: {exc!r}")
    _BARCODE_AVAILABLE = False


_FILENAME_SAFE = re.compile(r"[^A-Za-z0-9_.-]")


def _sanitize_for_filename(value: str) -> str:
    cleaned = _FILENAME_SAFE.sub("_", value.strip()) or "anon"
    return cleaned[:60]


def _coupon_path(sku: str, user_name: str) -> str:
    tmp_dir = tempfile.gettempdir()
    filename = f"coupon_{_sanitize_for_filename(sku)}_{_sanitize_for_filename(user_name)}.pdf"
    return os.path.join(tmp_dir, filename)


def _render_barcode_png(sku: str) -> BytesIO | None:
    """Render a Code128 barcode of `sku` into an in-memory PNG buffer."""
    if not _BARCODE_AVAILABLE:
        return None
    try:
        code128 = barcode.get("code128", sku, writer=ImageWriter())
        buffer = BytesIO()
        # Smaller quiet zone / font so the barcode dominates the image.
        code128.write(buffer, options={"write_text": True, "font_size": 8, "module_height": 12.0})
        buffer.seek(0)
        return buffer
    except Exception as exc:
        print(f"[pdf_gen] barcode generation failed for sku={sku!r}: {exc!r}")
        return None


def generate_coupon_pdf(
    user_name: str,
    sku: str,
    discount: int,
    product_name: str,
    expiry_date: str,
) -> str:
    """Create the PDF on disk and return its absolute path."""
    user_name = (user_name or "Customer").strip() or "Customer"
    sku = str(sku or "UNKNOWN").strip() or "UNKNOWN"
    product_name = (product_name or "Mystery Product").strip() or "Mystery Product"
    expiry_date = (expiry_date or "").strip() or "—"

    path = _coupon_path(sku, user_name)
    page_width, page_height = A4

    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle(f"Smart Promo coupon — {sku}")
    c.setAuthor("Smart Promo Generator")

    # Subtle coloured frame so it looks like a real coupon, not a school report.
    c.setStrokeColor(colors.HexColor("#E53935"))
    c.setLineWidth(4)
    c.rect(1.2 * cm, 1.2 * cm, page_width - 2.4 * cm, page_height - 2.4 * cm)

    # Title
    c.setFillColor(colors.HexColor("#212121"))
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(page_width / 2, page_height - 3.2 * cm, "EXCLUSIVE COUPON")

    # User
    c.setFont("Helvetica", 16)
    c.drawCentredString(page_width / 2, page_height - 4.4 * cm, f"For: {user_name}")

    # Product
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(page_width / 2, page_height - 6.0 * cm, product_name)

    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#616161"))
    c.drawCentredString(page_width / 2, page_height - 6.9 * cm, f"SKU: {sku}")

    # The headline discount / highlight
    c.setFillColor(colors.HexColor("#E53935"))
    c.setFont("Helvetica-Bold", 72)
    headline = f"{discount}% OFF" if discount and discount > 0 else "⚡ EXPIRING SOON"
    c.drawCentredString(page_width / 2, page_height - 10.5 * cm, headline)

    # Validity
    c.setFillColor(colors.HexColor("#212121"))
    c.setFont("Helvetica", 14)
    c.drawCentredString(page_width / 2, page_height - 12.0 * cm, f"Valid until: {expiry_date}")

    # Barcode (or fallback SKU text)
    barcode_buffer = _render_barcode_png(sku)
    barcode_y = 4.5 * cm
    barcode_height = 4.0 * cm
    barcode_width = 10.0 * cm
    barcode_x = (page_width - barcode_width) / 2

    if barcode_buffer is not None:
        try:
            from reportlab.lib.utils import ImageReader

            c.drawImage(
                ImageReader(barcode_buffer),
                barcode_x,
                barcode_y,
                width=barcode_width,
                height=barcode_height,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception as exc:
            print(f"[pdf_gen] failed to embed barcode image: {exc!r} — falling back to text")
            c.setFont("Courier-Bold", 28)
            c.drawCentredString(page_width / 2, barcode_y + barcode_height / 2, f"SKU: {sku}")
    else:
        c.setFont("Courier-Bold", 28)
        c.drawCentredString(page_width / 2, barcode_y + barcode_height / 2, f"SKU: {sku}")

    # Footer
    c.setFillColor(colors.HexColor("#757575"))
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(
        page_width / 2,
        2.0 * cm,
        "Scan at checkout | Smart Promo Generator",
    )

    c.showPage()
    c.save()
    print(f"[pdf_gen] wrote coupon -> {path}")
    return path


__all__ = ["generate_coupon_pdf"]


# Tiny compatibility helper in case anything imports the metadata function name.
def coupon_path_for(sku: str, user_name: str) -> str:  # pragma: no cover
    return _coupon_path(sku, user_name)
