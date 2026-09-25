import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getOrders,
  getReviews,
  submitReview,
  updateMe,
  type OrderSummary,
  type ReviewSummary,
} from '@/lib/auth';
import { MailIcon, PointsIcon, ReceiveIcon, ReviewIcon, ShipIcon, StarIcon } from './AccountIcons';

interface PendingReview {
  productId: number;
  name: string;
  image: string | null;
  orderNumber: string;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1 text-white">
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <StarIcon size={onChange ? 26 : 14} filled={n <= value} />;
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={n + ' star' + (n === 1 ? '' : 's')}
            className="p-0.5 opacity-90 hover:opacity-100 transition-opacity"
          >
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </div>
  );
}

// Points, order status shortcuts, reviews and email preferences for the account page.
export default function AccountOverview() {
  const { user, token, refreshMe } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingOptin, setSavingOptin] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [o, r] = await Promise.all([getOrders(token), getReviews(token)]);
      setOrders(o);
      setReviews(r);
    } catch {
      // The order list below reports its own errors; this panel just stays empty.
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toShip = orders.filter((o) => o.stage === 'to_ship').length;
  const toReceive = orders.filter((o) => o.stage === 'to_receive').length;

  const pending = useMemo(() => {
    const seen = new Set<number>();
    const list: PendingReview[] = [];
    for (const o of orders) {
      if (o.stage !== 'delivered') continue;
      for (const it of o.items) {
        if (!it.product_id || it.reviewed || seen.has(it.product_id)) continue;
        seen.add(it.product_id);
        list.push({ productId: it.product_id, name: it.name, image: it.image, orderNumber: o.number });
      }
    }
    return list;
  }, [orders]);

  async function onSubmit(productId: number) {
    if (!token) return;
    if (rating < 1) {
      setError('Pick a star rating first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitReview(token, productId, rating, text);
      setOpenId(null);
      setRating(0);
      setText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your review. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleOptin(next: boolean) {
    if (!token) return;
    setSavingOptin(true);
    try {
      await updateMe(token, { marketing_optin: next });
      await refreshMe();
    } finally {
      setSavingOptin(false);
    }
  }

  const tiles = [
    { key: 'ship', label: 'To ship', count: toShip, Icon: ShipIcon, target: 'order-history' },
    { key: 'receive', label: 'To receive', count: toReceive, Icon: ReceiveIcon, target: 'order-history' },
    { key: 'review', label: 'To review', count: pending.length, Icon: ReviewIcon, target: 'account-reviews' },
  ];

  const label = 'text-white/60 text-[11px] uppercase tracking-[0.2em]';

  return (
    <>
      <section className="border border-white/10 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="text-white/80 shrink-0">
            <PointsIcon size={40} />
          </div>
          <div className="flex-1">
            <p className={label + ' mb-3'}>Your nors. points</p>
            <p className="text-white text-4xl font-medium tracking-tight leading-none">
              {(user?.points ?? 0).toLocaleString()}
            </p>
            <p className="text-white/50 text-xs leading-relaxed mt-4">
              Earn 1 point for every Rs. 10 on delivered orders. What can you do with them? We are revealing that soon,
              and you will hear it here first.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <p className={label}>My orders</p>
          <button
            onClick={() => scrollToId('order-history')}
            className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.15em] transition-colors"
          >
            View all
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tiles.map(({ key, label: name, count, Icon, target }) => (
            <button
              key={key}
              onClick={() => scrollToId(target)}
              className="group flex flex-col items-center gap-3 py-2 text-white/80 hover:text-white transition-colors"
            >
              <span className="relative">
                <Icon size={34} />
                {count > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[10px] font-medium flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              <span className="text-[11px] uppercase tracking-[0.15em] text-white/60 group-hover:text-white transition-colors">
                {name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="account-reviews" className="border border-white/10 p-6 mb-6 scroll-mt-28">
        <div className="flex items-center gap-3 mb-6 text-white/80">
          <StarIcon size={22} />
          <p className={label}>Your reviews</p>
        </div>

        {pending.length > 0 && (
          <div className="mb-8">
            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-4">Waiting for your review</p>
            <div className="divide-y divide-white/10">
              {pending.map((p) => (
                <div key={p.productId} className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-white/5 shrink-0 overflow-hidden">
                      {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{p.name}</p>
                      <p className="text-white/40 text-xs mt-1">Order #{p.orderNumber}</p>
                    </div>
                    <button
                      onClick={() => {
                        setOpenId(openId === p.productId ? null : p.productId);
                        setRating(0);
                        setText('');
                        setError(null);
                      }}
                      className="text-white/70 hover:text-white text-[11px] uppercase tracking-[0.15em] border-b border-white/20 hover:border-white pb-1 transition-colors whitespace-nowrap"
                    >
                      {openId === p.productId ? 'Cancel' : 'Write review'}
                    </button>
                  </div>
                  {openId === p.productId && (
                    <div className="mt-5 space-y-4">
                      <Stars value={rating} onChange={setRating} />
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        maxLength={1000}
                        placeholder="How does it fit? How does it feel? (optional)"
                        className="w-full bg-transparent border border-white/20 focus:border-white/50 text-white text-sm px-4 py-3 outline-none transition-colors placeholder:text-white/30 resize-none"
                      />
                      {error && <p className="text-red-400 text-xs">{error}</p>}
                      <button
                        onClick={() => void onSubmit(p.productId)}
                        disabled={saving}
                        className="bg-white text-black text-[11px] uppercase tracking-[0.2em] font-medium px-6 py-3 hover:bg-white/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Post review
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {reviews.length > 0 ? (
          <div className="divide-y divide-white/10">
            {reviews.map((r) => (
              <div key={r.id} className="py-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-white text-sm truncate">{r.product_name}</p>
                  <Stars value={r.rating} />
                </div>
                {r.text && <p className="text-white/60 text-sm leading-relaxed">{r.text}</p>}
                <p className="text-white/30 text-xs mt-2">{r.date ? new Date(r.date).toLocaleDateString() : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          pending.length === 0 && (
            <p className="text-white/40 text-sm">
              No reviews yet. Once an order is delivered, you can rate it here.
            </p>
          )
        )}
      </section>

      <section className="border border-white/10 p-6 mb-10">
        <label className="flex items-start gap-4 cursor-pointer select-none">
          <span className="text-white/70 shrink-0 mt-0.5">
            <MailIcon size={24} />
          </span>
          <span className="flex-1">
            <span className="block text-white text-sm mb-1">Promotional emails</span>
            <span className="block text-white/50 text-xs leading-relaxed">
              New drops, restocks and offers. Order updates always reach you either way.
            </span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(user?.marketing_optin)}
            disabled={savingOptin}
            onChange={(e) => void toggleOptin(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-white"
          />
        </label>
      </section>
    </>
  );
}
