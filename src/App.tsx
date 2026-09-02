import { CartProvider } from '@/context/CartContext';
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

function App() {
  const { route, navigate } = useRouter();
  const path = route.path;

  const renderPage = () => {
    // /products/:slug
    if (path.startsWith('/products/')) {
      const slug = path.replace('/products/', '');
      return <ProductPage slug={slug} navigate={navigate} />;
    }

    // /collections/:slug
    if (path.startsWith('/collections/')) {
      const slug = path.replace('/collections/', '');
      return <CatalogPage navigate={navigate} collectionSlug={slug} />;
    }

    // /about
    if (path === '/about') {
      return <AboutPage navigate={navigate} />;
    }

    // /checkout
    if (path === '/checkout') {
      return <CheckoutPage navigate={navigate} />;
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
