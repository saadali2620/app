import type { Product, Collection, ProductSize, AccordionSection } from '@/types';

const WC_BASE = import.meta.env.VITE_WC_BASE_URL ?? '/index.php?rest_route=/wc/store/v1';

// ---------------------------------------------------------------------------
// Speed helpers
//
// 1. Early requests: index.html starts the product-list request while the JS
//    bundle is still downloading and parks the in-flight Promise on
//    window.__norsEarly, keyed by the exact URL. fetchEarlyAware() picks it up
//    when the app asks for the same URL, so there is still only one request.
// 2. Short in-session memo for the lists that every product page used to
//    re-download (100 products just to find one slug).
// 3. A saved copy of the homepage list so returning visitors see products
//    instantly while the fresh list loads in the background.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __norsEarly?: Record<string, Promise<Response>>;
    __norsSeed?: Promise<Seed | null>;
    __norsPdp?: ProductHint & { slug: string };
  }
}

function takeEarly(url: string): Promise<Response> | null {
  const store = typeof window !== 'undefined' ? window.__norsEarly : undefined;
  const early = store?.[url];
  if (!early) return null;
  delete store![url];
  return early;
}

export async function fetchEarlyAware(url: string): Promise<Response> {
  const early = takeEarly(url);
  if (early) {
    try {
      const res = await early;
      if (res.ok) return res;
    } catch {
      /* fall through to a normal request */
    }
  }
  return fetch(url);
}

// ---------------------------------------------------------------------------
// Build-time seed: every deploy writes /data/seed.json with the shop's
// product lists, categories and policy texts as they were at build time.
// index.html starts downloading it immediately. It is a plain static file, so
// it arrives far faster than the WordPress API; pages paint from it at once
// and the live API answer replaces it a moment later (only if it differs).
// ---------------------------------------------------------------------------
interface Seed {
  products: Record<string, { total: number; items: any[] }>;
  categories: any[];
  policies: Record<string, string>;
}

function getSeed(): Promise<Seed | null> {
  const p = typeof window !== 'undefined' ? window.__norsSeed : undefined;
  return p ? p.catch(() => null) : Promise.resolve(null);
}

function listParams(opts?: { limit?: number; offset?: number; category?: string; sortBy?: ProductSortBy }): string {
  const params = new URLSearchParams();
  params.set('per_page', String(opts?.limit ?? 50));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.category) params.set('category', opts.category);
  const { orderby, order } = sortToParams(opts?.sortBy);
  params.set('orderby', orderby);
  params.set('order', order);
  return params.toString();
}

function mapCategory(c: any): Collection {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    tagline: null,
    description: c.description || null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };
}

/** The build-time copy of a product list, or null if there isn't one. */
export async function peekSeedProducts(opts?: { limit?: number; category?: string; sortBy?: ProductSortBy }): Promise<ProductListResult | null> {
  try {
    const entry = (await getSeed())?.products?.[listParams(opts)];
    if (!entry || !Array.isArray(entry.items) || entry.items.length === 0) return null;
    return { data: entry.items.map((p: any) => mapWcProduct(p)), count: entry.total };
  } catch {
    return null;
  }
}

export async function peekSeedCollection(slug: string): Promise<Collection | null> {
  try {
    const c = (await getSeed())?.categories?.find((x: any) => x.slug === slug);
    return c ? mapCategory(c) : null;
  } catch {
    return null;
  }
}

/** Build-time policy texts keyed by page slug (raw WordPress HTML), or null. */
export async function peekSeedPolicies(): Promise<Record<string, string> | null> {
  try {
    const policies = (await getSeed())?.policies;
    return policies && Object.keys(policies).length ? policies : null;
  } catch {
    return null;
  }
}

const PRODUCT_LIST_TTL_MS = 2 * 60 * 1000;
let productListPromise: Promise<any[]> | null = null;
let productListAt = 0;

function getProductList(): Promise<any[]> {
  if (productListPromise && Date.now() - productListAt < PRODUCT_LIST_TTL_MS) return productListPromise;
  productListAt = Date.now();
  const p = fetchEarlyAware(`${WC_BASE}/products&per_page=100&nors_cb=2`).then((res) => res.json());
  productListPromise = p;
  p.catch(() => {
    if (productListPromise === p) productListPromise = null;
  });
  return p;
}

