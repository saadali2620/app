#!/usr/bin/env node
/**
 * Build-time pre-render for search engines and AI crawlers.
 *
 * Why this exists: the site is a client-side React app, so every URL used to
 * return the same empty HTML shell (homepage title, homepage canonical, no H1,
 * no schema). Googlebot renders JavaScript, but most AI crawlers (GPTBot,
 * ClaudeBot, PerplexityBot) do not. This script runs after `vite build` and
 * writes a real HTML file per route into dist/ with the correct <title>,
 * meta description, canonical URL, Open Graph tags, JSON-LD and readable
 * content. React replaces the static content as soon as it mounts, so the
 * visible app behaves exactly as before.
 *
 * URL form: canonicals, sitemap entries and schema URLs use the no-slash form
 * (/products/<slug>), matching what the app shows. The .htaccess rewrite serves
 * each pre-rendered index.html at both /dir and /dir/.
 *
 * Safety: if the WooCommerce Store API cannot be reached, the script logs a
 * warning and leaves dist/ untouched, so a deploy is never broken by it.
 *
 * Env (all optional):
 *   PRERENDER_SITE_URL   default https://nors.com.pk
 *   PRERENDER_WC_BASE    default <site>/index.php?rest_route=/wc/store/v1
 *   PRERENDER_FIXTURE    path to a JSON file { products, categories } for offline tests
 *   PRERENDER_DIST       default ./dist
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { AAO } from './aao-config.mjs';
import { productSchema, organizationSchema } from './aao-schema.mjs';

const SITE = (process.env.PRERENDER_SITE_URL || 'https://nors.com.pk').replace(/\/$/, '');
const API = process.env.PRERENDER_WC_BASE || `${SITE}/index.php?rest_route=/wc/store/v1`;
const FIXTURE = process.env.PRERENDER_FIXTURE || '';
const DIST = path.resolve(process.env.PRERENDER_DIST || 'dist');

const BRAND = 'nors.';
const LOGO = `${SITE}/wp-content/uploads/2026/08/cropped-Nors-updated-logo-03.999grey-photoshop-gradient-copy.png`;
const HOME_TITLE = 'nors. | Official Site';

// Collections worth indexing. Only add a slug here once the app links to it
// and it has real content (a short intro and several products); a thin
// collection page can hurt rankings.
const COLLECTION_SLUGS = ['batch-01'];

// Pages that must never appear in search results.
const NOINDEX_ROUTES = [
  { route: '/track-order', title: `Track your order | ${BRAND}`, chunk: 'TrackOrderPage' },
  { route: '/checkout', title: `Checkout | ${BRAND}`, chunk: 'CheckoutPage' },
  { route: '/login', title: `Log in | ${BRAND}`, chunk: 'LoginPage' },
  { route: '/register', title: `Create account | ${BRAND}`, chunk: 'RegisterPage' },
  { route: '/account', title: `Your account | ${BRAND}`, chunk: 'AccountPage' },
];

// ---------- text helpers ----------

function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html) {
  return decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clip(text, max) {
  const t = String(text ?? '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

function rs(n) {
  return `Rs. ${Number(n).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}.00`;
}

function money(value, minor) {
  return Number(value) / Math.pow(10, Number(minor ?? 0));
}

function titleCase(s) {
  return String(s)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Same shortcode parsing the app uses for the product accordion.
function parseAccordion(rawDescription) {
  if (!rawDescription || !rawDescription.includes('[vc_accordion')) return [];
  const norm = rawDescription.replace(/&#8220;|&#8221;|&#8243;/g, '"');
  const sections = [];
  const tabRe = /\[vc_accordion_tab[^\]]*title="([^"]+)"[^\]]*\]([\s\S]*?)\[\/vc_accordion_tab\]/g;
  let m;
  while ((m = tabRe.exec(norm))) {
    const title = decodeEntities(m[1]).trim();
    const inner = m[2].replace(/\[vc_column_text[^\]]*\]/g, '').replace(/\[\/vc_column_text\]/g, '');
    // Keep real tables (the size guide) as rows and cells instead of flattening them.
    const tableHtml = (inner.match(/<table[\s\S]*?<\/table>/i) || [])[0];
    const table = tableHtml
      ? [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
          .map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => stripHtml(c[1])))
          .filter((row) => row.length > 0)
      : [];
    const content = stripHtml(tableHtml ? inner.replace(tableHtml, ' ') : inner);
    if (title && (content || table.length > 1)) sections.push({ title, content, table: table.length > 1 ? table : null });
  }
  return sections;
}

// ---------- data ----------

async function getJson(url, maxAttempts = 5, withTotal = false) {
  // Some hosts rate-limit or drop requests from CI servers now and then, so
  // retry with a growing pause, and look like an ordinary browser request.
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; nors-prerender/1.0; +https://nors.com.pk)',
  };
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return withTotal ? { json, total: Number(res.headers.get('x-wp-total') ?? (Array.isArray(json) ? json.length : 0)) } : json;
    } catch (err) {
      lastErr = err.cause?.message ? new Error(`${err.message}: ${err.cause.message}`) : err;
      console.warn(`[prerender] attempt ${attempt} failed: ${lastErr.message}`);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

async function loadData() {
  if (FIXTURE) return JSON.parse(await readFile(FIXTURE, 'utf8'));
  const products = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await getJson(`${API}/products&per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('Unexpected products response');
    products.push(...batch);
    if (batch.length < 100) break;
  }
  const categories = await getJson(`${API}/products/categories&per_page=100`);
  if (!Array.isArray(categories)) throw new Error('Unexpected categories response');
  return { products, categories };
}

// Reads the FAQ list straight from the component so the FAQ schema can never
// drift from what the page shows.
async function loadFaqs() {
  try {
    const src = await readFile(path.resolve('src/components/FAQAccordion.tsx'), 'utf8');
    const re = /question:\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*answer:\s*(['"])((?:\\.|(?!\3)[^\\])*)\3/g;
    const unescape = (s) => s.replace(/\\(['"\\])/g, '$1');
    const faqs = [];
    let m;
    while ((m = re.exec(src))) faqs.push({ question: unescape(m[2]), answer: unescape(m[4]) });
    return faqs;
  } catch {
    return [];
  }
}

// Policy pages (shipping, exchange/refund, payment, privacy) live in WordPress
// and are fetched by the browser at runtime, so crawlers never see them. Pull
// them in at build time and write the text into /policies. Best effort: any
// failure just means the page keeps its head tags only.
const POLICY_SLUGS = [
  ['shipping-policy', 'Shipping Policy'],
  ['exchange-refund-policy', 'Exchange & Refund Policy'],
  ['payment-policy', 'Payment Policy'],
  ['privacy-policy-2', 'Privacy Policy'],
];

function safeHtml(html) {
  return decodeEntities(String(html ?? ''))
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/<(\/?)(h[1-6])\b[^>]*>/gi, (_, c) => (c ? '</h3>' : '<h3>'))
    .replace(/<(\/?)(p|ul|ol|li|strong|em|br)\b[^>]*>/gi, '<$1$2>')
    .replace(/<(?!\/?(?:h3|p|ul|ol|li|strong|em|br)>)[^>]+>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/&/g, '&amp;')
    .trim();
}

async function loadPolicies() {
  if (FIXTURE) {
    // Offline tests: policy texts can come from the fixture file.
    const fx = JSON.parse(await readFile(FIXTURE, 'utf8')).policies ?? {};
    Object.assign(RAW_POLICIES, fx);
    return POLICY_SLUGS.filter(([slug]) => fx[slug]).map(([slug, label]) => ({ slug, label, html: safeHtml(fx[slug]) }));
  }
  const out = [];
  let failures = 0;
  for (const [slug, label] of POLICY_SLUGS) {
    if (failures >= 2) break;
    try {
      const data = await getJson(`${SITE}/index.php?rest_route=/wp/v2/pages&slug=${slug}`, 2);
      if (data?.[0]?.content?.rendered) RAW_POLICIES[slug] = data[0].content.rendered;
      const html = safeHtml(data?.[0]?.content?.rendered);
      if (stripHtml(html).length > 80) out.push({ slug, label, html });
    } catch {
      failures++; // skip this policy
    }
  }
  return out;
}

// Per-size stock, price and SKU. The Store API's product list carries variation ids
// and sizes but no stock flag, so ask for the variations as products, up to 100
// per request (same call the product page makes in the browser).
async function loadVariants(rawProducts, data) {
  const map = {};
  if (FIXTURE) {
    for (const v of data.variations ?? []) map[String(v.id)] = v;
    return map;
  }
  const ids = rawProducts.flatMap((p) => (p.variations ?? []).map((v) => v.id));
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const rows = await getJson(`${API}/products&type=variation&per_page=100&include=${ids.slice(i, i + 100).join(',')}`, 3);
      for (const r of Array.isArray(rows) ? rows : []) map[String(r.id)] = r;
    } catch (err) {
      console.warn(`[prerender] Size stock unavailable (${err.message}); schema falls back to product-level stock.`);
    }
  }
  return map;
}

function normalizeProduct(p, variantMap = {}) {
  const minor = p.prices?.currency_minor_unit ?? p.minor ?? 0;
  const price = money(p.prices?.price ?? p.price, minor);
  const regular = money(p.prices?.regular_price ?? p.regular ?? p.prices?.price ?? p.price, minor);
  const sizes = (p.variations ?? [])
    .map((v) => (v.attributes ?? []).find((a) => /^size$/i.test(a.name))?.value)
    .filter(Boolean)
    .map(titleCase);
  const variants = (p.variations ?? [])
    .map((v) => {
      const size = (v.attributes ?? []).find((a) => /^size$/i.test(a.name))?.value;
      const x = variantMap[String(v.id)];
      if (!size) return null;
      const vMinor = x?.prices?.currency_minor_unit ?? minor;
      const vPrice = x?.prices ? money(x.prices.price, vMinor) : undefined;
      const vRegular = x?.prices ? money(x.prices.regular_price, vMinor) : undefined;
      return {
        id: v.id,
        size,
        sku: x?.sku || '',
        inStock: x ? x.is_in_stock === true : undefined, // undefined = unknown, use product-level stock
        backorder: x?.is_on_backorder === true,
        price: vPrice,
        regular: vPrice !== undefined && vRegular > vPrice ? vRegular : undefined,
      };
    })
    .filter(Boolean);
  const color = (p.attributes ?? []).find((a) => /^colou?r$/i.test(a.name))?.terms?.[0]?.name;
  return {
    variants,
    color,
    id: p.id,
    name: stripHtml(p.name),
    slug: p.slug,
    sku: p.sku || '',
    currency: p.prices?.currency_code ?? p.cur ?? 'PKR',
    price,
    regular: regular > price ? regular : null,
    inStock: p.is_in_stock !== false,
    short: stripHtml(p.short_description),
    long: stripHtml((p.description ?? '').replace(/\[[^\]]*\]/g, ' ')),
    accordion: parseAccordion(p.description),
    images: (p.images ?? []).map((i) => i.src).filter(Boolean),
    sizes: [...new Set(sizes)],
    categories: (p.categories ?? []).map((c) => c.slug),
  };
}

// ---------- html ----------

function wrap(inner) {
  // Visually hidden but still in the HTML, so crawlers that do not run
  // JavaScript can read it. Without this, visitors saw this unstyled text for a
  // moment before React mounted and replaced it. React replaces it on mount.
  return (
    '<div data-prerender="true" style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;' +
    'overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0;' +
    'font-family:Inter,Arial,sans-serif;line-height:1.6">' +
    `<div>${inner}</div></div>`
  );
}

function ld(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function swap(html, re, replacement) {
  return re.test(html) ? html.replace(re, () => replacement) : html.replace('</head>', () => `${replacement}\n</head>`);
}

function makeRenderer(template) {
  return function render(o) {
    let html = template;
    html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>`);
    html = swap(html, /<meta\s+name="description"[^>]*>/, `<meta name="description" content="${esc(o.description)}" />`);
    html = swap(html, /<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(o.canonical)}" />`);
    html = swap(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(o.ogTitle ?? o.title)}" />`);
    html = swap(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(o.ogDescription ?? o.description)}" />`);
    html = swap(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(o.canonical)}" />`);
    html = swap(html, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(o.ogType ?? 'website')}" />`);
    html = swap(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(o.image ?? LOGO)}" />`);
    const extra = [];
    if (o.noindex) extra.push('<meta name="robots" content="noindex, nofollow" />');
    extra.push(`<meta name="twitter:title" content="${esc(o.ogTitle ?? o.title)}" />`);
    extra.push(`<meta name="twitter:description" content="${esc(o.ogDescription ?? o.description)}" />`);
    extra.push(`<meta name="twitter:image" content="${esc(o.image ?? LOGO)}" />`);
    for (const s of o.schema ?? []) extra.push(ld(s));
    html = html.replace('</head>', () => `${extra.join('\n')}\n</head>`);
    if (o.earlyData) html = html.replace('<!--nors-early-data-->', () => `<script>${o.earlyData}</script>`);
    if (o.chunk && CHUNKS[o.chunk]) {
      // Start downloading this page's code now, alongside the main bundle,
      // instead of after it.
      html = html.replace('</head>', () => `<link rel="modulepreload" crossorigin href="${CHUNKS[o.chunk]}" />\n</head>`);
    }
    html = html.replace(/__SEED_V__/g, SEED_VERSION);
    if (o.body) html = html.replace('<div id="root"></div>', () => `<div id="root">${o.body}</div>`);
    return html;
  };
}

// Built page files by name, e.g. { PolicyPage: '/assets/PolicyPage-abc123.js' }.
const SEED_VERSION = Date.now().toString(36);
const RAW_POLICIES = {};
// Newest store reviews, baked into product pages so the reviews placeholder has the right height.
let RECENT_REVIEWS = [];
const CHUNKS = {};
async function findChunks() {
  try {
    for (const f of await readdir(path.join(DIST, 'assets'))) {
      const m = f.match(/^([A-Za-z]+Page)-[A-Za-z0-9_-]+\.js$/);
      if (m) CHUNKS[m[1]] = `/assets/${f}`;
    }
  } catch {
    /* no assets folder: nothing to preload */
  }
}

