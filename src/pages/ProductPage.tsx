import { useEffect, useMemo, useState } from 'react';
import { getProductBySlug, getProductSizes, getCollectionBySlug, peekProductHint } from '@/lib/woocommerce';
import type { Product, ProductSize, Collection } from '@/types';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';
import { pointsLabel } from '@/lib/points';
import { trackViewContent } from '@/lib/pixel';
import { ChevronLeft, ChevronRight, Check, ShoppingBag, X, ZoomIn, Share2, Link } from 'lucide-react';
import ProductAccordion from '@/components/ProductAccordion';
import ProductReviews, { ReviewsSkeleton } from '@/components/ProductReviews';

const SIZE_ORDER = [
  'xxs', '2xs', 'extra extra small', 'xs', 'extra small', 'x-small', 'extra-small',
  's', 'small', 'sm',
  'm', 'medium', 'md',
  'l', 'large', 'lg',
  'xl', 'extra large', 'x-large', 'extra-large',
  'xxl', '2xl', 'extra extra large', 'extra-extra-large',
  'xxxl', '3xl',
];

function sizeSortIndex(size: string): number {
  const norm = size.trim().toLowerCase();
  const idx = SIZE_ORDER.indexOf(norm);
  if (idx !== -1) return idx;

  // Compound sizes like "S/M", "S-M", or "L-XL" bundle two adjacent sizes
  // together — sort them between the two by averaging each part's index, so
  // e.g. "S-M" lands between S and M rather than falling through to the
  // unmatched bucket at the end (which is what happened before: only exact
  // single sizes were recognized, so "S-M" and "L-XL" both landed in that
  // bucket and kept whatever order the backend happened to return).
  if (/[/-]/.test(norm)) {
    const parts = norm.split(/[/-]/).map((p) => p.trim());
    const partIndexes = parts.map((p) => {
      const i = SIZE_ORDER.indexOf(p);
      return i === -1 ? SIZE_ORDER.length : i;
    });
    if (partIndexes.some((i) => i !== SIZE_ORDER.length)) {
      return partIndexes.reduce((a, b) => a + b, 0) / partIndexes.length;
    }
  }

  return SIZE_ORDER.length;
}

function sortSizes(list: ProductSize[]): ProductSize[] {
  return [...list].sort((a, b) => sizeSortIndex(a.size) - sizeSortIndex(b.size));
}

interface ProductPageProps {
  slug: string;
  navigate: (path: string) => void;
}

