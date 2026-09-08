import { useEffect } from 'react';
import { CartProvider } from '@/context/CartContext';
import { trackPageView } from '@/lib/pixel';
import { useRouter } from '@/hooks/useRouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import HomePage from '@/pages/HomePage';
import CatalogPage from '@/pages/CatalogPage';
import ProductPage from '@/pages/ProductPage';
import AboutPage from '@/pages/AboutPage';
import CheckoutPage from '@/pages/CheckoutPage';
import PolicyPage from '@/pages/PolicyPage';
import ContactPage from '@/pages/ContactPage';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage';
import TrackOrderPage from '@/pages/TrackOrderPage';

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

    // /about
    if (path === '/about') {
      return <AboutPage navigate={navigate} />;
    }

    // /checkout
    if (path === '/checkout') {
      return <CheckoutPage navigate={navigate} />;
    }

    // /track-order
    if (path === '/track-order') {
      return <TrackOrderPage navigate={navigate} />;
    }

    // /policies
    if (path === '/policies') {
      return <PolicyPage navigate={navigate} />;
    }

    // /contact
    if (path === '/contact') {
      return <ContactPage navigate={navigate} />;
    }

    // /order-confirmation/:id
    if (path.startsWith('/order-confirmation/')) {
      return <OrderConfirmationPage path={path} navigate={navigate} />;
    }

    // / (home)
    return <HomePage navigate={navigate} />;
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-black flex flex-col">
        <Header navigate={navigate} currentPath={path} />
        <main className="flex-1">{renderPage()}</main>
        <Footer navigate={navigate} />
        <CartDrawer navigate={navigate} />
      </div>
    </CartProvider>
  );
}

export default App;
