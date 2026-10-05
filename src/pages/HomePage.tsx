import { useEffect, useState } from 'react';
import { getProducts, peekHomeProducts, peekSeedProducts, sameProducts } from '@/lib/woocommerce';
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
    let gotFresh = false;
    // First-time visitors: the build-time copy of the list (a static file)
    // paints the page while the live list is still on its way.
    if (!saved) {
      peekSeedProducts({ limit: 50, sortBy: 'featured' }).then((seed) => {
        if (!seed || cancelled || gotFresh) return;
        setAllProducts(seed.data);
        setLoading(false);
      });
    }
    (async () => {
      // Single fetch shared by Hero and the grid below — avoids two
      // concurrent cross-origin requests hitting the WooCommerce API on load.
      try {
        const { data } = await getProducts({ limit: 50 });
        gotFresh = true;
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
        <div className="h-[100vh] min-h-[600px] bg-black animate-pulse" />
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
            // Same grid and card shape as the real products below, so nothing
            // moves when they arrive.
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-full">
                  <div className="w-full border border-white/10 bg-neutral-900 animate-pulse" style={{ aspectRatio: '3/4' }} />
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
