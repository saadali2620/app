/**
 * Meta (Facebook/Instagram) Pixel integration.
 *
 * Set VITE_META_PIXEL_ID in Vercel's environment variables once you have a
 * Pixel ID from Meta Business Manager. Until then, every function here is a
 * safe no-op — nothing loads, nothing errors, nothing tracks.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let initialized = false;

/**
 * Loads the Meta Pixel base script and fires the first PageView.
 * Call this once, as early as possible (see src/main.tsx).
 */
export function initPixel() {
  if (initialized || !PIXEL_ID || typeof window === 'undefined') {
    return;
  }
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
  window.fbq!('track', 'PageView');
}

function track(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, params);
  }
}

/** Call on every client-side route change (SPA navigations after the first load). */
export function trackPageView() {
  track('PageView');
}

export function trackViewContent(params: {
  content_name: string;
  content_ids: string[];
  content_type?: string;
  value?: number;
  currency?: string;
}) {
  track('ViewContent', { content_type: 'product', ...params });
}

export function trackAddToCart(params: {
  content_name: string;
  content_ids: string[];
  value: number;
  currency: string;
}) {
  track('AddToCart', { content_type: 'product', ...params });
}

export function trackInitiateCheckout(params: {
  value: number;
  currency: string;
  num_items: number;
  content_ids: string[];
}) {
  track('InitiateCheckout', { content_type: 'product', ...params });
}

export function trackPurchase(params: {
  value: number;
  currency: string;
  content_ids: string[];
  order_id?: string;
}) {
  track('Purchase', { content_type: 'product', ...params });
}