async function writeRoute(route, html) {
  const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route, 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

function breadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

// ---------- pages ----------

function productPage(render, p) {
  const url = `${SITE}/products/${p.slug}`;
  const priceLine = `${rs(p.price)}${p.regular ? ` (was ${rs(p.regular)})` : ''}`;
  const lead = p.short || p.long || p.name;
  const description = `${clip(lead, 108)} ${rs(p.price)}. Cash on delivery across Pakistan.`;

  // One ProductGroup with an offer per size, so a sold-out size reads as sold out.
  const product = productSchema(SITE, BRAND, p);
  const sizeLine = p.variants.length
    ? p.variants.map((v) => `${v.size} (${(v.inStock ?? p.inStock) ? 'in stock' : 'sold out'})`).join(', ')
    : p.sizes.join(', ');

  const sections = p.accordion
    .filter((s) => !/^reviews?$/i.test(s.title))
    .map((s) => {
      const tbl = s.table
        ? '<table style="border-collapse:collapse;margin:8px 0">' +
          s.table
            .map((row, r) => {
              const tag = r === 0 ? 'th' : 'td';
              return '<tr>' + row.map((c) => `<${tag} style="padding:6px 14px 6px 0;text-align:left">${esc(c)}</${tag}>`).join('') + '</tr>';
            })
            .join('') +
          '</table>'
        : '';
      return `<h2>${esc(s.title)}</h2>${tbl}${s.content ? `<p>${esc(s.content)}</p>` : ''}`;
    })
    .join('');

  const body = wrap(
    `<nav aria-label="Breadcrumb"><a href="/" style="color:inherit">Home</a> / ${esc(p.name)}</nav>` +
      `<h1>${esc(p.name)}</h1>` +
      `<p>${esc(priceLine)}</p>` +
      (p.short ? `<p>${esc(p.short)}</p>` : '') +
      (sizeLine ? `<h2>Sizes</h2><p>${esc(sizeLine)}</p>` : '') +
      sections +
      '<p>Ships within Pakistan. Pay by cash on delivery or secure online payment.</p>',
  );

  return render({
    // Lets the loading placeholder match this product: name, photo count, accordion sections, sizes.
    earlyData: `window.__norsPdp=${JSON.stringify({
      slug: p.slug,
      name: p.name,
      photos: p.images.length,
      sections: p.accordion.filter((x) => !/^reviews?$/i.test(String(x.title).trim())).length,
      sizes: p.sizes,
    }).replace(/</g, '\\u003c')};window.__norsReviews=${JSON.stringify(RECENT_REVIEWS).replace(/</g, '\\u003c')};`,
    title: `${p.name} | ${BRAND}`,
    description,
    canonical: url,
    ogType: 'product',
    image: p.images[0],
    schema: [
      product,
      breadcrumb([
        { name: 'Home', url: `${SITE}/` },
        { name: p.name, url },
      ]),
    ],
    body,
  });
}

function collectionPage(render, cat, items) {
  const url = `${SITE}/collections/${cat.slug}`;
  const name = stripHtml(cat.name);
  const intro = stripHtml(cat.description);
  const description = clip(
    intro || `Shop ${name} from ${BRAND}: independent streetwear designed in Karachi. Cash on delivery across Pakistan.`,
    155,
  );
  const list = items
    .map((p) => `<li><a href="/products/${esc(p.slug)}" style="color:inherit">${esc(p.name)}</a> – ${esc(rs(p.price))}</li>`)
    .join('');
  const body = wrap(
    `<nav aria-label="Breadcrumb"><a href="/" style="color:inherit">Home</a> / ${esc(name)}</nav>` +
      `<h1>${esc(name)}</h1>` +
      (intro ? `<p>${esc(intro)}</p>` : '') +
      `<ul>${list}</ul>`,
  );
  return render({
    title: `${name} | ${BRAND}`,
    description,
    canonical: url,
    image: items[0]?.images[0],
    // Lets the page request this collection's products immediately (see index.html).
    earlyData: /^\d+$/.test(String(cat.id)) ? `window.__norsCatId=${JSON.stringify(String(cat.id))};` : undefined,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        url,
        description,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: items.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE}/products/${p.slug}`,
            name: p.name,
          })),
        },
      },
      breadcrumb([
        { name: 'Home', url: `${SITE}/` },
        { name, url },
      ]),
    ],
    body,
  });
}

function homePage(render, homeDescription, products, faqs) {
  const schema = [
    organizationSchema({ site: SITE, brand: BRAND, logo: LOGO, description: stripHtml(homeDescription) }),
    { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: `${SITE}/` },
  ];
  if (faqs.length) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  const list = products
    .map((p) => `<li><a href="/products/${esc(p.slug)}" style="color:inherit">${esc(p.name)}</a> – ${esc(rs(p.price))}</li>`)
    .join('');
  const faqHtml = faqs.length
    ? '<h2>FAQs</h2>' + faqs.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')
    : '';
  const body = wrap(
    `<h1>nors. – independent streetwear from Karachi</h1><p>${esc(stripHtml(homeDescription))}</p>` +
      `<h2>Shop</h2><ul>${list}</ul>${faqHtml}`,
  );
  return render({
    title: HOME_TITLE,
    description: stripHtml(homeDescription),
    canonical: `${SITE}/`,
    ogTitle: 'nors. — Karachi, est. 2021 / WORN IN, NOT WORN OUT',
    schema,
    body,
  });
}

function sitemapXml(urls) {
  const rows = urls
    .map((u) => {
      const imgs = (u.images ?? [])
        .slice(0, 5)
        .map((src) => `<image:image><image:loc>${esc(src)}</image:loc></image:image>`)
        .join('');
      return `<url><loc>${esc(u.loc)}</loc>${imgs}</url>`;
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    `${rows}\n</urlset>\n`
  );
}

// Stock and price facts for one product, shared by llms.txt and llms-full.txt.
function productFacts(p) {
  const sale = p.regular
    ? ` (reduced from ${rs(p.regular)}${AAO.saleItemsReturnable ? '' : '; not eligible for exchange or refund'})`
    : '';
  let sizes = '';
  if (p.variants.length) {
    const open = p.variants.filter((v) => v.inStock ?? p.inStock).map((v) => v.size);
    sizes = open.length ? ` Sizes in stock: ${open.join(', ')}.` : ' Sold out.';
  } else if (!p.inStock) {
    sizes = ' Sold out.';
  }
  return `${rs(p.price)}${sale}.${sizes}`;
}

function factsBlock() {
  return [
    'Key facts for agents:',
    '- Currency: PKR. Ships within Pakistan only, by courier, in ' +
      `${AAO.transitDays.min}-${AAO.transitDays.max} business days (limited-run drops can take up to 2-3 weeks).`,
    `- Cash on delivery, or online payment. Orders above PKR ${AAO.codAdvanceThresholdPkr.toLocaleString('en-PK')} need an advance payment before dispatch.`,
    `- Exchange and refund claims must be made within ${AAO.returnWindowDays * 24} hours of delivery, on unused items with tags.` +
      (AAO.saleItemsReturnable ? '' : ' Discounted, sale and archive pieces are not eligible.'),
    '- Stock is micro-batch and sizes sell out. Check the size-level availability below before recommending a size.',
    `- Support is by email and Instagram DM, answered by a person: ${AAO.email}`,
  ];
}

function llmsTxt(homeDescription, products) {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    `# ${BRAND}`,
    '',
    `> ${stripHtml(homeDescription)}`,
    '',
    ...factsBlock(),
    '',
    `## Products (generated ${stamp}; live prices and stock are on each product page)`,
    ...products.map((p) => `- [${p.name}](${SITE}/products/${p.slug}): ${clip(p.short || p.name, 140)} ${productFacts(p)}`),
    '',
    '## Collections',
    ...COLLECTION_SLUGS.map((s) => `- [${titleCase(s)}](${SITE}/collections/${s})`),
    '',
    '## Policies and support',
    `- [Policies](${SITE}/policies): Shipping, exchange and refund, payment and privacy.`,
    `- [Full reference in plain text](${SITE}/llms-full.txt): Policies, sizes and products written out for agents.`,
    `- [Contact](${SITE}/contact): ${AAO.email}, Instagram, ${AAO.streetAddress} ${AAO.locality}.`,
    `- [Track your order](${SITE}/track-order): Needs order number and phone number.`,
    '',
    '## Machine-readable',
    `- [Sitemap](${SITE}/sitemap.xml): Products with image URLs.`,
    '',
  ];
  return lines.join('\n');
}

// Policy HTML from WordPress to readable plain text with list bullets kept.
function htmlToText(html) {
  return decodeEntities(
    String(html ?? '')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/(p|h[1-6]|ul|ol|div)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Full reference. The policy text is pulled from the same WordPress pages the
// site shows, so it cannot drift from the published rules.
function llmsFullTxt(homeDescription, products, faqs) {
  const out = [
    `# ${BRAND} - full reference for AI agents`,
    '',
    `Source of truth is ${SITE}. If anything here conflicts with a product page, the product page wins. Generated ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '## Business',
    `- ${stripHtml(homeDescription)}`,
    `- Location: ${AAO.streetAddress}, ${AAO.locality}, Pakistan. Founded 2021.`,
    `- Contact: ${AAO.email}, Instagram ${AAO.instagram}`,
    '',
    ...factsBlock(),
    '',
  ];
  for (const [slug, label] of POLICY_SLUGS) {
    if (!RAW_POLICIES[slug]) continue;
    out.push(`## ${label}`, '', htmlToText(RAW_POLICIES[slug]), '');
  }
  out.push('## Products', '');
  for (const p of products) {
    out.push(`### ${p.name}`);
    out.push(`${productFacts(p)} ${clip(p.long || p.short, 400)}`.trim());
    for (const s of p.accordion) {
      if (/^size/i.test(s.title) && s.table) {
        out.push(`${s.title}: ` + s.table.map((row) => row.join(' / ')).join('; '));
      }
    }
    out.push(`${SITE}/products/${p.slug}`, '');
  }
  if (faqs.length) {
    out.push('## FAQ', '');
    for (const f of faqs) out.push(`- ${f.question} ${f.answer}`);
    out.push('');
  }
  return out.join('\n');
}

// ---------- main ----------

async function main() {
  let template;
  try {
    template = await readFile(path.join(DIST, 'index.html'), 'utf8');
  } catch {
    console.warn('[prerender] dist/index.html not found; run `vite build` first. Skipping.');
    return;
  }

  if (template.includes('data-prerender') || template.includes('application/ld+json')) {
    console.warn('[prerender] dist/index.html is already pre-rendered; run `vite build` again. Skipping.');
    return;
  }

  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.warn(`[prerender] Could not load WooCommerce data (${err.message}). Leaving dist/ untouched.`);
    if (process.env.PRERENDER_STRICT) process.exitCode = 1; // opt-in: fail the deploy instead of shipping without prerendered pages
    return;
  }

  const variantMap = await loadVariants(data.products ?? [], data);
  const products = (data.products ?? []).map((p) => normalizeProduct(p, variantMap)).filter((p) => p.slug && p.name);
  if (products.length === 0) {
    console.warn('[prerender] No products returned. Leaving dist/ untouched.');
    if (process.env.PRERENDER_STRICT) process.exitCode = 1;
    return;
  }
  const categories = data.categories ?? [];
  try {
    const rv = FIXTURE ? (data.reviews ?? []) : await getJson(`${API}/products/reviews&per_page=3&order=desc&orderby=date_gmt`, 2);
    RECENT_REVIEWS = (Array.isArray(rv) ? rv : []).slice(0, 3).map((r) => ({
      id: r.id, product_id: r.product_id, product_name: r.product_name, reviewer: r.reviewer,
      review: r.review, rating: r.rating, verified: r.verified, date_created_gmt: r.date_created_gmt,
    }));
  } catch {
    RECENT_REVIEWS = [];
  }
  const faqs = await loadFaqs();
  const homeDescription = (template.match(/<meta\s+name="description"\s+content="([^"]*)"/) ?? [])[1] ?? '';
  const render = makeRenderer(template);
  await findChunks();

  const sitemapUrls = [{ loc: `${SITE}/` }];

  // Products
  for (const p of products) {
    await writeRoute(`/products/${p.slug}`, productPage(render, p));
    sitemapUrls.push({ loc: `${SITE}/products/${p.slug}`, images: p.images });
  }

  // Collections
  for (const slug of COLLECTION_SLUGS) {
    const cat = categories.find((c) => c.slug === slug);
    const items = products.filter((p) => p.categories.includes(slug));
    if (!cat || items.length === 0) {
      console.warn(`[prerender] Collection "${slug}" not found or empty; skipped.`);
      continue;
    }
    await writeRoute(`/collections/${slug}`, collectionPage(render, cat, items));
    sitemapUrls.push({ loc: `${SITE}/collections/${slug}` });
  }

  // Static pages that stay client-rendered but get correct head tags
  await writeRoute(
    '/contact',
    render({
      title: `Contact | ${BRAND}`,
      description: `Contact ${BRAND} in Karachi for sizing help and order questions.`,
      canonical: `${SITE}/contact`,
      chunk: 'ContactPage',
      schema: [breadcrumb([{ name: 'Home', url: `${SITE}/` }, { name: 'Contact', url: `${SITE}/contact` }])],
    }),
  );
  const policies = await loadPolicies();

  // Seed file: the exact lists the app asks the API for, as they are right now.
  // The browser downloads this static file first and paints from it, then the
  // live API answer replaces it if anything changed (see woocommerce.ts).
  try {
    const trim = (p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      prices: p.prices,
      short_description: p.short_description,
      images: (p.images ?? []).slice(0, 2).map((im) => ({ src: im.src, srcset: im.srcset, sizes: im.sizes })),
      on_sale: p.on_sale,
      is_purchasable: p.is_purchasable,
      is_in_stock: p.is_in_stock,
      menu_order: p.menu_order,
      date_created: p.date_created,
    });
    const seed = { products: {}, categories: [], policies: RAW_POLICIES };
    const ask = async (query, local) => {
      if (FIXTURE) return local();
      const { json, total } = await getJson(`${API}/products&${query}`, 3, true);
      return { items: json, total };
    };
    const byOrder = (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0);
    const homeQ = 'per_page=50&orderby=menu_order&order=asc';
    const home = await ask(homeQ, () => ({ items: [...(data.products ?? [])].sort(byOrder).slice(0, 50), total: (data.products ?? []).length }));
    seed.products[homeQ] = { total: home.total, items: home.items.map(trim) };
    for (const slug of COLLECTION_SLUGS) {
      const cat = categories.find((c) => c.slug === slug);
      if (!cat) continue;
      seed.categories.push({ id: cat.id, name: cat.name, slug: cat.slug, description: cat.description });
      const q = `per_page=8&category=${cat.id}&orderby=menu_order&order=asc`;
      const col = await ask(q, () => {
        const all = (data.products ?? []).filter((p) => (p.categories ?? []).some((c) => c.slug === slug)).sort(byOrder);
        return { items: all.slice(0, 8), total: all.length };
      });
      seed.products[q] = { total: col.total, items: col.items.map(trim) };
    }
    await mkdir(path.join(DIST, 'data'), { recursive: true });
    await writeFile(path.join(DIST, 'data', 'seed.json'), JSON.stringify(seed));
  } catch (err) {
    console.warn(`[prerender] Seed file skipped (${err.message}); pages load from the live API as before.`);
  }
  await writeRoute(
    '/policies',
    render({
      title: `Policies | ${BRAND}`,
      description: `Exchange and refund policy, shipping and payment information for ${BRAND} orders.`,
      canonical: `${SITE}/policies`,
      chunk: 'PolicyPage',
      schema: [breadcrumb([{ name: 'Home', url: `${SITE}/` }, { name: 'Policies', url: `${SITE}/policies` }])],
      body: policies.length
        ? wrap(
            '<h1>Policies</h1>' +
              policies.map((x) => `<section id="${esc(x.slug)}"><h2>${esc(x.label)}</h2>${x.html}</section>`).join(''),
          )
        : undefined,
    }),
  );
  sitemapUrls.push({ loc: `${SITE}/contact` }, { loc: `${SITE}/policies` });

  // Never-index pages
  for (const n of NOINDEX_ROUTES) {
    await writeRoute(
      n.route,
      render({ title: n.title, description: `${BRAND} – ${n.title.split(' | ')[0]}`, canonical: `${SITE}${n.route}`, noindex: true, chunk: n.chunk }),
    );
  }

  // 404 page (served with a 404 status only if the host is configured for it)
  await writeFile(
    path.join(DIST, '404.html'),
    render({
      title: `Page not found | ${BRAND}`,
      description: 'This page does not exist.',
      canonical: `${SITE}/`,
      noindex: true,
    }),
  );

  // Home last, so every other route above was built from the pristine template
  await writeRoute('/', homePage(render, homeDescription, products, faqs));

  await writeFile(path.join(DIST, 'sitemap.xml'), sitemapXml(sitemapUrls));
  await writeFile(path.join(DIST, 'llms.txt'), llmsTxt(homeDescription, products));
  await writeFile(path.join(DIST, 'llms-full.txt'), llmsFullTxt(homeDescription, products, faqs));

  console.log(
    `[prerender] ${products.length} products, ${COLLECTION_SLUGS.length} collection(s), ` +
      `${sitemapUrls.length} sitemap URLs, ${faqs.length} FAQ(s).`,
  );
}

main().catch((err) => {
  // Never fail the build because of SEO output.
  console.warn(`[prerender] Unexpected error: ${err.stack || err.message}. Leaving build as-is.`);
});
