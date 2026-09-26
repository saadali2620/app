import { useEffect, useState } from 'react';
import { StarIcon } from '@/components/account/AccountIcons';

const BASE: string = import.meta.env.VITE_WC_BASE_URL || '/index.php?rest_route=/wc/store/v1';

interface Review {
  id: number;
  product_id: number;
  product_name: string;
  reviewer: string;
  review: string;
  rating: number;
  verified: boolean;
  date_created_gmt: string;
}

// Store API returns HTML-escaped text; turn it back into plain text.
function plain(s: string): string {
  const t = document.createElement('textarea');
  t.innerHTML = s.replace(/<[^>]+>/g, '');
  return t.value.trim();
}

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <div className="flex items-center gap-1 text-white" aria-label={value + ' out of 5 stars'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= Math.round(value)} />
      ))}
    </div>
  );
}

async function get(path: string): Promise<Review[]> {
  const r = await fetch(BASE + path);
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

interface Props {
  productId: string | number;
  navigate: (path: string) => void;
}

// Star average for this product plus the three newest reviews across the store.
export default function ProductReviews({ productId, navigate }: Props) {
  const [mine, setMine] = useState<Review[] | null>(null);
  const [recent, setRecent] = useState<Review[]>([]);

  useEffect(() => {
    let live = true;
    setMine(null);
    Promise.all([
      get('/products/reviews&product_id=' + productId + '&per_page=100'),
      get('/products/reviews&per_page=3&order=desc&orderby=date_gmt'),
    ])
      .then(([m, r]) => {
        if (!live) return;
        setMine(m);
        setRecent(r);
      })
      .catch(() => {
        if (live) setMine([]);
      });
    return () => {
      live = false;
    };
  }, [productId]);

  if (mine === null) return null;

  const avg = mine.length ? mine.reduce((s, r) => s + r.rating, 0) / mine.length : 0;

  return (
    <section className="py-8 border-t border-white/10">
      <p className="text-white text-[11px] uppercase tracking-[0.18em] font-medium mb-5">Reviews</p>

      <div className="flex items-center gap-4 mb-2">
        <span className="text-white text-4xl font-medium leading-none">{mine.length ? avg.toFixed(1) : '-'}</span>
        <div>
          <Stars value={avg} size={18} />
          <p className="text-white/50 text-xs mt-1">
            {mine.length ? 'Based on ' + mine.length + (mine.length === 1 ? ' review' : ' reviews') : 'No reviews yet'}
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/account/to-review')}
        className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.15em] border-b border-white/20 pb-1 mb-8 transition-colors"
      >
        Bought this? Review it
      </button>

      {recent.length > 0 && (
        <>
          <p className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-4">Latest from our customers</p>
          {recent.map((r) => (
            <article key={r.id} className="border-b border-white/10 py-4 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <Stars value={r.rating} size={13} />
                <span className="text-white/40 text-xs">{new Date(r.date_created_gmt + 'Z').toLocaleDateString()}</span>
              </div>
              <p className="text-white/80 text-sm leading-relaxed mb-2">{plain(r.review)}</p>
              <p className="text-white/40 text-xs">
                {r.reviewer}
                {r.verified ? ' · Verified purchase' : ''} · {plain(r.product_name)}
              </p>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
