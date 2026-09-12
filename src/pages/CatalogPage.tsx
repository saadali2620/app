import { useEffect, useState } from 'react';
import { getProducts, getCollectionBySlug } from '@/lib/woocommerce';
import type { Product, Collection } from '@/types';
import ProductCard from '@/components/ProductCard';

interface CatalogPageProps {
  navigate: (path: string) => void;
  collectionSlug?: string;
}

// Sort UI is hidden for now (customer-facing dropdown removed on request) but
// the underlying getProducts(sortBy) plumbing in woocommerce.ts still works,
// so a dropdown can be re-added later without rebuilding anything. Products
// always show in the order set via the "Sorting" button on the WordPress
// Products list (WooCommerce's menu_order field) — that's the 'featured' sort.

export default function CatalogPage({ navigate, collectionSlug }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 8;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    setPage(1);
  }, [collectionSlug]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      if (collectionSlug && collectionSlug !== 'all') {
        const col = await getCollectionBySlug(collectionSlug);
        setCollection(col);

        if (col) {
          const { data, count } = await getProducts({
            limit: pageSize,
            offset: (page - 1) * pageSize,
            category: col.id,
            sortBy: 'featured',
          });
          setTotalCount(count);
          setProducts(data);
        } else {
          setProducts([]);
          setTotalCount(0);
        }
      } else {
        setCollection(null);
        const { data, count } = await getProducts({
          limit: pageSize,
          offset: (page - 1) * pageSize,
          sortBy: 'featured',
        });
        setTotalCount(count);
        setProducts(data);
      }

      setLoading(false);
    })();
  }, [collectionSlug, page]);

  // Blank while loading rather than defaulting to 'Products' — avoids a
  // flash of the wrong title before the actual collection name arrives.
  const title = loading ? '' : collection ? collection.name : 'Products';
  const subtitle = collection?.tagline;

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Page header */}
      <div className="px-6 lg:px-10 pt-16 pb-12 text-center">
        <h1 className="text-white text-4xl sm:text-5xl font-bold tracking-tight mb-3 uppercase">{title}</h1>
        {subtitle && (
          <p className="text-white/50 text-sm uppercase tracking-[0.2em]">{subtitle}</p>
        )}
        {collection?.description && (
          <p className="text-white/60 text-sm leading-relaxed max-w-xl mx-auto mt-4">
            {collection.description}
          </p>
        )}
      </div>

      {/* Products — one per row, full width */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="w-full bg-neutral-900 animate-pulse" style={{ aspectRatio: '3/4' }} />
                <div className="space-y-4">
                  <div className="h-6 bg-neutral-900 animate-pulse w-3/4" />
                  <div className="h-5 bg-neutral-900 animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50 text-sm">Nothing here right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {products.map((product, i) => (
              <div key={product.id} className="w-full">
                <ProductCard product={product} navigate={navigate} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-20">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm uppercase tracking-[0.15em] transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center text-sm transition-colors ${
                    page === i + 1
                      ? 'bg-white text-black font-medium'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm uppercase tracking-[0.15em] transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
