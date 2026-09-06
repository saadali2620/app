import { useEffect, useState } from 'react';
import { getProductBySlug, getProductSizes, getCollectionBySlug } from '@/lib/woocommerce';
import type { Product, ProductSize, Collection } from '@/types';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';
import { ChevronLeft, ChevronRight, Check, ShoppingBag, X, ZoomIn } from 'lucide-react';
import ProductAccordion from '@/components/ProductAccordion';

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
  return idx === -1 ? SIZE_ORDER.length : idx;
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
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { addItem, openCart } = useCart();

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
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 grid lg:grid-cols-2 gap-12">
          <div className="w-full bg-neutral-900 animate-pulse" style={{ aspectRatio: '3/4' }} />
          <div className="space-y-4">
            <div className="h-8 bg-neutral-900 animate-pulse w-3/4" />
            <div className="h-6 bg-neutral-900 animate-pulse w-1/3" />
            <div className="h-32 bg-neutral-900 animate-pulse" />
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

  const goPrev = () => setActiveImage((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveImage((i) => (i + 1) % images.length);

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
      </div>
    </div>
  );

  const imagesBlock = (
    <div className="flex flex-col gap-3 mb-8 lg:mb-0">
      <div
        className="w-full bg-neutral-900 overflow-hidden relative group cursor-zoom-in"
        style={{ aspectRatio: '3/4' }}
        onClick={() => setLightboxOpen(true)}
        role="button"
        aria-label="View larger image"
      >
        <img
          src={images[activeImage]}
          alt={product.name}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute bottom-3 right-3 bg-black/60 text-white/90 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={16} strokeWidth={1.5} />
        </div>
        {product.badge && product.badge !== 'Sale' && (
          <span
            className={`absolute top-4 left-4 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold ${
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
              onClick={() => setActiveImage(i)}
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
        <div className="flex flex-wrap gap-2">
          {sortSizes(sizes).map((s) => (
            <button
              key={s.id}
              onClick={() => s.in_stock && setSelectedSize(s.size)}
              disabled={!s.in_stock || isSoldOut}
              className={`min-w-[3rem] px-4 py-3 text-sm uppercase border transition-all ${
                selectedSize === s.size
                  ? 'border-white bg-white text-black'
                  : s.in_stock && !isSoldOut
                  ? 'border-white/30 text-white hover:border-white'
                  : 'border-white/10 text-white/20 cursor-not-allowed line-through'
              }`}
            >
              {s.size}
            </button>
          ))}
        </div>
      </div>

      <button
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

  const accordionBlock = <ProductAccordion sections={product.accordion} />;

  const shareBlock = (
    <div className="pt-8 mt-8 border-t border-white/10">
      <h3 className="text-white text-[11px] uppercase tracking-[0.18em] font-medium mb-4">
        Share
      </h3>
      <div className="flex gap-6 text-white/50 text-sm">
        <a
          href={`https://www.facebook.com/sharer.php?u=https://example.com/products/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Facebook
        </a>
        <a
          href={`https://twitter.com/share?url=https://example.com/products/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Twitter
        </a>
        <a
          href={`https://pinterest.com/pin/create/button/?url=https://example.com/products/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Pinterest
        </a>
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
          <ChevronLeft size={16} strokeWidth={1.5} />
          {collection ? collection.name : 'All Products'}
        </button>
      </div>

      {/* Mobile layout: title -> images -> size/cta -> accordions -> share */}
      <div className="lg:hidden max-w-[1600px] mx-auto px-4 sm:px-6 pb-20 flex flex-col">
        {titleBlock}
        {imagesBlock}
        {sizeCtaBlock}
        {accordionBlock}
        {shareBlock}
      </div>

      {/* Desktop layout: images | title, accordions, size/cta, share */}
      <div className="hidden lg:grid max-w-[1600px] mx-auto px-6 lg:px-10 pb-20 lg:grid-cols-2 gap-8 lg:gap-16">
        {imagesBlock}
        <div className="flex flex-col lg:pt-4">
          {titleBlock}
          {accordionBlock}
          {sizeCtaBlock}
          {shareBlock}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-10"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={28} strokeWidth={1.5} />
          </button>

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

          <img
            src={images[activeImage]}
            alt={product.name}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain"
          />

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

          {images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs uppercase tracking-[0.15em]">
              {activeImage + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
