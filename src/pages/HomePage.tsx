import { useEffect, useState } from 'react';
import { getProducts, peekHomeProducts, sameProducts } from '@/lib/woocommerce';
import type { Product } from '@/types';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import FAQAccordion from '@/components/FAQAccordion';

interface HomePageProps {
  navigate: (path: string) => void;
}

export default function HomePage({ navigate }: HomePageProps) {
  // Returning visitors: paint the list this browser saved last time right
  // away, then swap in the fresh one only if something actually changed (so
  // the hero doesn't re-shuffle for no reason).
  const [saved] = useState(() => peekHomeProducts());
  const [allProducts, setAllProducts] = useState<Product[]>(saved?.data ?? []);
  const [loading, setLoading] = useState(!saved);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Single fetch shared by Hero and the grid below — avoids two
      // concurrent cross-origin requests hitting the WooCommerce API on load.
      try {
        const { data } = await getProducts({ limit: 50 });
        if (cancelled) return;
        const fresh = data ?? [];
        setAllProducts((prev) => (sameProducts(prev, fresh) ? prev : fresh));
        setLoading(false);
      } catch {
        // Offline or the shop is briefly unreachable: keep showing the saved
        // list if there is one (otherwise the loading placeholder stays, as before).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = allProducts.slice(0, 4);

  return (
    <div className="bg-black">
      {/* Hero slideshow */}
      {loading ? (
        <div className="h-[100vh] bg-black animate-pulse" />
      ) : (
        <Hero navigate={navigate} products={allProducts} />
      )}

      {/* Featured products — one per row */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center mb-16">
            <p className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-3">
              BATCH 01 / Live Now
            </p>
            <h2 className="text-white text-3xl sm:text-4xl font-bold tracking-tight">
              Still Warm
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="w-full bg-neutral-900 animate-pulse" style={{ aspectRatio: '3/4' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {featured.map((product, i) => (
                <div key={product.id} className="w-full">
                  <ProductCard product={product} navigate={navigate} index={i} />
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-16">
            <button
              onClick={() => navigate('/collections/batch-01')}
              className="inline-block border border-white/30 text-white px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-white hover:text-black transition-all duration-300"
            >
              See the Full Batch
            </button>
          </div>
        </div>
      </section>

      {/* <LookbookCarousel /> hidden for now, image selection needs more work */}

      {/* FAQs — sits right before the global Footer (rendered in App.tsx) */}
      <FAQAccordion navigate={navigate} />
    </div>
  );
}