const HOME_LIST_KEY = 'nors:home-products:v1';
const HOME_LIST_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface ProductListResult {
  data: Product[];
  count: number;
}

/** Last homepage product list this browser saved, if it is recent enough. */
export function peekHomeProducts(): ProductListResult | null {
  try {
    const raw = window.localStorage.getItem(HOME_LIST_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { t: number; data: Product[]; count: number };
    if (!saved || !Array.isArray(saved.data) || saved.data.length === 0) return null;
    if (Date.now() - saved.t > HOME_LIST_MAX_AGE_MS) return null;
    return { data: saved.data, count: saved.count };
  } catch {
    return null;
  }
}

function saveHomeProducts(result: ProductListResult): void {
  try {
    window.localStorage.setItem(HOME_LIST_KEY, JSON.stringify({ t: Date.now(), ...result }));
  } catch {
    /* storage full or blocked: skipping the saved copy is fine */
  }
}

/** True when two lists would render identically (so the screen need not re-render). */
export function sameProducts(a: Product[], b: Product[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.name !== y.name ||
      x.price !== y.price ||
      x.compare_at_price !== y.compare_at_price ||
      x.in_stock !== y.in_stock ||
      x.badge !== y.badge ||
      x.image_url !== y.image_url
    ) {
      return false;
    }
  }
  return true;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return decodeEntities(html.replace(/<[^>]*>/g, '')).trim();
}

function parseAccordionSections(rawDescription: string | null): AccordionSection[] {
  if (!rawDescription || !rawDescription.includes('[vc_accordion')) return [];
  const norm = rawDescription.replace(/&#8220;|&#8221;|&#8243;/g, '"');
  const sections: AccordionSection[] = [];
  const tabRe = /\[vc_accordion_tab[^\]]*title="([^"]+)"[^\]]*\]([\s\S]*?)\[\/vc_accordion_tab\]/g;
  let match: RegExpExecArray | null;
  while ((match = tabRe.exec(norm))) {
    const title = match[1].trim();
    let content = match[2]
      .replace(/\[vc_column_text[^\]]*\]/g, '')
      .replace(/\[\/vc_column_text\]/g, '')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8216;/g, '‘')
      .replace(/&#8217;/g, '’')
      .trim();
    if (content) sections.push({ title, content });
  }
  return sections;
}

function mapWcProduct(p: any, collection?: Collection | null): Product {
  return {
    id: String(p.id),
    name: stripHtml(p.name),
    slug: p.slug,
    collection_id: collection?.id ?? null,
    price: Number(p.prices.price) / Math.pow(10, p.prices.currency_minor_unit),
    compare_at_price: p.prices.regular_price !== p.prices.price
      ? Number(p.prices.regular_price) / Math.pow(10, p.prices.currency_minor_unit)
      : null,
    description: stripHtml(p.short_description || p.description),
    details: p.description ? stripHtml(p.description) : null,
    accordion: parseAccordionSections(p.description),
    image_url: p.images?.[0]?.src ?? '',
    // WooCommerce's Store API already returns WordPress's generated
    // intermediate sizes (150w/300w/1024w/...) for each image via srcset —
    // carrying those through means <img> can request only the pixels a
    // given layout needs instead of always pulling the full-size original.
    image_srcset: p.images?.[0]?.srcset ?? '',
    image_sizes: p.images?.[0]?.sizes ?? '',
    image_url_2: p.images?.[1]?.src ?? null,
    images: (p.images ?? []).map((im: any) => im.src),
    badge: p.on_sale ? 'Sale' : (p.is_purchasable === false ? 'Sold Out' : null),
    in_stock: p.is_in_stock,
    sort_order: p.menu_order ?? 0,
    created_at: p.date_created ?? new Date().toISOString(),
    collection,
  };
}

export type ProductSortBy = 'featured' | 'newest' | 'price-asc' | 'price-desc';

