import type { Product, Collection, ProductSize, AccordionSection } from '@/types';

const WC_BASE = import.meta.env.VITE_WC_BASE_URL ?? '/enterprise/index.php?rest_route=/wc/store/v1';

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
      .replace(/&#8211;/g, '\u2013')
      .replace(/&#8212;/g, '\u2014')
      .replace(/&#8216;/g, '\u2018')
      .replace(/&#8217;/g, '\u2019')
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

export async function getProducts(opts?: { limit?: number; offset?: number; category?: string; sortBy?: ProductSortBy }): Promise<{ data: Product[]; count: number }> {
  const params = new URLSearchParams();
  params.set('per_page', String(opts?.limit ?? 50));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.category) params.set('category', opts.category);
  const { orderby, order } = sortToParams(opts?.sortBy);
  params.set('orderby', orderby);
  params.set('order', order);

  const res = await fetch(`${WC_BASE}/products&${params.toString()}`);
  const data = await res.json();
  const total = Number(res.headers.get('X-WP-Total') ?? data.length);
  return { data: data.map((p: any) => mapWcProduct(p)), count: total };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await fetch(`${WC_BASE}/products&per_page=100`);
  const list = await res.json();
  const match = list.find((p: any) => p.slug === slug);
  if (!match) return null;
  return mapWcProduct(match);
}

export async function getProductSizes(productId: string): Promise<ProductSize[]> {
  const productRes = await fetch(`${WC_BASE}/products&include=${productId}`);
  const productList = await productRes.json();
  const product = productList[0];
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
  const sizeRank = (s: string) => {
    const idx = sizeOrder.indexOf(s.toUpperCase());
    return idx === -1 ? 999 : idx;
  };
  const sizes = (product.variations ?? []).map((v: any, i: number) => {
    const sizeAttr = v.attributes?.find((a: any) => a.name === 'Size');
    return {
      id: String(v.id),
      product_id: productId,
      size: sizeAttr?.value ?? '',
      in_stock: true,
      sort_order: i,
    };
  });
  sizes.sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
  return sizes;
}

export async function getCollections(): Promise<Collection[]> {
  const res = await fetch(`${WC_BASE}/products/categories&per_page=50`);
  const data = await res.json();
  return data.map((c: any) => ({
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    tagline: null,
    description: c.description || null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  }));
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
  const res = await fetch(`${WC_BASE}${path}`, {
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
  const res = await fetch(`${WC_BASE}/cart`, { credentials: 'include' });
  const cart = await res.json();
  return cart.payment_methods ?? [];
}

export interface CheckoutBilling {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
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
 */
export async function getCartTotals(items: CheckoutLineItem[]): Promise<CartTotals> {
  // no-store: a couple of environments run a page/edge cache in front of
  // WooCommerce, and this endpoint's response carries the customer's live
  // cart state and Nonce/Cart-Token — serving a cached copy of it makes the
  // remove-item step below act on stale data.
  const initRes = await fetch(`${WC_BASE}/cart`, { credentials: 'include', cache: 'no-store' });
  const currentCart = await initRes.json();
  let tokens: WcTokens = readTokens(initRes, { nonce: '', cartToken: '' });

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
export async function performCheckout(
  items: CheckoutLineItem[],
  billing: CheckoutBilling,
  security: CheckoutSecurity,
  paymentMethod: string
) {
  const initRes = await fetch(`${WC_BASE}/cart`, { credentials: 'include', cache: 'no-store' });
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
