import type { Product } from '@/types';
import { formatPrice } from '@/lib/format';

interface ProductCardProps {
  product: Product;
  navigate: (path: string) => void;
  index?: number;
}

export default function ProductCard({ product, navigate, index = 0 }: ProductCardProps) {
  const isSoldOut = !product.in_stock || product.badge === 'Sold Out';
  const isOnSale = product.compare_at_price !== null && product.compare_at_price < product.price;

  return (
    <button
      onClick={() => navigate(`/products/${product.slug}`)}
      className="group block text-left w-full border border-white/10 bg-black relative overflow-hidden"
      style={{ aspectRatio: '3/4' }}
    >
      <img
        src={product.image_url}
        srcSet={product.image_srcset || undefined}
        sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        alt={product.name}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />

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

      {isSoldOut && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
          <span className="text-white text-sm uppercase tracking-[0.2em] font-medium border-b border-white/50 pb-1">
            Sold Out
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <h3 className="text-white text-sm font-medium leading-tight mb-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          {isOnSale ? (
            <>
              <span className="text-red-400 text-sm">{formatPrice(product.compare_at_price!)}</span>
              <span className="text-white/50 text-sm line-through">{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="text-white/90 text-sm">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
