import { Suspense, useEffect } from 'react';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { trackPageView } from '@/lib/pixel';
import { useRouter } from '@/hooks/useRouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import HomePage from '@/pages/HomePage';
import CatalogPage from '@/pages/CatalogPage';
import ProductPage from '@/pages/ProductPage';
import type { OrdersView } from '@/pages/AccountOrdersPage';
import {
  CheckoutPage,
  PolicyPage,
  ContactPage,
  OrderConfirmationPage,
  TrackOrderPage,
  LoginPage,
  RegisterPage,
  AccountPage,
  AccountOrdersPage,
  NotFoundPage,
} from '@/routes';

function App() {
  const { route, navigate } = useRouter();
  const path = route.path;

  useEffect(() => {
    trackPageView();
  }, [path]);

  useEffect(() => {
    // Best-effort deterrent against casual image saving (right-click / long-press).
    // Does not and cannot stop screenshots or dev-tools access.
    const blockImageContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'IMG') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockImageContextMenu);
    return () => document.removeEventListener('contextmenu', blockImageContextMenu);
  }, []);

  useEffect(() => {
    // /faqs has no dedicated page — the FAQ content lives inline on the
    // homepage. Rather than silently land on the top of the homepage with
    // no indication anything happened, scroll straight to that section
    // once it's mounted.
    if (path === '/faqs') {
      const el = document.getElementById('faqs');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [path]);

  const renderPage = () => {
    // /products/:slug
    if (path.startsWith('/products/')) {
      const slug = path.replace('/products/', '');
      return <ProductPage slug={slug} navigate={navigate} />;
    }

    // /collections/:slug
    if (path.startsWith('/collections/')) {
      const slug = path.replace('/collections/', '');
      // The general "Shop All" catalog ('all') is temporarily hidden
      // site-wide; falls through to the homepage below. Specific
      // collections (e.g. batch-01) remain browsable directly.
      if (slug !== 'all') {
        return <CatalogPage navigate={navigate} collectionSlug={slug} />;
      }
    }

    // /about — temporarily hidden site-wide, same treatment as Shop All;
    // falls through to the homepage below.

    // /checkout
    if (path === '/checkout') {
      return <CheckoutPage navigate={navigate} />;
    }

    // /track-order
    if (path === '/track-order' || path.startsWith('/track-order?')) {
      return <TrackOrderPage navigate={navigate} />;
    }

    // /policies
    if (path === '/policies' || path.startsWith('/policies/')) {
      return <PolicyPage navigate={navigate} />;
    }

    // /contact
    if (path === '/contact') {
      return <ContactPage navigate={navigate} />;
    }

    // /login
    if (path === '/login') {
      return <LoginPage navigate={navigate} />;
    }

    // /register
    if (path === '/register') {
      return <RegisterPage navigate={navigate} />;
    }

    // /account
    const ordersView = path.match(/^\/account\/(to-ship|to-receive|to-review)$/);
    if (ordersView) {
      return <AccountOrdersPage view={ordersView[1] as OrdersView} navigate={navigate} />;
    }

    if (path === '/account') {
      return <AccountPage navigate={navigate} />;
    }

    // /order-confirmation/:id
    if (path.startsWith('/order-confirmation/')) {
      return <OrderConfirmationPage path={path} navigate={navigate} />;
    }

    // / (home) — also covers /faqs (scrolls to the FAQ section above) and the
    // temporarily hidden /collections/all and /about.
    if (['/', '/faqs', '/collections/all', '/about'].includes(path.split('?')[0])) {
      return <HomePage navigate={navigate} />;
    }

    return <NotFoundPage navigate={navigate} />;
  };

  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-black flex flex-col">
          <Header navigate={navigate} currentPath={path} />
          <main className="flex-1">
            {/* Split pages are normally already downloaded (see main.tsx and
                routes.ts), so this fallback is rarely visible. */}
            <Suspense fallback={<div className="min-h-[60vh] bg-black" />}>{renderPage()}</Suspense>
          </main>
          <Footer navigate={navigate} />
          <CartDrawer navigate={navigate} />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
