// ALDI Smart Promo Email Generator
// Fetches live data from api.nagya.app and generates personalized HTML emails

const https = require('https');
const fs = require('fs');
const path = require('path');

const TODAY = new Date('2026-04-23');
const OUTPUT_DIR = path.join(__dirname, 'generated_emails');

// ─── Brand colors (from official ALDI color palette) ────────────────────────
const C = {
  navy:       '#001F78',   // primary dark navy
  cyan:       '#009BD5',   // ALDI light blue accent
  redOrange:  '#F63D14',   // strong orange-red (CTA, badges)
  orange:     '#FA851A',   // medium orange
  yellow:     '#FFB940',   // warm yellow
  white:      '#ffffff',
  lightBg:    '#F4F6FA',
  textDark:   '#1A1A1A',
  textMid:    '#555555',
  textLight:  '#999999',
  border:     '#E4E8F0',
};

// Logo: relatív útvonal (nem base64 — így nem veszít minőséget)
// A generated_emails/ mappából egy szinttel feljebb van
const LOGO_REL = '../Aldi-logo.jpg';
// base64 csak a PDF-generátornak kell (jsPDF nem tud relatív URL-t)
const LOGO_B64 = 'data:image/jpeg;base64,' +
  fs.readFileSync(path.join(__dirname, 'Aldi-logo.jpg')).toString('base64');

// ─── Valódi Unsplash fotó ID-k (images.unsplash.com, nincs redirect) ────────
// Format: https://images.unsplash.com/photo-{ID}?w=480&h=300&fit=crop&auto=format&q=80
const PHOTO_IDS = {
  // Bakery
  'White Bread':         '1509440159596-0249088772ff',
  'Graham Bread':        '1586444248902-2f64eddc13df',
  'Burger Buns':         '1550317138-10000687a72b',
  'Wholegrain Toast':    '1565031491910-e57fac031c41',
  'Butter Croissant':    '1555507036-ab1f4038808a',
  // Grilling food
  'Sea Bass':            '1519708227418-c8fd9a32b7a2',
  'Pork Neck Steak':     '1529692236671-f1f6cf9683ba',
  'Pork Grill Sausages': '1594041680534-e8c8caa7b7e1',
  'Smoked Sausage':      '1565557623262-b51c2513a641',
  'Vegetable Grill':     '1512621776951-a57141f2eefd',
  'Chicken Wings':       '1527477396000-e27163b481c2',
  'Chicken Breast':      '1604908176997-125f25cc6f3d',
  'Marinated Chicken':   '1598512752271-33f913a8c53c',
  'Corn on the Cob':     '1551754655-cd27e38d2076',
  'Bacon':               '1555939594-58d7cb561ad1',
  // Dairy
  'Plain Kefir':         '1571212515416-fca988083b41',
  'Plain Yoghurt':       '1488477181228-c57f5f4c2f70',
  'Full Milk':           '1550583724-b2692b85b150',
  'Sour Cream':          '1587314168485-3236d6710814',
  'Sliced Trappist':     '1486297678162-eb2a19b0a32d',
  'Mozzarella':          '1568640347023-a616a6e92f4a',
  'Cottage Cheese':      '1614777986387-7b218c333bb2',
  'Unsalted Butter':     '1589985270826-4b7bb135bc9d',
  // Vegetables
  'Cherry Tomatoes':     '1558818498-28c1e002b655',
  'Broccoli':            '1459411621453-7b03977f4bfc',
  'Cucumber':            '1449300079323-02847c2eb66e',
  'Red Bell Pepper':     '1526346698789-22fd84314424',
  'Courgette':           '1615484477778-ca3b77940c25',
  'Yellow Onion':        '1587334274328-64186a80aeee',
  'Carrots':             '1598170845058-32b9d6a5da37',
  'Garlic':              '1501200291289-c5a76c232e5f',
  // Drinks
  'Fresh Orange Juice':  '1600271886742-f049cd451bba',
  'Homestyle Lemonade':  '1523371054106-f5addebc7f35',
  'Ginger Lemonade':     '1547592180-85f173990819',
  'Lager Beer':          '1566633806327-68e152aaf26d',
  'Dry Red Wine':        '1510812431401-41d2bd2722f3',
  'Dry White Wine':      '1558618666-fcd25c85cd64',
  'Apricot':             '1560806887-1e4cd0b6cbd6',
};

