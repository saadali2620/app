import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts } from '@/lib/woocommerce';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/format';

interface HeroProps {
  navigate: (path: string) => void;
}

export default function Hero({ navigate }: HeroProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await getProducts({ limit: 4 });
      if (data) setProducts(data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (products.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % products.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [products.length]);

  if (loading) {
    return <div className="h-[100vh] bg-black animate-pulse" />;
  }

  if (products.length === 0) return null;

  const next = () => setCurrent((c) => (c + 1) % products.length);
  const prev = () => setCurrent((c) => (c - 1 + products.length) % products.length);

  return (
    <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden bg-black">
      {/* Slides */}
      {products.map((product, i) => (
        <div
          key={product.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top announcement */}
        <div className="pt-24 px-6 text-center">
          <span className="text-white/80 text-[11px] uppercase tracking-[0.25em]">
            BATCH 01 / MUTED — Limited Edition
          </span>
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-end justify-center pb-32">
          <div className="text-center px-6 max-w-2xl">
            <p className="text-white/60 text-[11px] uppercase tracking-[0.3em] mb-4">Karachi, since 2021</p>
            <h1 className="text-white text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-none">
              WORN IN, NOT WORN OUT
            </h1>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto">
              Heavyweight basics cut for daily life, not display. Small batches, considered fabric, made to last past the season.
            </p>
            <button
              onClick={() => navigate('/collections/batch-011')}
              className="inline-block bg-white text-black px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-all hover:scale-105 duration-300"
            >
              Shop BATCH 01
            </button>
          </div>
        </div>

        {/* Bottom: current product info */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 px-6 lg:px-10">
          <div className="max-w-[1600px] mx-auto flex items-end justify-between">
            <div className="hidden sm:block max-w-xs">
              <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Now Showing</p>
              <h3 className="text-white text-sm font-medium leading-tight mb-1">
                {products[current].name}
              </h3>
              <p className="text-white/60 text-sm">{formatPrice(products[current].price)}</p>
            </div>

            {/* Slide controls */}
            <div className="flex items-center gap-3 mx-auto sm:mx-0">
              <button
                onClick={prev}
                className="text-white/70 hover:text-white transition-colors p-2"
                aria-label="Previous slide"
              >
                <ChevronLeft size={22} strokeWidth={1.5} />
              </button>
              <div className="flex items-center gap-2">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-1 transition-all duration-300 ${
                      i === current ? 'w-8 bg-white' : 'w-4 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="text-white/70 hover:text-white transition-colors p-2"
                aria-label="Next slide"
              >
                <ChevronRight size={22} strokeWidth={1.5} />
              </button>
            </div>

            <div className="hidden sm:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