export default function ProductPage({ slug, navigate }: ProductPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  // What this product will look like (photo count, sections, name), so the
  // loading placeholder takes the same shape. Falls back to typical values.
  const hint = useMemo(() => peekProductHint(slug), [slug]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { addItem, openCart } = useCart();

  // Swipe between product photos via native horizontal scroll-snap rather
  // than hand-rolled touch math. A browser's own scroller already gives us
  // 60fps-tracked dragging, correct momentum/deceleration, edge rubber-band,
  // and automatic vertical-scroll fallback at the edges of the gesture — all
  // per-device-tuned by the OS, which a custom touchmove handler can only
  // ever approximate. The gallery is rendered twice (mobile layout, desktop
  // layout) and only one copy is ever visible at a given viewport width, so
  // every helper below targets every '.nors-gallery-scroll' node and skips
  // whichever copy is hidden (offsetWidth === 0) rather than relying on a
  // single ref that would only ever point at whichever copy mounted last.
  const scrollGalleryTo = (i: number, smooth = true) => {
    document.querySelectorAll<HTMLDivElement>('.nors-gallery-scroll').forEach((el) => {
      if (el.offsetWidth > 0) {
        el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      }
    });
  };

  // Keeps activeImage in sync with wherever the user actually scrolled to
  // (a swipe, a trackpad scroll, or a momentum settle) — scroll position is
  // the single source of truth; buttons and thumbnails just call
  // scrollGalleryTo and let this effect update the index once the browser
  // gets there.
  useEffect(() => {
    if (loading) return;
    const els = Array.from(document.querySelectorAll<HTMLDivElement>('.nors-gallery-scroll'));
    if (els.length === 0) return;

    let raf = 0;
    const onScroll = (e: Event) => {
      const el = e.currentTarget as HTMLDivElement;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setActiveImage((prev) => (i !== prev ? i : prev));
      });
    };
    els.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }));
    return () => {
      els.forEach((el) => el.removeEventListener('scroll', onScroll));
      cancelAnimationFrame(raf);
    };
  }, [loading]);

  // The lightbox mounts its own scroll copy fresh each time it opens, so it
  // needs to jump (no animation — this is restoring state, not a swipe) to
  // whatever image was active in the inline gallery.
  useEffect(() => {
    if (!lightboxOpen) return;
    requestAnimationFrame(() => scrollGalleryTo(activeImage, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setSelectedSize(null);
      setAdded(false);
      setActiveImage(0);
      setLightboxOpen(false);

      const prod = await getProductBySlug(slug);

      if (!prod) {
        setLoading(false);
        return;
      }

      setProduct(prod);

      const sizeData = await getProductSizes(prod.id);
      setSizes(sizeData ?? []);

      if (prod.collection?.slug) {
        const col = await getCollectionBySlug(prod.collection.slug);
        setCollection(col);
      }

      setLoading(false);
    })();
  }, [slug]);

  // Lock body scroll while the lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [lightboxOpen]);

  // Search-engine basics: per-product title, description and canonical.
  // Product structured data is NOT added here: scripts/prerender.mjs writes one
  // ProductGroup (with a per-size offer) into the HTML at build time. Adding a
  // second, simpler Product block here gave crawlers two conflicting answers.
  useEffect(() => {
    if (!product) return;
    const url = 'https://nors.com.pk/products/' + product.slug;
    document.title = product.name + ' | nors.';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = (product.name + '. ' + (product.description || '')).slice(0, 155);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = url;
    return () => {
      document.title = 'nors. | Official Site';
    };
  }, [product]);

  // A link like /products/<slug>?size=L (the variant URLs in the structured data)
  // opens with that size selected, if it is in stock.
  useEffect(() => {
    if (loading || sizes.length === 0) return;
    const wanted = new URLSearchParams(window.location.search).get('size')?.trim().toLowerCase();
    if (!wanted) return;
    const match = sizes.find((s) => s.in_stock && s.size.trim().toLowerCase() === wanted);
    if (match) setSelectedSize(match.size);
  }, [loading, sizes]);

  // Meta Pixel / Conversions API: one ViewContent per product page view.
  // Uses the same price the page charges (see isOnSale / handleAddToCart).
  useEffect(() => {
    if (!product) return;
    const onSale = product.compare_at_price !== null && product.compare_at_price < product.price;
    trackViewContent({
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: onSale ? product.compare_at_price! : product.price,
      currency: 'PKR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const isSoldOut = product ? !product.in_stock || product.badge === 'Sold Out' : false;
  const isOnSale =
    product && product.compare_at_price !== null && product.compare_at_price < product.price;

  const handleAddToCart = () => {
    if (!product || !selectedSize) return;
    addItem({
      productId: product.id,
      variantId: sizes.find((s) => s.size === selectedSize)?.id ?? product.id,
      name: product.name,
      slug: product.slug,
      price: isOnSale ? product.compare_at_price! : product.price,
      image_url: product.image_url,
      size: selectedSize,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 1000);
  };

  if (loading) {
    // Mirrors the real page's structure (breadcrumb row, then image and details,
    // stacked on mobile and side by side on desktop) so nothing moves on arrival.
    const photoCount = hint?.photos ?? 5;
    const sectionCount = hint?.sections ?? 3;
    // Real size labels when known (sorted and labelled like the real buttons);
    // otherwise three typical-width boxes.
    const sizeLabels: string[] = hint?.sizes?.length
      ? sortSizes(hint.sizes.map((x, i) => ({ id: String(i), product_id: '', size: x, in_stock: true, sort_order: i })))
          .map((x) => (x.size.toLowerCase().replace(/[^a-z]/g, '') === 'extralarge' ? 'X-Large' : x.size))
      : ['Medium', 'Large', 'X-Large'];
    const imageSkeleton = (
      <div className="flex flex-col gap-3 mb-8 lg:mb-0">
        <div className="w-full bg-neutral-900 animate-pulse" style={{ aspectRatio: '3/4' }} />
        {/* Thumbnail row: only products with more than one photo have it. */}
        {photoCount > 1 && (
          <div className="flex gap-2 overflow-hidden" aria-hidden="true">
            {Array.from({ length: photoCount }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-14 sm:w-16 bg-neutral-900 animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        )}
      </div>
    );
    // Block heights below are taken from the real page (measured), in the real
    // order, so the placeholder boxes sit where the content will appear.
    const bar = 'bg-neutral-900 animate-pulse';
    // Title: the real name when known (so it wraps exactly as it will), else
    // two bars, since this shop's product names are long. Then the price row.
    const titleSkeleton = (
      <div className="mb-4 lg:mb-0">
        {hint?.name ? (
          <div className="text-white text-2xl sm:text-3xl font-medium leading-tight mb-5">{hint.name}</div>
        ) : (
          <div className="h-[60px] sm:h-[75px] flex flex-col justify-around mb-5" aria-hidden="true">
            <div className={`h-[20px] sm:h-[26px] w-full ${bar}`} />
            <div className={`h-[20px] sm:h-[26px] w-2/3 ${bar}`} />
          </div>
        )}
        <div className="mb-8" aria-hidden="true">
          <div className={`h-7 w-1/4 ${bar}`} />
        </div>
      </div>
    );
    // Same structure as the real accordion: a top line, then one 49.67px row per section.
    const accordionSkeleton =
      sectionCount > 0 ? (
        <div className="border-t border-transparent" aria-hidden="true">
          {Array.from({ length: sectionCount }).map((_, i) => (
            <div key={i} className="h-[49.67px] flex items-center">
              <div className={`h-3 w-28 ${bar}`} />
            </div>
          ))}
        </div>
      ) : null;
    const sizeCtaSkeleton = (
      <div className="mb-8 lg:mb-0" aria-hidden="true">
        <div className="mb-8 mt-8">
          <h3 className="text-[11px] uppercase tracking-[0.18em] font-medium mb-3">
            <span className={`text-transparent ${bar}`}>Size</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {sizeLabels.map((l, i) => (
              <div
                key={i}
                className={`min-w-[3rem] px-4 py-3 text-[11px] uppercase tracking-[0.18em] font-medium border border-transparent text-transparent ${bar}`}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
        <div className={`w-full py-4 text-[11px] uppercase tracking-[0.2em] font-semibold text-transparent ${bar}`}>
          Select a Size
        </div>
      </div>
    );
    const reviewsSkeleton = <ReviewsSkeleton />;
    const shareSkeleton = (
      <div className="h-[58px] pt-6" aria-hidden="true">
        <div className={`h-3 w-32 ${bar}`} />
      </div>
    );
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 pt-8 pb-4">
          <div className="h-[17px] w-[130px] bg-neutral-900 animate-pulse" />
        </div>
        <div className="lg:hidden max-w-[1600px] mx-auto px-4 sm:px-6 pb-10 flex flex-col">
          {titleSkeleton}
          {imageSkeleton}
          {sizeCtaSkeleton}
          {accordionSkeleton}
          {reviewsSkeleton}
          {shareSkeleton}
        </div>
        <div className="hidden lg:grid max-w-[1600px] mx-auto px-6 lg:px-10 pb-16 lg:grid-cols-2 gap-8 lg:gap-16">
          {imageSkeleton}
          <div className="flex flex-col lg:pt-4">
            {titleSkeleton}
            {accordionSkeleton}
            {sizeCtaSkeleton}
            {reviewsSkeleton}
            {shareSkeleton}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black pt-20 flex flex-col items-center justify-center gap-6">
        <p className="text-white/50 text-sm">Product not found.</p>
        <button
          onClick={() => navigate('/collections/all')}
          className="text-white text-[11px] uppercase tracking-[0.2em] border-b border-white/30 pb-1 hover:border-white"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [product.image_url, product.image_url_2].filter(Boolean) as string[];

  const goPrev = () => {
    if (activeImage === 0) return;
    scrollGalleryTo(activeImage - 1);
  };
  const goNext = () => {
    if (activeImage === images.length - 1) return;
    scrollGalleryTo(activeImage + 1);
  };

  const titleBlock = (
    <div className="mb-4 lg:mb-0">
      <h1 className="text-white text-2xl sm:text-3xl font-medium leading-tight mb-5">
        {product.name}
      </h1>
      <div className="mb-8">
        {isOnSale ? (
          <div className="flex items-center gap-3">
            <span className="text-white text-lg">{formatPrice(product.compare_at_price!)}</span>
            <span className="text-white/40 text-base line-through">{formatPrice(product.price)}</span>
          </div>
        ) : (
          <span className="text-white text-lg">{formatPrice(product.price)}</span>
        )}
        {pointsLabel(isOnSale ? product.compare_at_price! : product.price, 'this piece') && (
          <p className="text-white/60 text-xs tracking-[0.05em] leading-relaxed mt-3">
            {pointsLabel(isOnSale ? product.compare_at_price! : product.price, 'this piece')}.
            Points are added once your order is delivered.
          </p>
        )}
      </div>
    </div>
  );

  const imagesBlock = (
    <div className="flex flex-col gap-3 mb-8 lg:mb-0">
      <div
        className="w-full bg-neutral-900 overflow-hidden relative group"
        style={{ aspectRatio: '3/4' }}
      >
        <div
          className="nors-gallery-scroll no-scrollbar flex h-full overflow-x-auto cursor-zoom-in"
          style={{ scrollSnapType: 'x mandatory' }}
          onClick={() => setLightboxOpen(true)}
          role="button"
          aria-label="View larger image"
        >
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={i === 0 ? product.name : ''}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always', width: '100%', flexShrink: 0 }}
              className="h-full object-cover"
            />
          ))}
        </div>
        <div className="absolute bottom-3 right-3 bg-black/60 text-white/90 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn size={14} strokeWidth={1.5} />
        </div>
        {product.badge && product.badge !== 'Sale' && (
          <span
            className={`absolute top-4 left-4 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold pointer-events-none ${
              product.badge === 'Sold Out'
                ? 'bg-black/80 text-white/80'
                : product.badge === 'Sale'
                ? 'bg-red-600 text-white'
                : 'bg-white text-black'
            }`}
          >
            {product.badge}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollGalleryTo(i)}
              className={`flex-shrink-0 w-14 sm:w-16 overflow-hidden bg-neutral-900 border transition-colors ${
                i === activeImage ? 'border-white' : 'border-transparent hover:border-white/30'
              }`}
              style={{ aspectRatio: '3/4' }}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={img}
                alt=""
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const sizeCtaBlock = (
    <div className="mb-8 lg:mb-0">
      <div className="mb-8 mt-8">
        <h3 className="text-white text-[11px] uppercase tracking-[0.18em] font-medium mb-3">
          Size
        </h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {sortSizes(sizes).map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selectedSize === s.size}
              aria-label={s.in_stock && !isSoldOut ? s.size : `${s.size}, sold out`}
              data-size={s.size}
              data-variation-id={s.id}
              data-availability={s.in_stock && !isSoldOut ? 'in_stock' : 'out_of_stock'}
              onClick={() => s.in_stock && setSelectedSize(s.size)}
              disabled={!s.in_stock || isSoldOut}
              className={`min-w-[3rem] px-4 py-3 text-[11px] uppercase tracking-[0.18em] font-medium border transition-all ${
                selectedSize === s.size
                  ? 'border-white bg-white text-black'
                  : s.in_stock && !isSoldOut
                  ? 'border-white/30 text-white hover:border-white'
                  : 'border-white/10 text-white/20 cursor-not-allowed line-through'
              }`}
            >
              {s.size.toLowerCase().replace(/[^a-z]/g, '') === 'extralarge' ? 'X-Large' : s.size}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        data-action="add-to-cart"
        onClick={handleAddToCart}
        disabled={!selectedSize || isSoldOut}
        className={`w-full py-4 text-[11px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
          !selectedSize || isSoldOut
            ? 'bg-neutral-800 text-white/30 cursor-not-allowed'
            : added
            ? 'bg-green-600 text-white'
            : 'bg-white text-black hover:bg-white/90'
        }`}
      >
        {isSoldOut ? (
          'Sold Out'
        ) : !selectedSize ? (
          'Select a Size'
        ) : added ? (
          <>
            <Check size={16} strokeWidth={2} />
            Added to Cart
          </>
        ) : (
          <>
            <ShoppingBag size={15} strokeWidth={1.5} />
            Add to Cart
          </>
        )}
      </button>
    </div>
  );

  const accordionBlock = (
    <ProductAccordion sections={product.accordion.filter((sec) => !/^reviews?$/i.test(sec.title.trim()))} />
  );
  const reviewsBlock = <ProductReviews productId={product.id} navigate={navigate} />;

  const shareBlock = (
    <div className="pt-3 border-t border-white/10">
      <div className="flex gap-8 text-white/60 text-[11px] uppercase tracking-[0.18em]">
        <button
          type="button"
          onClick={async () => {
            const shareData = { title: product.name, url: window.location.href };
            if (navigator.share) {
              try {
                await navigator.share(shareData);
                return;
              } catch {
                // Cancelled or unsupported target — fall back to copy.
              }
            }
            navigator.clipboard?.writeText(window.location.href);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
          className="flex items-center gap-2 py-3.5 uppercase hover:text-white active:text-white active:scale-[0.97] transition-[color,transform] duration-150"
        >
          <Share2 size={14} strokeWidth={1.5} />
          Share
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
          className="flex items-center gap-2 py-3.5 uppercase min-w-[7.5rem] hover:text-white active:text-white active:scale-[0.97] transition-[color,transform] duration-150"
        >
          <Link size={14} strokeWidth={1.5} />
          {linkCopied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Breadcrumb */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 pt-8 pb-4">
        <button
          onClick={() => navigate(collection ? `/collections/${collection.slug}` : '/collections/all')}
          className="flex items-center gap-2 text-white/50 hover:text-white text-[11px] uppercase tracking-[0.18em] transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
          {collection ? collection.name : 'All Products'}
        </button>
      </div>

      {/* Mobile layout: title -> images -> size/cta -> accordions -> share */}
      <div className="lg:hidden max-w-[1600px] mx-auto px-4 sm:px-6 pb-10 flex flex-col">
        {titleBlock}
        {imagesBlock}
        {sizeCtaBlock}
        {accordionBlock}
        {reviewsBlock}
{shareBlock}
      </div>

      {/* Desktop layout: images | title, accordions, size/cta, share */}
      <div className="hidden lg:grid max-w-[1600px] mx-auto px-6 lg:px-10 pb-16 lg:grid-cols-2 gap-8 lg:gap-16">
        {imagesBlock}
        <div className="flex flex-col lg:pt-4">
          {titleBlock}
          {accordionBlock}
          {sizeCtaBlock}
          {reviewsBlock}
{shareBlock}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4 sm:p-10"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Image area — takes whatever height is left after the footer
              band below, and centers the photo within it. */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center">
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 sm:left-8 text-white/70 hover:text-white transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={32} strokeWidth={1.5} />
              </button>
            )}

            <div
              className="nors-gallery-scroll no-scrollbar flex h-full w-full overflow-x-auto"
              style={{ scrollSnapType: 'x mandatory' }}
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  className="h-full w-full flex items-center justify-center flex-shrink-0"
                  style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
                >
                  <img
                    src={img}
                    alt={product.name}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 sm:right-8 text-white/70 hover:text-white transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={32} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Footer band — reserves the space between the photo and the
              bottom edge, and centers the close button (and the image
              counter) inside it, instead of pinning close to the top-right
              corner (awkward to reach one-handed) or the very bottom edge. */}
          <div className="flex-shrink-0 min-h-[15%] flex flex-col items-center justify-between gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={28} strokeWidth={1.5} />
            </button>
            {images.length > 1 && (
              <div className="text-white/50 text-xs uppercase tracking-[0.15em] pointer-events-none">
                {activeImage + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