// Kategória fallback fotók
const CATEGORY_PHOTOS = {
  'Grilling food':       '1529692236671-f1f6cf9683ba',
  'Grilling non-food':   '1555939594-58d7cb561ad1',
  'Dairy':               '1550583724-b2692b85b150',
  'Bakery':              '1509440159596-0249088772ff',
  'Vegetables':          '1512621776951-a57141f2eefd',
  'Soft drinks':         '1600271886742-f049cd451bba',
  'Bottled drinks':      '1523371054106-f5addebc7f35',
  'Alcoholic beverages': '1510812431401-41d2bd2722f3',
  'Sweets':              '1548907994-b08b8001bc09',
  'Pasta & grains':      '1551462147-ff29f4b43acb',
  'Other non-food':      '1556909114-f6e7ad7d3136',
};

function getProductImageUrl(product) {
  // Cím alapján pontos egyezés
  for (const [key, id] of Object.entries(PHOTO_IDS)) {
    if (product.title.includes(key)) {
      return `https://images.unsplash.com/photo-${id}?w=480&h=300&fit=crop&auto=format&q=80`;
    }
  }
  // Kategória fallback
  const id = CATEGORY_PHOTOS[product.category] || '1512621776951-a57141f2eefd';
  return `https://images.unsplash.com/photo-${id}?w=480&h=300&fit=crop&auto=format&q=80`;
}

// ─── API fetch helper ────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

// ─── Business logic ──────────────────────────────────────────────────────────

