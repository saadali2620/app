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
    image_url_2: p.images?.[1]?.src ?? null,
    images: (p.images ?? []).map((im: any) => im.src),
    badge: p.on_sale ? 'Sale' : (p.is_purchasable === false ? 'Sold Out' : null),
    in_stock: p.is_in_stock,
    sort_order: p.menu_order ?? 0,
    created_at: p.date_created ?? new Date().toISOString(),
    collection,
  };
}

export async function getProducts(opts?: { limit?: number; offset?: number; category?: string }): Promise<{ data: Product[]; count: number }> {
  const params = new URLSearchParams();
  params.set('per_page', String(opts?.limit ?? 50));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.category) params.set('category', opts.category);

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

/**
 * Runs the full checkout sequence (sync server cart to match the local cart,
 * fetch payment methods, submit the order) as ONE chain that fetches the
 * Nonce/Cart-Token pair once and threads it through every call, instead of
 * re-fetching a fresh nonce before each step. This roughly halves the number
 * of round-trips a full checkout makes to the WooCommerce API — important on
 * shared hosting where a burst of near-simultaneous requests can trip the
 * server's PHP-FPM concurrency limit and return an unrelated network error.
 */
export async function performCheckout(
  items: CheckoutLineItem[],
  billing: CheckoutBilling,
  security: CheckoutSecurity
) {
  const initRes = await fetch(`${WC_BASE}/cart`, { credentials: 'include' });
  const currentCart = await initRes.json();
  let tokens: WcTokens = readTokens(initRes, { nonce: '', cartToken: '' });

  for (const existing of currentCart.items ?? []) {
    const r = await wcCall('/cart/remove-item', tokens, {
      method: 'POST',
      body: JSON.stringify({ key: existing.key }),
    });
    tokens = r.tokens;
  }

  for (const item of items) {
    const r = await wcCall('/cart/add-item', tokens, {
      method: 'POST',
      body: JSON.stringify({ id: Number(item.variantId), quantity: item.quantity }),
    });
    if (!r.res.ok) throw new Error(r.data.message || 'Could not add item to cart');
    tokens = r.tokens;
  }

  const cartCheck = await wcCall('/cart', tokens);
  tokens = cartCheck.tokens;
  const paymentMethods: string[] = cartCheck.data.payment_methods ?? [];
  const paymentMethod = paymentMethods.includes('payfast') ? 'payfast' : paymentMethods[0] ?? 'cod';

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