function sortToParams(sortBy?: ProductSortBy): { orderby: string; order: string } {
  switch (sortBy) {
    case 'price-asc':
      return { orderby: 'price', order: 'asc' };
    case 'price-desc':
      return { orderby: 'price', order: 'desc' };
    case 'newest':
      return { orderby: 'date', order: 'desc' };
    case 'featured':
    default:
      // Matches the drag-and-drop order set via the "Sorting" button on the
      // WordPress Products list (WooCommerce's menu_order field).
      return { orderby: 'menu_order', order: 'asc' };
  }
}

// Collection lists (page 1 of /collections/<slug>) are reused for two minutes,
// so a visit warmed in the background, or a quick return to the page, is instant.
const CATEGORY_LIST_TTL_MS = 2 * 60 * 1000;
const categoryLists = new Map<string, { at: number; p: Promise<ProductListResult> }>();

export async function getProducts(opts?: { limit?: number; offset?: number; category?: string; sortBy?: ProductSortBy }): Promise<ProductListResult> {
  const url = `${WC_BASE}/products&${listParams(opts)}&nors_cb=2`;
  const load = async (): Promise<ProductListResult> => {
    const res = await fetchEarlyAware(url);
    const data = await res.json();
    const total = Number(res.headers.get('X-WP-Total') ?? data.length);
    return { data: data.map((p: any) => mapWcProduct(p)), count: total };
  };

  if (opts?.category) {
    const hit = categoryLists.get(url);
    if (hit && Date.now() - hit.at < CATEGORY_LIST_TTL_MS) return hit.p;
    const p = load();
    categoryLists.set(url, { at: Date.now(), p });
    p.catch(() => {
      if (categoryLists.get(url)?.p === p) categoryLists.delete(url);
    });
    return p;
  }

  const result = await load();
  const isHomeList = !opts?.offset && (opts?.limit ?? 50) === 50 && (!opts?.sortBy || opts.sortBy === 'featured');
  if (isHomeList) saveHomeProducts(result);
  return result;
}

/** Quietly loads the first page of every collection so opening one is instant. */
export function warmCollections(): void {
  getCollections()
    .then((cols) => {
      for (const c of cols) {
        if (c.slug === 'uncategorized') continue;
        getProducts({ limit: 8, category: c.id, sortBy: 'featured' }).catch(() => {});
      }
    })
    .catch(() => {});
}

// Saved copy of a collection's first page, so a returning visitor sees it at once.
const COLLECTION_KEY = 'nors:collection:v1:';
const COLLECTION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface SavedCollection {
  collection: Collection;
  data: Product[];
  count: number;
}

export function peekCollection(slug: string): SavedCollection | null {
  try {
    const raw = window.localStorage.getItem(COLLECTION_KEY + slug);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { t: number } & SavedCollection;
    if (!saved || !saved.collection || !Array.isArray(saved.data) || saved.data.length === 0) return null;
    if (Date.now() - saved.t > COLLECTION_MAX_AGE_MS) return null;
    return { collection: saved.collection, data: saved.data, count: saved.count };
  } catch {
    return null;
  }
}

