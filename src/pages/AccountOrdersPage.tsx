import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOrders, submitReview, type OrderSummary } from '@/lib/auth';
import { StarIcon } from '@/components/account/AccountIcons';

export type OrdersView = 'to-ship' | 'to-receive' | 'to-review';

const META: Record<OrdersView, { title: string; blurb: string; empty: string }> = {
  'to-ship': {
    title: 'To ship',
    blurb: 'Orders we are getting ready to send.',
    empty: 'Nothing waiting to ship.',
  },
  'to-receive': {
    title: 'To receive',
    blurb: 'Orders on their way to you.',
    empty: 'Nothing on its way right now.',
  },
  'to-review': {
    title: 'To review',
    blurb: 'Delivered pieces you have not reviewed yet.',
    empty: 'You have reviewed everything you received.',
  },
};

const label = 'text-white/60 text-[11px] uppercase tracking-[0.2em]';

function price(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? 'Rs. ' + n.toLocaleString('en-PK') : v;
}

interface Pending {
  productId: number;
  name: string;
  image: string | null;
  orderNumber: string;
}

interface Props {
  view: OrdersView;
  navigate: (path: string) => void;
}

// Sub-pages behind the To ship / To receive / To review shortcuts on the account page.
export default function AccountOrdersPage({ view, navigate }: Props) {
  const { user, token, loading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders(await getOrders(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your orders.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo<Pending[]>(() => {
    const seen = new Set<number>();
    const out: Pending[] = [];
    for (const o of orders ?? []) {
      if (o.stage !== 'delivered') continue;
      for (const it of o.items) {
        if (!it.product_id || it.reviewed || seen.has(it.product_id)) continue;
        seen.add(it.product_id);
        out.push({ productId: it.product_id, name: it.name, image: it.image, orderNumber: o.number });
      }
    }
    return out;
  }, [orders]);

  const stage = view === 'to-ship' ? 'to_ship' : 'to_receive';
  const list = (orders ?? []).filter((o) => o.stage === stage);

  async function send(productId: number) {
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
      setThanks(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your review. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const meta = META[view];

  if (loading || !user) return <div className="min-h-screen bg-black pt-28" />;

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-6">
      <div className="max-w-[700px] mx-auto">
        <button
          onClick={() => navigate('/account')}
          className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.2em] mb-8 transition-colors"
        >
          &larr; My account
        </button>
        <h1 className="text-white text-2xl sm:text-3xl font-medium mb-2">{meta.title}</h1>
        <p className="text-white/50 text-sm mb-10">{meta.blurb}</p>

        {thanks && view === 'to-review' && (
          <p className="text-white/80 text-sm border border-white/10 p-4 mb-6">Thank you. Your review is live.</p>
        )}
        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {orders === null && !error && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          </div>
        )}

        {orders !== null && view !== 'to-review' && (
          <>
            {list.length === 0 && <p className="text-white/40 text-sm text-center py-16">{meta.empty}</p>}
            {list.map((o) => (
              <section key={o.id} className="border border-white/10 p-5 mb-4">
                <div className="flex items-baseline justify-between mb-4">
                  <p className="text-white text-base">Order #{o.number}</p>
                  <p className="text-white text-sm">{price(o.total)}</p>
                </div>
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    {it.image && <img src={it.image} alt="" className="w-14 h-[84px] object-cover bg-white/5" />}
                    <div>
                      <p className="text-white text-sm">{it.name}</p>
                      <p className={label}>Qty {it.quantity}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-4">
                  <p className={label}>{o.date ? new Date(o.date).toLocaleDateString() : ''}</p>
                  <button
                    onClick={() => navigate('/track-order')}
                    className="text-white/60 hover:text-white text-[11px] uppercase tracking-[0.2em] border-b border-white/20 pb-1"
                  >
                    Track order
                  </button>
                </div>
              </section>
            ))}
          </>
        )}

        {orders !== null && view === 'to-review' && (
          <>
            {pending.length === 0 && <p className="text-white/40 text-sm text-center py-16">{meta.empty}</p>}
            {pending.map((p) => (
              <section key={p.productId} className="border border-white/10 p-5 mb-4">
                <div className="flex items-center gap-4">
                  {p.image && <img src={p.image} alt="" className="w-14 h-[84px] object-cover bg-white/5" />}
                  <div className="flex-1">
                    <p className="text-white text-sm">{p.name}</p>
                    <p className={label}>Order #{p.orderNumber}</p>
                  </div>
                  {openId !== p.productId && (
                    <button
                      onClick={() => {
                        setOpenId(p.productId);
                        setRating(0);
                        setText('');
                        setError(null);
                        setThanks(false);
                      }}
                      className="bg-white text-black text-[11px] uppercase tracking-[0.2em] px-4 py-3"
                    >
                      Write review
                    </button>
                  )}
                </div>
                {openId === p.productId && (
                  <div className="mt-5">
                    <div className="flex items-center gap-1 text-white mb-4">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setRating(n)} aria-label={n + ' stars'}>
                          <StarIcon size={26} filled={n <= rating} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="How does it fit and feel?"
                      className="w-full bg-transparent border border-white/20 text-white text-sm p-3 mb-4 outline-none focus:border-white"
                    />
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => void send(p.productId)}
                        disabled={saving}
                        className="bg-white text-black text-[11px] uppercase tracking-[0.2em] px-5 py-3 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Submit review'}
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.2em]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
