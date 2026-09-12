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
  // Which slide indices have actually been given a real src yet. Starts
  // empty and grows as slides are shown (plus one slide ahead, prefetched
  // so the crossfade never shows a blank frame) instead of handing the
  // browser all 4 full-bleed hero images on page load — on a slow
  // connection that was by far the heaviest thing on the page.
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
    setProducts(shuffled.slice(0, 4));
  }, [allProducts]);

  useEffect(() => {
    if (products.length === 0) return;
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(current);
      next.add((current + 1) % products.length);
      return next;
    });
  }, [current, products.length]);

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
      {/* Slides */}
      {products.map((product, i) => (
        <div
          key={product.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {revealed.has(i) && (
            <img
              src={product.image_url}
              srcSet={product.image_srcset || undefined}
              sizes="100vw"
              alt={product.name}
              className="w-full h-full object-cover"
              fetchPriority={i === 0 ? 'high' : 'auto'}
              decoding={i === 0 ? 'sync' : 'async'}
            />
          )}
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
          <div className="text-center px-6 max-w-3xl">
            <p className="text-white/60 text-[11px] uppercase tracking-[0.3em] mb-4">Karachi, est. 2021</p>
            {/* whitespace-nowrap only applies from sm up — on mobile the
                headline needs to wrap onto two lines within the section's
                own px-6 padding, otherwise it was overflowing past both
                screen edges with no margin at all. */}
            <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-none sm:whitespace-nowrap">
              WORN IN, NOT WORN OUT
            </h1>
            <button
              onClick={() => navigate('/collections/batch-01')}
              className="inline-block bg-white text-black px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-all hover:scale-105 duration-300"
            >
              Shop BATCH 01
            </button>
          </div>
        </div>

        {/* Bottom: current product info */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 px-6 lg:px-10">
          {/* Stacks vertically and centered on mobile so "Now Showing" gets
              its own line above the slide controls, instead of being
              hidden entirely below the sm breakpoint. */}
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center sm:items-end justify-center sm:justify-between gap-3">
            <div className="max-w-xs text-center sm:text-left">
              <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Now Showing</p>
              <h3 className="text-white text-sm font-medium leading-tight mb-1">
                {products[current].name}
              </h3>
            </div>

            {/* Slide controls */}
            <div className="flex items-center gap-3">
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

            <div className="hidden sm:block sm:max-w-xs sm:flex-1" />
          </div>
        </div>
      </div>
    </section>
  );
}
