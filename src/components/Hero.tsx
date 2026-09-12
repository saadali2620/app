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
          {/* Slightly deeper at the very bottom than before (black/85 vs
              /70) so the "Now Showing" row stays readable without needing
              its own background panel — same look as desktop, just with
              enough contrast built into the photo treatment itself. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/85" />
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

        {/* Center content — same treatment as desktop, just scaled down on
            mobile (smaller type, tighter but not zero leading so a
            wrapped two-line headline has room to breathe) with enough
            reserved space below it that it can never crowd the bottom row. */}
        <div className="flex-1 flex items-end justify-center pb-40 sm:pb-32">
          <div className="text-center px-6 max-w-3xl">
            <p className="text-white/60 text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-3 sm:mb-4">Karachi, est. 2021</p>
            <h1 className="text-white text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 sm:mb-6 leading-tight sm:leading-none sm:whitespace-nowrap">
              WORN IN, NOT WORN OUT
            </h1>
            <button
              onClick={() => navigate('/collections/batch-01')}
              className="inline-block bg-white text-black px-8 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-all hover:scale-105 duration-300"
            >
              Shop BATCH 01
            </button>
          </div>
        </div>

        {/* Bottom: current product info — floating directly over the
            photo like desktop (no separate bar), just scaled down and
            with a fixed height reserved for the two-line max product name
            so it can't collide with anything above it. */}
        <div className="absolute bottom-0 left-0 right-0 pb-6 sm:pb-8 px-6 lg:px-10">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center sm:items-end justify-center sm:justify-between gap-2 sm:gap-3">
            <div className="max-w-xs text-center sm:text-left">
              <p className="text-white/50 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mb-1">Now Showing</p>
              <h3 className="text-white text-xs sm:text-sm font-medium leading-tight">
                {products[current].name}
              </h3>
            </div>

            {/* Slide controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={prev}
                className="text-white/70 hover:text-white transition-colors p-2"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} strokeWidth={1.5} className="sm:hidden" />
                <ChevronLeft size={22} strokeWidth={1.5} className="hidden sm:block" />
              </button>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-1 transition-all duration-300 ${
                      i === current ? 'w-6 sm:w-8 bg-white' : 'w-3 sm:w-4 bg-white/30 hover:bg-white/50'
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
                <ChevronRight size={20} strokeWidth={1.5} className="sm:hidden" />
                <ChevronRight size={22} strokeWidth={1.5} className="hidden sm:block" />
              </button>
            </div>

            <div className="hidden sm:block sm:max-w-xs sm:flex-1" />
          </div>
        </div>
      </div>
    </section>
  );
}
