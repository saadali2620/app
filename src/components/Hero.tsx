import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types';

interface HeroProps {
  navigate: (path: string) => void;
  products: Product[];
}

export default function Hero({ navigate, products: allProducts }: HeroProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
    setProducts(shuffled.slice(0, 4));
  }, [allProducts]);

  useEffect(() => {
    if (products.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % products.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [products.length]);

  if (products.length === 0) {
    return <div className="h-[100vh] bg-black animate-pulse" />;
  }

  const next = () => setCurrent((c) => (c + 1) % products.length);
  const prev = () => setCurrent((c) => (c - 1 + products.length) % products.length);

  return (
    <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden bg-black">
      {/* Slides — crossfade + a slow Ken Burns scale so the resting slide
          settles to 1:1 while the incoming one starts slightly zoomed,
          giving the transition depth instead of a flat opacity swap. */}
      {products.map((product, i) => (
        <div
          key={product.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
              i === current ? 'scale-100' : 'scale-110'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top announcement */}
        <div className="pt-24 px-6 text-center">
          <span className="hero-intro inline-block text-white/80 text-[11px] uppercase tracking-[0.25em]">
            BATCH 01 / MUTED — Limited Edition
          </span>
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-end justify-center pb-32">
          <div className="text-center px-6 max-w-3xl">
            <p
              className="hero-intro text-white/60 text-[11px] uppercase tracking-[0.3em] mb-4"
              style={{ animationDelay: '80ms' }}
            >
              Karachi, est. 2021
            </p>
            <h1
              className="hero-intro text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-none whitespace-nowrap"
              style={{ animationDelay: '150ms' }}
            >
              WORN IN, NOT WORN OUT
            </h1>
            <button
              onClick={() => navigate('/collections/batch-01')}
              className="hero-intro inline-block bg-white text-black px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 active:scale-95 transition-all duration-150"
              style={{ animationDelay: '260ms' }}
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
            </div>

            {/* Slide controls */}
            <div className="flex items-center gap-3 mx-auto sm:mx-0">
              <button
                onClick={prev}
                className="text-white/70 hover:text-white active:scale-90 active:text-white transition-all duration-100 p-2"
                aria-label="Previous slide"
              >
                <ChevronLeft size={22} strokeWidth={1.5} />
              </button>
              <div className="flex items-center gap-2">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-1 transition-all duration-300 active:scale-y-150 ${
                      i === current ? 'w-8 bg-white' : 'w-4 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="text-white/70 hover:text-white active:scale-90 active:text-white transition-all duration-100 p-2"
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
