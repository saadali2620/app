import { lazy } from 'react';
import { warmCollections } from '@/lib/woocommerce';

/**
 * Pages that are NOT an entry point for most visitors (checkout, account,
 * login, ...) are split into their own files so the first load only downloads
 * what the homepage, product page and catalog need. Product and catalog pages
 * stay in the main bundle because ads and social links land on them directly.
 *
 * Every import is declared once here so React.lazy, the "load before first
 * render" step and the idle prefetch all share the same module promise.
 */
export const importers = {
  checkout: () => import('@/pages/CheckoutPage'),
  trackOrder: () => import('@/pages/TrackOrderPage'),
  policy: () => import('@/pages/PolicyPage'),
  contact: () => import('@/pages/ContactPage'),
  login: () => import('@/pages/LoginPage'),
  register: () => import('@/pages/RegisterPage'),
  account: () => import('@/pages/AccountPage'),
  accountOrders: () => import('@/pages/AccountOrdersPage'),
  orderConfirmation: () => import('@/pages/OrderConfirmationPage'),
  notFound: () => import('@/pages/NotFoundPage'),
};

export const CheckoutPage = lazy(importers.checkout);
export const TrackOrderPage = lazy(importers.trackOrder);
export const PolicyPage = lazy(importers.policy);
export const ContactPage = lazy(importers.contact);
export const LoginPage = lazy(importers.login);
export const RegisterPage = lazy(importers.register);
export const AccountPage = lazy(importers.account);
export const AccountOrdersPage = lazy(importers.accountOrders);
export const OrderConfirmationPage = lazy(importers.orderConfirmation);
export const NotFoundPage = lazy(importers.notFound);

/**
 * Starts downloading the split page (if any) that the given URL path needs.
 * Mirrors the matching order in App.tsx's renderPage().
 */
export function importerForPath(fullPath: string): (() => Promise<unknown>) | null {
  const path = fullPath.split('?')[0].replace(/\/+$/, '') || '/';
  if (path.startsWith('/products/') || path.startsWith('/collections/')) return null;
  if (path === '/checkout') return importers.checkout;
  if (path === '/track-order') return importers.trackOrder;
  if (path === '/policies' || path.startsWith('/policies/')) return importers.policy;
  if (path === '/contact') return importers.contact;
  if (path === '/login') return importers.login;
  if (path === '/register') return importers.register;
  if (/^\/account\/(to-ship|to-receive|to-review)$/.test(path)) return importers.accountOrders;
  if (path === '/account') return importers.account;
  if (path.startsWith('/order-confirmation/')) return importers.orderConfirmation;
  if (['/', '/faqs', '/about'].includes(path)) return null;
  return importers.notFound;
}

/** Downloads every split page in the background once the browser is idle. */
export function prefetchAllPages(): void {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return;

  const run = () => {
    warmCollections();
    for (const load of Object.values(importers)) {
      load().catch(() => {
        /* best effort; the page loads on demand if this fails */
      });
    }
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}
