import { useEffect, useState } from 'react';
import { getProducts } from '@/lib/woocommerce';
import type { Product } from '@/types';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import FAQAccordion from '@/components/FAQAccordion';

interface HomePageProps {
  navigate: (path: string) => void;
}

export default function HomePage({ navigate }: HomePageProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Single fetch shared by Hero and the grid below — avoids two
      // concurrent cross-origin requests hitting the WooCommerce API on load.
      const { data } = await getProducts({ limit: 50 });
      setAllProducts(data ?? []);
      setLoading(false);
    })();
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

      {/* Brand story */}
      {/* Background image removed — was a hotlinked Pexels stock photo with
          no connection to the brand. A plain dark gradient reads cleaner
          than a placeholder shot of someone else's product. */}
      <section className="relative py-32 lg:py-40 overflow-hidden bg-gradient-to-b from-neutral-950 via-black to-black">
        <div className="relative max-w-2xl mx-auto text-center px-6">
          <p className="text-white/40 text-[11px] uppercase tracking-[0.3em] mb-6">est. 2021</p>
          <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-tight mb-8 leading-tight">
            Built for Both, Loyal to Neither
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Every batch is small on purpose. We'd rather sell out in a week than sit in a
            warehouse for a year. Fabric gets picked apart by hand before it's approved, cuts
            get argued over in the studio, and nothing ships until it's right — not just done.
            That's the whole operation, start to finish.
          </p>
          {/* "Read Our Story" button removed — it linked to /about, which is
              temporarily hidden site-wide. Re-add once About is back. */}
        </div>
      </section>

      {/* FAQs — sits right before the global Footer (rendered in App.tsx) */}
      <FAQAccordion navigate={navigate} />
    </div>
  );
}
