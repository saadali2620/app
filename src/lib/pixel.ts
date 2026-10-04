/**
 * Meta (Facebook/Instagram) Pixel + Conversions API integration.
 *
 * Every tracked event is sent twice, on purpose:
 *   1. Browser: fbq('track', ...) through the Pixel.
 *   2. Server: POST /api/meta-capi (see api/meta-capi.js), which forwards the
 *      same event to Meta's Conversions API.
 * Both copies carry the same event ID, so Meta counts the pair once. The
 * server copy still arrives when an ad blocker or iOS privacy settings stop
 * the Pixel, which is why running both gives the most reliable numbers.
 *
 * Config:
 *   VITE_META_PIXEL_ID (optional) - defaults to the nors. dataset below.
 *
 * Tracking must never break the storefront, so every function here swallows
 * its own errors.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined) || '4640251216246898';
const CAPI_ENDPOINT = '/api/meta-capi';
const CURRENCY = 'PKR';
const FBC_KEY = 'nors_fbc';
const PENDING_PURCHASE_KEY = 'nors_pending_purchase';
const PENDING_PURCHASE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let initialized = false;

/** Customer details, sent only to our own /api/meta-capi where they are hashed before leaving for Meta. */
export interface BuyerData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface ContentLine {
  id: string;
  quantity: number;
  item_price: number;
}

export interface PurchaseParams {
  value: number;
  currency: string;
  content_ids: string[];
  num_items?: number;
  contents?: ContentLine[];
  order_id?: string;
}

/**
 * Loads the Meta Pixel base script. Call once, as early as possible
 * (see src/main.tsx). PageView is NOT fired here: App.tsx calls
 * trackPageView() on first load and on every route change, and firing it in
 * both places would count the first page twice.
 */
export function initPixel() {
  if (typeof window === 'undefined') return;
  captureFbclid();
  if (initialized || !PIXEL_ID) return;
  initialized = true;

  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq!('init', PIXEL_ID);
}

// When someone arrives from an ad, the URL carries ?fbclid=... . The Pixel
// turns that into the _fbc cookie, but only if it loads. Keeping our own copy
// lets the server event still be attributed to the ad when the Pixel is
// blocked.
function captureFbclid() {
  try {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (fbclid) localStorage.setItem(FBC_KEY, `fb.1.${Date.now()}.${fbclid}`);
  } catch {
    // Storage unavailable (private mode etc.): attribution falls back to the cookie only.
  }
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function readFbc(): string | undefined {
  const fromCookie = readCookie('_fbc');
  if (fromCookie) return fromCookie;
  try {
    return localStorage.getItem(FBC_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function sendServerEvent(
  eventName: string,
  eventId: string,
  params: Record<string, unknown>,
  buyer?: BuyerData
) {
  try {
    const body = JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      custom_data: params,
      user_data: buyer ?? {},
      fbp: readCookie('_fbp'),
      fbc: readFbc(),
    });
    fetch(CAPI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let tracking break the page.
  }
}

function track(
  event: string,
  params: Record<string, unknown>,
  opts: { eventId?: string; buyer?: BuyerData } = {}
) {
  if (typeof window === 'undefined') return;
  const eventId = opts.eventId ?? newEventId();
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', event, params, { eventID: eventId });
    }
  } catch {
    // Never let tracking break the page.
  }
  sendServerEvent(event, eventId, params, opts.buyer);
}

/** Call on every client-side route change. Browser-only: PageView is not sent to the server. */
export function trackPageView() {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  } catch {
    // Never let tracking break the page.
  }
}

export function trackViewContent(params: {
  content_name: string;
  content_ids: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  contents?: ContentLine[];
}) {
  track('ViewContent', { content_type: 'product', currency: CURRENCY, ...params });
}

export function trackAddToCart(params: {
  content_name: string;
  content_ids: string[];
  value: number;
  currency: string;
  contents?: ContentLine[];
}) {
  track('AddToCart', { content_type: 'product', ...params });
}

export function trackInitiateCheckout(
  params: {
    value: number;
    currency: string;
    num_items: number;
    content_ids: string[];
    contents?: ContentLine[];
  },
  buyer?: BuyerData
) {
  track('InitiateCheckout', { content_type: 'product', ...params }, { buyer });
}

/**
 * Fires at most once per order. The event ID is derived from the order ID so
 * the browser event, the server event and any page refresh all collapse into
 * a single Purchase on Meta's side.
 */
export function trackPurchase(params: PurchaseParams, buyer?: BuyerData) {
  const orderId = params.order_id;
  if (orderId) {
    const sentKey = `nors_purchase_sent_${orderId}`;
    try {
      if (localStorage.getItem(sentKey)) return;
      localStorage.setItem(sentKey, '1');
    } catch {
      // Storage unavailable: send anyway, Meta still de-duplicates on event ID.
    }
  }
  track(
    'Purchase',
    { content_type: 'product', ...params },
    { eventId: orderId ? `purchase_${orderId}` : undefined, buyer }
  );
}

/**
 * For orders that leave the site to pay (card/online gateway): remember the
 * purchase now, fire it only when the customer lands back on the success page.
 */
export function stashPendingPurchase(params: PurchaseParams, buyer: BuyerData) {
  try {
    localStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({ params, buyer, at: Date.now() }));
  } catch {
    // Storage unavailable: that purchase simply won't be tracked.
  }
}

export function flushPendingPurchase() {
  try {
    const raw = localStorage.getItem(PENDING_PURCHASE_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_PURCHASE_KEY);
    const pending = JSON.parse(raw) as { params?: PurchaseParams; buyer?: BuyerData; at?: number };
    if (!pending.params) return;
    if (typeof pending.at === 'number' && Date.now() - pending.at > PENDING_PURCHASE_MAX_AGE_MS) return;
    trackPurchase(pending.params, pending.buyer);
  } catch {
    // Corrupt or unavailable storage: skip.
  }
}
