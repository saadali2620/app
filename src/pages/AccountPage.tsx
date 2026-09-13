import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getOrders, type OrderSummary } from '@/lib/auth';
import { formatPrice } from '@/lib/format';

interface AccountPageProps {
  navigate: (path: string) => void;
}

export default function AccountPage({ navigate }: AccountPageProps) {
  const { user, token, loading, logout } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!token) return;
    getOrders(token)
      .then(setOrders)
      .finally(() => setOrdersLoading(false));
  }, [token]);

  if (loading || !user) {
    return <div className="min-h-screen bg-black pt-28" />;
  }

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-6">
      <div className="max-w-[700px] mx-auto">
        <div className="flex items-center justify-between mb-10 gap-4">
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-2">My Account</p>
            <h1 className="text-white text-2xl sm:text-3xl font-medium">
              {user.first_name ? `Hi, ${user.first_name}` : user.email}
            </h1>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.15em] border-b border-white/20 hover:border-white pb-1 transition-colors whitespace-nowrap"
          >
            Log Out
          </button>
        </div>

        {/* Points / store credit - the balance itself is real (comes from
            the account API and will move once earning/spending rules are
            added), the "coming soon" framing is just because there's no
            way to earn or redeem points yet. */}
        <div className="border border-white/10 p-6 mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">nors. points</p>
            <p className="text-white text-2xl font-medium">{user.points}</p>
          </div>
          <p className="text-white/30 text-xs max-w-[200px] text-right">
            Coming soon — earn points on every order.
          </p>
        </div>

        <h2 className="text-white/60 text-[11px] uppercase tracking-[0.2em] mb-4">Order History</h2>

        {ordersLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-white/50 text-sm py-10 text-center border border-white/10">No orders yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-white/10 border-t border-b border-white/10">
            {orders.map((order) => (
              <div key={order.id} className="py-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm font-medium mb-1">Order #{order.number}</p>
                  <p className="text-white/40 text-xs">
                    {order.date ? new Date(order.date).toLocaleDateString() : ''} · {order.items.length} item
                    {order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">{formatPrice(parseFloat(order.total))}</p>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.15em] mt-1">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