export function saveCollection(slug: string, value: SavedCollection): void {
  try {
    window.localStorage.setItem(COLLECTION_KEY + slug, JSON.stringify({ t: Date.now(), ...value }));
  } catch {
    /* storage full or blocked: skipping the saved copy is fine */
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const list = await getProductList();
  const match = list.find((p: any) => p.slug === slug);
  if (!match) return null;
  return mapWcProduct(match);
}

export async function getProductSizes(productId: string): Promise<ProductSize[]> {
  const productRes = await fetch(`${WC_BASE}/products&include=${productId}&nors_cb=2`);
  const productList = await productRes.json();
  const product = productList[0];
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
  const sizeRank = (s: string) => {
    const idx = sizeOrder.indexOf(s.toUpperCase());
    return idx === -1 ? 999 : idx;
  };
  // Store API variations carry no stock flag; ask for them as products.
  const stock: Record<string, boolean> = {};
  const vids = (product.variations ?? []).map((v: any) => v.id);
  if (vids.length) {
    try {
      const vr = await fetch(`${WC_BASE}/products&type=variation&per_page=100&include=${vids.join(',')}&nors_cb=2`);
      for (const x of await vr.json()) stock[String(x.id)] = x.is_in_stock === true;
    } catch { /* fall back to in stock */ }
  }
  const sizes = (product.variations ?? []).map((v: any, i: number) => {
    const sizeAttr = v.attributes?.find((a: any) => a.name === 'Size');
    return {
      id: String(v.id),
      product_id: productId,
      size: sizeAttr?.value ?? '',
      in_stock: stock[String(v.id)] ?? false,
      sort_order: i,
    };
  });
  sizes.sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
  return sizes;
}

// Categories change rarely; reuse them for a few minutes instead of
// re-downloading on every product/collection page.
const COLLECTIONS_TTL_MS = 10 * 60 * 1000;
let collectionsPromise: Promise<Collection[]> | null = null;
let collectionsAt = 0;

export function getCollections(): Promise<Collection[]> {
  if (collectionsPromise && Date.now() - collectionsAt < COLLECTIONS_TTL_MS) return collectionsPromise;
  collectionsAt = Date.now();
  const p = fetchEarlyAware(`${WC_BASE}/products/categories&per_page=50&nors_cb=2`)
    .then((res) => res.json())
    .then((data) => data.map(mapCategory));
  collectionsPromise = p;
  p.catch(() => {
    if (collectionsPromise === p) collectionsPromise = null;
  });
  return p;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const collections = await getCollections();
  return collections.find(c => c.slug === slug) ?? null;
}

interface WcTokens {
  nonce: string;
  cartToken: string;
}

function readTokens(res: Response, fallback: WcTokens): WcTokens {
  return {
    nonce: res.headers.get('Nonce') ?? fallback.nonce,
    cartToken: res.headers.get('Cart-Token') ?? fallback.cartToken,
  };
}

const STEP_GAP_MS = 220;
function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wcCall(path: string, tokens: WcTokens, options: RequestInit = {}): Promise<{ data: any; res: Response; tokens: WcTokens }> {
  const res = await fetch(`${WC_BASE}${path}&nors_cb=2`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Nonce: tokens.nonce,
      'Cart-Token': tokens.cartToken,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  return { data, res, tokens: readTokens(res, tokens) };
}

export async function getPaymentMethods(): Promise<string[]> {
  const res = await fetch(`${WC_BASE}/cart&_=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  const cart = await res.json();
  return cart.payment_methods ?? [];
}

export interface CheckoutBilling {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state: string;
  postcode?: string;
  email: string;
  phone: string;
  country: string;
}

export interface CheckoutSecurity {
  turnstileToken: string;
  honeypot: string;
}

export interface CheckoutLineItem {
  variantId: string;
  quantity: number;
}

// Just enough of the shipping address to get an accurate shipping-zone
// match before the customer has filled in the rest of the checkout form.
export interface ShippingLocation {
  city: string;
  state: string;
  country: string;
}

export interface CartTotals {
  itemsTotal: number;
  shippingTotal: number;
  grandTotal: number;
}

/**
 * Syncs the server-side cart to match the given items (same clear-then-add
 * sequence performCheckout uses) purely to read back WooCommerce's real
 * totals — in particular the actual shipping cost from the configured
 * shipping zone, rather than guessing it on the frontend. Used to show an
 * accurate order summary on the checkout page *before* the customer submits,
 * so the number they see matches what they're actually charged.
 *
 * `location`, when given, is pushed to the cart's customer address first via
 * /cart/update-customer. Without this, WooCommerce prices shipping against
 * whatever the store's default customer location is (its own base address)
 * regardless of what the shopper actually typed — which is why every order
 * used to get priced (and recorded) as if it shipped within the store's own
 * province, no matter the real destination.
 */
async function getCartTotalsImpl(items: CheckoutLineItem[], location?: ShippingLocation): Promise<CartTotals> {
  // no-store: a couple of environments run a page/edge cache in front of
  // WooCommerce, and this endpoint's response carries the customer's live
  // cart state and Nonce/Cart-Token — serving a cached copy of it makes the
  // remove-item step below act on stale data.
  const initRes = await fetch(`${WC_BASE}/cart&_=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  const currentCart = await initRes.json();
  let tokens: WcTokens = readTokens(initRes, { nonce: '', cartToken: '' });

  if (location) {
    await pause(STEP_GAP_MS);
    const r = await wcCall('/cart/update-customer', tokens, {
      method: 'POST',
      body: JSON.stringify({
        shipping_address: { city: location.city, state: location.state, country: location.country },
        billing_address: { city: location.city, state: location.state, country: location.country },
      }),
    });
    if (r.res.ok) tokens = r.tokens;
  }

  for (const existing of currentCart.items ?? []) {
    await pause(STEP_GAP_MS);
    const r = await wcCall('/cart/remove-item', tokens, {
      method: 'POST',
      body: JSON.stringify({ key: existing.key }),
    });
    // A failed remove (stale nonce, session hiccup) must not be swallowed —
    // otherwise the old item stays in the server cart and the items added
    // just below land on top of it, so the total silently grows on every
    // reload instead of reflecting only the current local cart.
    if (!r.res.ok) {
      throw new Error(r.data?.message || 'Could not reset cart before totaling.');
    }
    tokens = r.tokens;
  }

  let lastData: any = currentCart;
  for (const item of items) {
    await pause(STEP_GAP_MS);
    const r = await wcCall('/cart/add-item', tokens, {
      method: 'POST',
      body: JSON.stringify({ id: Number(item.variantId), quantity: item.quantity }),
    });
    if (!r.res.ok) throw new Error(r.data.message || 'Could not add item to cart');
    tokens = r.tokens;
    lastData = r.data;
  }

  const totals = lastData.totals ?? {};
  const minorUnit = Math.pow(10, totals.currency_minor_unit ?? 2);
  return {
    itemsTotal: Number(totals.total_items ?? 0) / minorUnit,
    shippingTotal: Number(totals.total_shipping ?? 0) / minorUnit,
    grandTotal: Number(totals.total_price ?? 0) / minorUnit,
  };
}

/**
 * Runs the full checkout sequence (sync server cart to match the local cart,
 * submit the order) as one chain that fetches the Nonce/Cart-Token pair once
 * and threads it through every call, instead of re-fetching a fresh nonce
 * before each step. A small pause separates each preflighted request.
 * Shared hosting can trip a PHP-FPM concurrency/rate limit on a tight burst
 * of back-to-back CORS-preflighted requests, surfacing as an unrelated
 * "Failed to fetch"; both changes keep the request volume and pacing
 * comfortably under that.
 *
 * paymentMethod is the customer's own choice from the checkout form (see
 * getPaymentMethods) — it used to be decided here automatically (PayFast
 * whenever available), which is why Cash on Delivery was never actually
 * offered even when it was enabled in WooCommerce.
 */
async function performCheckoutImpl(
  items: CheckoutLineItem[],
  billing: CheckoutBilling,
  security: CheckoutSecurity,
  paymentMethod: string
) {
  const initRes = await fetch(`${WC_BASE}/cart&_=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  const currentCart = await initRes.json();
  let tokens: WcTokens = readTokens(initRes, { nonce: '', cartToken: '' });

  for (const existing of currentCart.items ?? []) {
    await pause(STEP_GAP_MS);
    const r = await wcCall('/cart/remove-item', tokens, {
      method: 'POST',
      body: JSON.stringify({ key: existing.key }),
    });
    if (!r.res.ok) {
      throw new Error(r.data?.message || 'Could not reset cart before checkout.');
    }
    tokens = r.tokens;
  }

  for (const item of items) {
    await pause(STEP_GAP_MS);
    const r = await wcCall('/cart/add-item', tokens, {
      method: 'POST',
      body: JSON.stringify({ id: Number(item.variantId), quantity: item.quantity }),
    });
    if (!r.res.ok) throw new Error(r.data.message || 'Could not add item to cart');
    tokens = r.tokens;
  }

  await pause(STEP_GAP_MS);
  const checkoutRes = await wcCall('/checkout', tokens, {
    method: 'POST',
    body: JSON.stringify({
      billing_address: billing,
      shipping_address: billing,
      payment_method: paymentMethod,
      extensions: {
        nors_security: {
          turnstile_token: security.turnstileToken,
          website_hp: security.honeypot,
        },
      },
    }),
  });

  if (!checkoutRes.res.ok) {
    const err = new Error(checkoutRes.data.message || 'Order could not be placed.') as Error & { code?: string };
    err.code = checkoutRes.data.code;
    throw err;
  }

  return { result: checkoutRes.data, paymentMethod };
}

// All cart mutations below (getCartTotals, performCheckout) work by wiping
// the live WooCommerce session cart and re-adding items to read back fresh
// totals/checkout results. If two calls ever run concurrently (repeated
// effect fires, fast page navigation) their remove/add steps interleave and
// items get double-added before the other call's cleanup catches up — this
// queue forces every call to run strictly one after another.
let cartOpQueue: Promise<unknown> = Promise.resolve();
function withCartLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = cartOpQueue.then(fn, fn);
  cartOpQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function getCartTotals(items: CheckoutLineItem[], location?: ShippingLocation): Promise<CartTotals> {
  return withCartLock(() => getCartTotalsImpl(items, location));
}

export function performCheckout(
  ...args: Parameters<typeof performCheckoutImpl>
): ReturnType<typeof performCheckoutImpl> {
  return withCartLock(() => performCheckoutImpl(...args));
}

export const COD_DEPOSIT_THRESHOLD = 6000;

export interface CodDepositResult {
  depositAmount: number;
  remainingAmount: number;
}

export async function markCodDeposit(orderId: number): Promise<CodDepositResult> {
  const res = await fetch('https://nors.com.pk/index.php?rest_route=/nors/v1/mark-cod-deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Could not apply the advance payment split.');
  }
  return { depositAmount: data.depositAmount, remainingAmount: data.remainingAmount };
}

// PostEx's operational-city list, fetched once per page load and cached in
// module scope. Backed by a server-side cached REST route (the PostEx API
// itself is neither fast nor meant to be hit on every checkout keystroke),
// but this still avoids re-fetching it on every render/effect re-run within
// a single visit.
let cachedPostexCities: string[] | null = null;
let postexCitiesPromise: Promise<string[]> | null = null;

export function getPostexServiceableCities(): Promise<string[]> {
  if (cachedPostexCities) return Promise.resolve(cachedPostexCities);
  if (!postexCitiesPromise) {
    postexCitiesPromise = fetch('https://nors.com.pk/index.php?rest_route=/nors/v1/postex-cities')
      .then((res) => res.json())
      .then((data) => {
        const cities: string[] = Array.isArray(data?.cities) ? data.cities : [];
        cachedPostexCities = cities;
        return cities;
      })
      .catch(() => {
        // Non-fatal: checkout should never be blocked by this lookup
        // failing. Clear the in-flight promise so a later call can retry
        // instead of permanently caching an empty result from a transient
        // failure.
        postexCitiesPromise = null;
        return [];
      });
  }
  return postexCitiesPromise;
            }

// ---------------------------------------------------------------------------
// What a product page will look like, known before its data arrives, so the
// loading placeholder can take the same shape. Comes from the page the build
// wrote for this product, or else from a list this browser already saved.
// ---------------------------------------------------------------------------
export interface ProductHint {
  name?: string;
  photos?: number;
  sections?: number;
  sizes?: number;
}

const notReviews = (title: string) => !/^reviews?$/i.test(title.trim());

export function peekProductHint(slug: string): ProductHint | null {
  try {
    const baked = typeof window !== 'undefined' ? window.__norsPdp : undefined;
    if (baked && baked.slug === slug) return baked;
    const lists = [peekHomeProducts()?.data, peekCollection('batch-01')?.data];
    for (const list of lists) {
      const p = list?.find((x) => x.slug === slug);
      if (p) {
        return {
          name: p.name,
          photos: p.images?.length,
          sections: p.accordion?.filter((a) => notReviews(a.title)).length,
        };
      }
    }
  } catch {
    /* fall through to defaults */
  }
  return null;
}
