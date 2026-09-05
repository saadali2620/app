import { useEffect, useState } from 'react';
import { getProducts } from '@/lib/woocommerce';
import type { Product } from '@/types';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';

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
              Latest Drops
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
              onClick={() => navigate('/collections/all')}
              className="inline-block border border-white/30 text-white px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-white hover:text-black transition-all duration-300"
            >
              View All Products
            </button>
          </div>
        </div>
      </section>

      {/* <LookbookCarousel /> hidden for now, image selection needs more work */}

      {/* Brand story */}
      <section className="relative py-32 lg:py-40 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/10077947/pexels-photo-10077947.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-black" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center px-6">
          <p className="text-white/40 text-[11px] uppercase tracking-[0.3em] mb-6">est. 2021</p>
          <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-tight mb-8 leading-tight">
            The Grey Area Between Fashion and Streetwear
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10">
            Limited edition seasonal collections embracing the current culture. Locally sourced with
            an obsessive attention to fit, fabric and fabrication. Designed in Karachi, proudly made
            in Pakistan.
          </p>
          <button
            onClick={() => navigate('/about')}
            className="text-white text-[11px] uppercase tracking-[0.2em] border-b border-white/30 pb-1 hover:border-white transition-colors"
          >
            Read Our Story
          </button>
        </div>
      </section>
    </div>
  );
}