function daysUntilExpiry(expiration_date) {
  const exp = new Date(expiration_date);
  const diff = exp - TODAY;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDiscount(days) {
  if (days <= 1) return { pct: 50, label: '-50%', badgeColor: C.redOrange,  bgColor: '#FEF0EC', textColor: C.white };
  if (days <= 2) return { pct: 20, label: '-20%', badgeColor: C.orange,     bgColor: '#FEF5EC', textColor: C.white };
  if (days <= 3) return { pct: 0,  label: 'Figyelem!', badgeColor: C.yellow, bgColor: '#FEFAEC', textColor: C.navy };
  return null;
}

function discountedPrice(originalPrice, pct) {
  if (pct === 0) return null;
  return Math.round(originalPrice * (1 - pct / 100));
}

function formatPrice(n) {
  return n.toLocaleString('hu-HU') + ' Ft';
}

function getCategoryEmoji(category) {
  const map = {
    'Grilling food': '🥩',
    'Grilling non-food': '🔥',
    'Dairy': '🧀',
    'Bakery': '🍞',
    'Vegetables': '🥦',
    'Soft drinks': '🧃',
    'Bottled drinks': '🍶',
    'Alcoholic beverages': '🍷',
    'Sweets': '🍫',
    'Pasta & grains': '🍝',
    'Other non-food': '🛒',
  };
  return map[category] || '🛍️';
}

function getCategoryHU(category) {
  const map = {
    'Grilling food': 'Grillételek',
    'Grilling non-food': 'Grillkiegészítők',
    'Dairy': 'Tejtermékek',
    'Bakery': 'Pékáruk',
    'Vegetables': 'Zöldség & Gyümölcs',
    'Soft drinks': 'Üdítők',
    'Bottled drinks': 'Palackozott italok',
    'Alcoholic beverages': 'Alkoholos italok',
    'Sweets': 'Édességek',
    'Pasta & grains': 'Tészta & gabona',
    'Other non-food': 'Egyéb',
  };
  return map[category] || category;
}

// Rank products for a user:
// 1. Favorite category first
// 2. Within each group: sort by urgency (fewer days = higher priority)
function rankProducts(products, user) {
  const withMeta = products.map(p => {
    const days = daysUntilExpiry(p.expiration_date);
    const discount = getDiscount(days);
    if (!discount) return null; // only show items expiring within 3 days
    return { ...p, days, discount };
  }).filter(Boolean);

  withMeta.sort((a, b) => {
    const aFav = a.category === user.favorite_category ? 0 : 1;
    const bFav = b.category === user.favorite_category ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    return a.days - b.days; // fewer days = more urgent
  });

  return withMeta.slice(0, 10); // top 10
}

// ─── HTML generation ─────────────────────────────────────────────────────────

function productCardHTML(p) {
  const orig = p.price.value;
  const sale = p.discount.pct > 0 ? discountedPrice(orig, p.discount.pct) : null;
  const imgUrl = getProductImageUrl(p);
  // "Szuper akció!" or attention badge style — matches ALDI website
  const isSale  = sale !== null;
  const isWarn  = p.days <= 3 && !isSale;

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#fff; border-radius:6px; overflow:hidden;
              border:1px solid #DCDFE8;">
  <!-- Chip row: "Szuper akció!" badge -->
  <tr>
    <td style="padding:0; line-height:0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0;">
            <div style="display:inline-block; background:#E2001A; color:#fff;
                         font-size:9px; font-weight:800; padding:4px 9px;
                         border-radius:0 0 6px 0; font-family:Arial,sans-serif;
                         text-transform:uppercase; letter-spacing:0.3px; line-height:1.2;">
              ${isWarn ? 'Figyelj rá!' : 'Szuper akció!'}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Discount % row -->
  <tr>
    <td style="padding:2px 10px 0; text-align:left; height:28px;">
      ${isSale
        ? `<span style="font-size:22px; font-weight:900; color:#E2001A;
                        font-family:Arial,sans-serif; line-height:1;">-${p.discount.pct}%</span>`
        : `<span style="font-size:12px; font-weight:700; color:${C.orange};
                        font-family:Arial,sans-serif; line-height:1;">${p.days} nap múlva lejár</span>`}
    </td>
  </tr>
  <!-- Product image: white bg, contain (not cropped) -->
  <tr>
    <td style="padding:6px 10px; background:#fff; text-align:center;">
      <img src="${imgUrl}" alt="${p.title}"
           width="100%"
           style="display:block; width:100%; height:155px; object-fit:contain; background:#fff;"
           onerror="this.style.background='#F5F6FA';this.removeAttribute('src');" />
    </td>
  </tr>
  <!-- Price pills -->
  <tr>
    <td style="padding:6px 10px 8px; text-align:center;">
      ${isSale
        ? `<span style="display:inline-block; background:#EBEBEB; color:#666;
                        font-size:10px; padding:3px 10px; border-radius:20px;
                        font-family:Arial,sans-serif; margin-bottom:4px;
                        text-decoration:line-through;">${formatPrice(orig)}</span><br/>
           <span style="display:inline-block; background:#E2001A; color:#fff;
                        font-size:12px; font-weight:800; padding:4px 14px; border-radius:20px;
                        font-family:Arial,sans-serif;">${formatPrice(sale)}</span>`
        : `<span style="display:inline-block; background:#EBEBEB; color:#333;
                        font-size:12px; font-weight:700; padding:4px 14px; border-radius:20px;
                        font-family:Arial,sans-serif;">${formatPrice(orig)}</span>`}
    </td>
  </tr>
  <!-- Separator -->
  <tr>
    <td style="padding:0 10px;">
      <div style="border-top:1px solid #E8EAEF; font-size:0; line-height:0;">&nbsp;</div>
    </td>
  </tr>
  <!-- Expiry + Product name -->
  <tr>
    <td style="padding:8px 10px 4px;">
      <p style="margin:0 0 3px; font-size:9px; color:#AAAAAA; font-family:Arial,sans-serif;">
        Ajánlat vége: ${p.expiration_date}
      </p>
      <p style="margin:0; font-size:12px; font-weight:700; color:#1A1A1A;
                 line-height:1.35; font-family:Arial,sans-serif;">${p.title}</p>
    </td>
  </tr>
  <!-- Yellow "Kosárba" CTA button -->
  <tr>
    <td style="padding:8px 10px 12px;">
      <a href="https://www.aldi.hu/hu/ajanlatok.html" target="_blank"
         style="display:block; text-align:center; background:${C.yellow};
                color:#1A1A1A; font-size:13px; font-weight:800;
                padding:10px 6px; border-radius:4px; font-family:Arial,sans-serif;
                text-decoration:none;">
        Kosárba
      </a>
    </td>
  </tr>
</table>`;
}

function couponHTML(p) {
  const orig = p.price.value;
  const sale = p.discount.pct > 0 ? discountedPrice(orig, p.discount.pct) : null;
  if (!sale) return '';

  const canvasId = 'bc-' + p.sku.replace(/[^a-zA-Z0-9]/g, '_');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
    <tr>
      <td style="background:#fff; border-radius:10px; border:1px solid #E8EBF4;
                  box-shadow:0 1px 4px rgba(0,0,0,0.05);">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <!-- Accent bar -->
            <td width="4" style="background:${C.redOrange}; border-radius:10px 0 0 10px; padding:0;"></td>
            <!-- Info -->
            <td style="padding:12px 14px; vertical-align:middle;">
              <p style="margin:0 0 1px; font-size:13px; font-weight:700; color:#0D1224;
                         font-family:Arial,sans-serif;">${p.title}</p>
              <p style="margin:0 0 6px; font-size:10px; color:#AAAAAA;
                         font-family:Arial,sans-serif;">SKU: ${p.sku} &nbsp;·&nbsp; Lejár: ${p.expiration_date}</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <p style="margin:0; font-size:10px; color:#AAAAAA; font-family:Arial,sans-serif;">
                      <s>${formatPrice(orig)}</s></p>
                    <p style="margin:0; font-size:16px; font-weight:900; color:${C.redOrange};
                               font-family:Arial,sans-serif;">${formatPrice(sale)}</p>
                  </td>
                  <td style="padding-left:10px; border-left:1px solid #E8EBF4;">
                    <p style="margin:0; font-size:10px; color:#AAAAAA; font-family:Arial,sans-serif;">Kedvezmény</p>
                    <p style="margin:0; font-size:18px; font-weight:900; color:${C.redOrange};
                               font-family:Arial,sans-serif;">−${p.discount.pct}%</p>
                  </td>
                </tr>
              </table>
            </td>
            <!-- Barcode -->
            <td width="130" style="padding:12px; text-align:center; vertical-align:middle;
                                    border-left:1px dashed #E8EBF4; background:#FAFBFF;
                                    border-radius:0 10px 10px 0;">
              <canvas id="${canvasId}" style="max-width:110px; display:block; margin:0 auto;"></canvas>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function generateEmail(user, rankedProducts, allProducts) {
  const firstName = user.name.split(' ')[1] || user.name.split(' ')[0];
  const today = TODAY.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });

  // Kuponok: minden 20%+ kedvezményes termék (max 5)
  const couponProducts = rankedProducts.filter(p => p.discount.pct > 0).slice(0, 5);

  // JSON a PDF generátornak
  const couponDataJSON = JSON.stringify(couponProducts.map(p => ({
    title: p.title,
    sku: p.sku,
    pct: p.discount.pct,
    expiry: p.expiration_date,
    origPrice: p.price.value,
    salePrice: discountedPrice(p.price.value, p.discount.pct),
    canvasId: 'bc-' + p.sku.replace(/[^a-zA-Z0-9]/g, '_'),
  })));

  // Termék grid: soronként 2
  let productRowsHTML = '';
  for (let i = 0; i < rankedProducts.length; i += 2) {
    const left = rankedProducts[i];
    const right = rankedProducts[i + 1];
    productRowsHTML += `
    <tr>
      <td class="product-cell" width="50%" style="padding:6px;" valign="top">
        ${productCardHTML(left)}
      </td>
      <td class="product-cell" width="50%" style="padding:6px;" valign="top">
        ${right ? productCardHTML(right) : ''}
      </td>
    </tr>`;
  }

  const couponsHTML = couponProducts.map(couponHTML).join('');

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>ALDI – ${firstName} személyes ajánlatai</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body { margin:0; padding:24px 16px; background:#E8EBF3;
           font-family:'Inter',Arial,sans-serif; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; color:inherit; }
    .shell { max-width:760px; margin:0 auto; background:#fff;
             border-radius:16px; overflow:hidden;
             box-shadow:0 4px 32px rgba(0,0,0,0.10); }
    img { display:block; }
    @media (max-width:680px) {
      .pc { display:block !important; width:100% !important; padding:6px 0 !important; }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
<div style="display:none;font-size:1px;max-height:0;overflow:hidden;">
  Kedves ${firstName}! ${rankedProducts.length} személyre szabott ajánlat vár — lejárat előtt, csak neked.
</div>

<div class="shell">

  <!-- ▌ HEADER ▐ -->
  <div style="background:${C.navy};">
    <!-- Top colour stripe -->
    <div style="height:4px; background:linear-gradient(90deg,${C.yellow} 0%,${C.orange} 55%,${C.redOrange} 100%);"></div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
            <!-- Logo (relatív útvonal = nincs minőségvesztés) -->
        <td style="padding:22px 28px;" width="130">
          <img src="${LOGO_REL}" alt="ALDI" height="56"
               style="display:block; height:56px; width:auto;" />
        </td>
        <td style="padding:22px 28px 22px 0; text-align:right; vertical-align:middle;">
          <p style="margin:0 0 3px; font-size:10px; font-weight:700; letter-spacing:2px;
                     text-transform:uppercase; color:${C.cyan}; font-family:'Inter',Arial,sans-serif;">
            Személyre szabott ajánlat
          </p>
          <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.45);
                     font-family:'Inter',Arial,sans-serif;">${today}</p>
        </td>
      </tr>
    </table>

    <!-- Hero text block -->
    <div style="padding:0 28px 36px;">
      <p style="margin:0 0 10px; font-size:13px; color:${C.cyan}; font-weight:600;
                 font-family:'Inter',Arial,sans-serif;">Szia, ${firstName}! 👋</p>
      <h1 style="margin:0 0 14px; font-size:30px; font-weight:900; color:#fff; line-height:1.2;
                  font-family:'Inter',Arial,sans-serif;">
        A te személyes ajánlataid,<br>
        <span style="color:${C.yellow};">mielőtt elfogynak.</span>
      </h1>
      <p style="margin:0; font-size:14px; line-height:1.65; color:rgba(255,255,255,0.6);
                 font-family:'Inter',Arial,sans-serif; max-width:500px;">
        A <strong style="color:rgba(255,255,255,0.9);">${getCategoryHU(user.favorite_category)}</strong>
        kategóriás kedvenceid és vásárlási előzményeid alapján válogattuk össze
        a <strong style="color:rgba(255,255,255,0.9);">top ${rankedProducts.length} lejárat-közeli terméket.</strong>
      </p>
    </div>
  </div>

  <!-- ▌ PRODUCTS ▐ -->
  <div style="background:#F8F9FC; padding:24px 20px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${productRowsHTML}
    </table>
  </div>

  <!-- ▌ CTA ▐ -->
  <div style="background:#F8F9FC; padding:8px 28px 32px; text-align:center;">
    <a href="https://www.aldi.hu/hu/ajanlatok.html" target="_blank"
       style="display:inline-block; background:${C.navy}; color:#fff;
              font-size:15px; font-weight:700; padding:15px 48px;
              border-radius:8px; font-family:'Inter',Arial,sans-serif;
              letter-spacing:0.2px;">
      Összes ajánlat megtekintése &rarr;
    </a>
    <p style="margin:12px 0 0; font-size:12px; color:#AAAAAA; font-family:'Inter',Arial,sans-serif;">
      Az ajánlatok a lejárati dátumig érvényesek, vagy készlet erejéig.
    </p>
  </div>

  ${couponProducts.length > 0 ? `
  <!-- ▌ COUPONS ▐ -->
  <div style="border-top:1px solid #E4E8F0; padding:24px 24px 20px; background:#fff;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td>
          <p style="margin:0; font-size:17px; font-weight:800; color:${C.navy};
                     font-family:'Inter',Arial,sans-serif;">Vonalkódos kuponjaid</p>
          <p style="margin:4px 0 0; font-size:12px; color:#AAAAAA;
                     font-family:'Inter',Arial,sans-serif;">Mutasd be a pénztárnál</p>
        </td>
      </tr>
    </table>
    ${couponsHTML}
    <div style="margin-top:16px;">
      <a href="#" onclick="downloadCouponPDF(); return false;"
         style="display:inline-block; background:${C.navy}; color:#fff;
                font-size:13px; font-weight:700; padding:11px 24px;
                border-radius:8px; font-family:'Inter',Arial,sans-serif;">
        &#8595; Kuponok letöltése PDF-ben
      </a>
    </div>
  </div>` : ''}

  <!-- ▌ PERSONALIZATION NOTE ▐ -->
  <div style="border-top:1px solid #E4E8F0; padding:18px 28px; background:#fff;">
    <p style="margin:0; font-size:12px; color:#AAAAAA; line-height:1.6;
               font-family:'Inter',Arial,sans-serif;">
      🎯 &nbsp;Ez az email személyre szabott — kedvenc kategóriád
      (<strong style="color:${C.navy};">${getCategoryHU(user.favorite_category)}</strong>)
      és vásárlási előzményeid alapján állítottuk össze.
    </p>
  </div>

  <!-- ▌ FOOTER ▐ -->
  <div style="background:${C.navy};">
    <div style="height:3px; background:linear-gradient(90deg,${C.yellow},${C.orange},${C.redOrange});"></div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:20px 28px; vertical-align:middle;">
          <img src="${LOGO_REL}" alt="ALDI" height="40"
               style="display:block; height:40px; width:auto; margin-bottom:8px;" />
          <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.35); line-height:1.7;
                     font-family:'Inter',Arial,sans-serif;">
            ALDI Magyarország Kft.<br>
            1117 Budapest, Október huszonharmadika u. 8–10.
          </p>
        </td>
        <td style="padding:20px 28px; text-align:right; vertical-align:middle;">
          <p style="margin:0 0 8px; font-family:'Inter',Arial,sans-serif;">
            <a href="https://www.aldi.hu/hu/szolgaltatasok/leiratkozas.html" target="_blank"
               style="color:${C.cyan}; font-size:11px; margin-right:14px;">Leiratkozás</a>
            <a href="https://www.aldi.hu/hu/adatvedelem.html" target="_blank"
               style="color:${C.cyan}; font-size:11px; margin-right:14px;">Adatvédelem</a>
            <a href="https://www.aldi.hu" target="_blank"
               style="color:${C.cyan}; font-size:11px;">aldi.hu</a>
          </p>
          <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.25);
                     font-family:'Inter',Arial,sans-serif;">
            &copy; 2026 ALDI Magyarország. Minden jog fenntartva.
          </p>
        </td>
      </tr>
    </table>
  </div>

</div>
<div style="height:28px;"></div>

<script>
  // ─── Vonalkódok renderelése betöltéskor ───────────────────────────────────
  const COUPONS = ${couponDataJSON};
  const LOGO_SRC = "${LOGO_B64}";

  document.addEventListener('DOMContentLoaded', () => {
    COUPONS.forEach(c => {
      const canvas = document.getElementById(c.canvasId);
      if (!canvas) return;
      JsBarcode(canvas, c.sku + '-' + c.pct, {
        format: 'CODE128',
        width: 2,
        height: 55,
        displayValue: true,
        fontSize: 11,
        fontOptions: 'bold',
        margin: 4,
        background: '#F8FAFC',
        lineColor: '#1A1A1A',
      });
    });
  });

  // ─── PDF letöltés ─────────────────────────────────────────────────────────
  function downloadCouponPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const pageW = 210;
    const margin = 16;
    const colW = pageW - margin * 2;

    // Fejléc háttér (navy)
    doc.setFillColor(0, 31, 120);
    doc.rect(0, 0, 210, 30, 'F');

    // Gradiens csík (közelítés 3 sávval)
    [[255,185,64],[250,133,26],[246,61,20]].forEach((rgb, i, arr) => {
      doc.setFillColor(...rgb);
      doc.rect(i * (pageW / arr.length), 30, pageW / arr.length + 1, 2.5, 'F');
    });

    // Logó
    doc.addImage(LOGO_SRC, 'JPEG', margin, 5, 18, 18);

    // Fejléc szövegek
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ALDI Kuponok', margin + 22, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 155, 213);
    doc.text('Személyre szabott kedvezmények – bemutatandó a pénztárnál', margin + 22, 20);
    doc.setTextColor(200, 220, 255);
    doc.setFontSize(8);
    doc.text('${today}', pageW - margin, 14, { align: 'right' });

    // Kuponkártyák
    let y = 42;
    const cardH = 48;
    const gap = 8;

    COUPONS.forEach((c, idx) => {
      // Fehér kártyaháttér
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, colW, cardH, 4, 4, 'F');
      doc.setDrawColor(228, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, colW, cardH, 4, 4, 'S');

      // Bal szél akcentvonal (piros-narancs)
      doc.setFillColor(246, 61, 20);
      doc.roundedRect(margin, y, 2, cardH, 0, 0, 'F');

      const tx = margin + 7;

      // Termék neve
      doc.setTextColor(26, 26, 26);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(c.title.length > 35 ? c.title.substring(0, 33) + '…' : c.title, tx, y + 10);

      // SKU
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('SKU: ' + c.sku, tx, y + 17);

      // Kedvezmény %
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(246, 61, 20);
      doc.text('-' + c.pct + '%', tx, y + 34);

      // Árak
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('Eredeti: ' + c.origPrice.toLocaleString('hu-HU') + ' Ft', tx, y + 40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 31, 120);
      doc.text(c.salePrice.toLocaleString('hu-HU') + ' Ft', tx, y + 47);

      // Lejárat
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('Érvényes: ' + c.expiry + '-ig', tx, y + cardH - 2);

      // Szaggatott elválasztó a vonalkód előtt
      doc.setDrawColor(220, 225, 235);
      doc.setLineDash([2, 2]);
      doc.line(margin + colW - 82, y + 4, margin + colW - 82, y + cardH - 4);
      doc.setLineDash([]);

      // Vonalkód canvasről képként
      const canvas = document.getElementById(c.canvasId);
      if (canvas) {
        const bcData = canvas.toDataURL('image/png');
        const bcW = 68;
        const bcH = 24;
        const bcX = margin + colW - bcW - 5;
        const bcY = y + (cardH - bcH) / 2 - 3;
        doc.addImage(bcData, 'PNG', bcX, bcY, bcW, bcH);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(c.sku + '-' + c.pct, bcX + bcW / 2, bcY + bcH + 5, { align: 'center' });
      }

      y += cardH + gap;

      if (y + cardH > 278 && idx < COUPONS.length - 1) {
        doc.addPage();
        y = 20;
      }
    });

    // Footer
    doc.setFillColor(0, 31, 120);
    doc.rect(0, 284, 210, 13, 'F');
    doc.setTextColor(0, 155, 213);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ALDI Magyarország Kft. · 1117 Budapest, Október huszonharmadika u. 8–10. · aldi.hu', 105, 289, { align: 'center' });
    doc.setTextColor(150, 180, 220);
    doc.text('A kuponok a feltüntetett lejárati dátumig érvényesek, vagy készlet erejéig.', 105, 294, { align: 'center' });

    doc.save('ALDI_kuponok_${user.name.replace(/\s+/g, '_')}.pdf');
  }
</script>
</body>
</html>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📡 API adatok lekérése...');

  const [usersResp, productsResp] = await Promise.all([
    fetchJSON('https://api.nagya.app/users'),
    fetchJSON('https://api.nagya.app/products'),
  ]);

  const users = usersResp.data;
  const products = productsResp.data;

  console.log(`✅ ${users.length} felhasználó, ${products.length} termék betöltve`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  const summary = [];

  for (const user of users) {
    const ranked = rankProducts(products, user);
    const html = generateEmail(user, ranked, products);

    const slug = user.name.toLowerCase().replace(/\s+/g, '_').replace(/[áéíóöőúüű]/g, c =>
      ({ á:'a',é:'e',í:'i',ó:'o',ö:'o',ő:'o',ú:'u',ü:'u',ű:'u' })[c] || c);
    const filename = `email_${user.id}_${slug}.html`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, html, 'utf8');
    console.log(`  📧 ${filename} – ${ranked.length} termék (fav: ${user.favorite_category})`);

    summary.push({ user, ranked, filename });
  }

  // ─── Index oldal generálása ───────────────────────────────────────────────
  const indexHTML = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ALDI Smart Promo – Email Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           background: #0A1628; color: #fff; min-height: 100vh; }

    .header {
      background: ${C.navy};
      padding: 14px 28px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 3px solid transparent;
      border-image: linear-gradient(90deg, ${C.yellow}, ${C.orange}, ${C.redOrange}) 1;
    }
    .logo img { width: 52px; height: 52px; border-radius: 7px; display: block; }
    .header h1 { font-size: 17px; font-weight: 700; color: #fff; margin: 0; }
    .header span { font-size: 12px; color: ${C.cyan}; display: block; margin-top: 3px; }

    .layout { display: flex; height: calc(100vh - 81px); }

    .sidebar {
      width: 270px;
      background: #050F24;
      border-right: 1px solid #0E2040;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .sidebar-title {
      padding: 16px 20px 10px;
      font-size: 10px;
      color: ${C.cyan};
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
    }

    .user-btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      text-align: left;
      background: none;
      border: none;
      border-bottom: 1px solid #0E2040;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .user-btn:hover { background: #0B1E3E; }
    .user-btn.active { background: ${C.navy}; border-left: 3px solid ${C.yellow}; }
    .user-btn .name { font-size: 14px; font-weight: 700; color: #fff; display: block; }
    .user-btn .meta { font-size: 11px; color: ${C.cyan}; display: block; margin-top: 3px; }
    .user-btn .badge {
      display: inline-block;
      background: linear-gradient(135deg, ${C.orange}, ${C.redOrange});
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      margin-top: 6px;
    }

    .preview-area {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .preview-bar {
      background: #050F24;
      padding: 10px 20px;
      font-size: 12px;
      color: ${C.cyan};
      border-bottom: 1px solid #0E2040;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .preview-bar .dot { width: 10px; height: 10px; border-radius: 50%; }

    iframe {
      flex: 1;
      border: none;
      background: ${C.lightBg};
    }

    .stats {
      padding: 18px 20px;
      border-top: 1px solid #0E2040;
    }
    .stat-row { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
    .stat-box {
      background: #0B1E3E;
      border-radius: 8px;
      padding: 10px 14px;
      flex: 1;
      min-width: 80px;
      border: 1px solid #0E2040;
    }
    .stat-box .val { font-size: 22px; font-weight: 900; color: ${C.redOrange}; }
    .stat-box .lbl { font-size: 10px; color: ${C.cyan}; text-transform: uppercase;
                     letter-spacing: 0.8px; margin-top: 2px; }
  </style>
</head>
<body>

<div class="header">
  <div class="logo">
    <img src="../Aldi-logo.jpg" alt="ALDI" />
  </div>
  <div>
    <h1>Smart Promo Email Generator</h1>
    <span>AI-alapú személyre szabott promóciós emailek &middot; Élő API adatok</span>
  </div>
</div>

<div class="layout">

  <div class="sidebar">
    <div class="sidebar-title">Felhasználók (${users.length})</div>
    ${summary.map((s, i) => `
    <a href="#" class="user-btn${i === 0 ? ' active' : ''}"
       onclick="loadEmail('${s.filename}', this); return false;">
      <span class="name">${s.user.name}</span>
      <span class="meta">❤️ ${getCategoryHU(s.user.favorite_category)}</span>
      <span class="badge">${s.ranked.length} ajánlat</span>
    </a>`).join('')}

    <div class="stats">
      <div style="font-size:11px; color:#7B9CC8; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
        Mai készlet
      </div>
      <div class="stat-row">
        <div class="stat-box">
          <div class="val">${products.filter(p => {
            const days = (new Date(p.expiration_date) - TODAY) / 86400000;
            return days <= 1;
          }).length}</div>
          <div class="lbl">1 napon belül</div>
        </div>
        <div class="stat-box">
          <div class="val">${products.filter(p => {
            const days = (new Date(p.expiration_date) - TODAY) / 86400000;
            return days <= 3;
          }).length}</div>
          <div class="lbl">3 napon belül</div>
        </div>
      </div>
    </div>
  </div>

  <div class="preview-area">
    <div class="preview-bar">
      <div class="dot" style="background:#E2001A;"></div>
      <div class="dot" style="background:#E2001A; opacity:0.5;"></div>
      <div class="dot" style="background:#E2001A; opacity:0.3;"></div>
      <span id="preview-label">${summary[0]?.user.name} – személyre szabott email</span>
    </div>
    <iframe id="email-frame" src="${summary[0]?.filename}"></iframe>
  </div>

</div>

<script>
  function loadEmail(filename, btn) {
    document.getElementById('email-frame').src = filename;
    document.querySelectorAll('.user-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('preview-label').textContent =
      btn.querySelector('.name').textContent + ' – személyre szabott email';
  }
</script>

</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHTML, 'utf8');
  console.log('\n✅ Kész! Megnyitom a preview-t...');
  console.log(`📁 ${OUTPUT_DIR}/index.html`);
}

main().catch(console.error);
