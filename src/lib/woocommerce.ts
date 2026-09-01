import type { Product, Collection, ProductSize, AccordionSection } from '@/types';

const WC_BASE = import.meta.env.VITE_WC_BASE_URL ?? '/enterprise/index.php?rest_route=/wc/store/v1';

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
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
  const res = await fetch(`${WC_BASE}/products&slug=${encodeURIComponent(slug)}`);
  const data = await res.json();
  if (!data.length) return null;
  return mapWcProduct(data[0]);
}

export async function getProductSizes(productId: string): Promise<ProductSize[]> {
  const res = await fetch(`${WC_BASE}/products&slug=`);
  const productRes = await fetch(`${WC_BASE}/products/${productId}`);
  const product = await productRes.json();
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

interface WcNonceInfo {
  nonce: string;
  cartToken: string;
}

async function getNonce(): Promise<WcNonceInfo> {
  const res = await fetch(`${WC_BASE}/cart`, { credentials: 'include' });
  return {
    nonce: res.headers.get('Nonce') ?? '',
    cartToken: res.headers.get('Cart-Token') ?? '',
  };
}

export async function getPaymentMethods(): Promise<string[]> {
  const res = await fetch(`${WC_BASE}/cart`, { credentials: 'include' });
  const cart = await res.json();
  return cart.payment_methods ?? [];
}

async function wcFetch(path: string, options: RequestInit = {}) {
  const { nonce, cartToken } = await getNonce();
  const res = await fetch(`${WC_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Nonce: nonce,
      'Cart-Token': cartToken,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'WooCommerce request failed');
  return data;
}

export async function clearWooCart() {
  const cart = await wcFetch('/cart');
  for (const item of cart.items ?? []) {
    await wcFetch(`/cart/remove-item`, {
      method: 'POST',
      body: JSON.stringify({ key: item.key }),
    });
  }
}

export async function addToWooCart(variantId: string, quantity: number) {
  return wcFetch('/cart/add-item', {
    method: 'POST',
    body: JSON.stringify({ id: Number(variantId), quantity }),
  });
}

export interface CheckoutBilling {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  email: string;
  phone: string;
  country: string;
}

export async function submitWooCheckout(billing: CheckoutBilling, paymentMethod: string) {
  return wcFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify({
      billing_address: billing,
      shipping_address: billing,
      payment_method: paymentMethod,
    }),
  });
}
