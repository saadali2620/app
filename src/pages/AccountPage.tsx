import { useEffect, useState } from 'react';
import { Pencil, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOrders, updateMe, type OrderSummary } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import AccountOverview from '@/components/account/AccountOverview';

interface AccountPageProps {
  navigate: (path: string) => void;
}

interface StatusEvent {
  code: string;
  message: string;
}

interface TrackState {
  loading: boolean;
  error: string | null;
  status: string | null;
  statusHistory: StatusEvent[];
}

const TRACK_ENDPOINT = 'https://nors.com.pk/enterprise/index.php?rest_route=/nors/v1/track-order';

export default function AccountPage({ navigate }: AccountPageProps) {
  const { user, token, loading, logout, refreshMe } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [tracking, setTracking] = useState<Record<number, TrackState>>({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  function startEditingProfile() {
    setProfileError(null);
    setEditingProfile(true);
  }

  function cancelEditingProfile() {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      });
    }
    setProfileError(null);
    setEditingProfile(false);
  }

  async function saveProfile() {
    if (!token) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateMe(token, profileForm);
      await refreshMe();
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save your changes. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function toggleTracking(order: OrderSummary) {
    if (tracking[order.id]) {
      setTracking((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      return;
    }

    setTracking((prev) => ({
      ...prev,
      [order.id]: { loading: true, error: null, status: null, statusHistory: [] },
    }));

    if (!user?.phone) {
      setTracking((prev) => ({
        ...prev,
        [order.id]: {
          loading: false,
          error: 'Add a phone number to your profile to enable tracking.',
          status: null,
          statusHistory: [],
        },
      }));
      return;
    }

    try {
      const res = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.number, phone: user.phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.found) {
        throw new Error(data.message || 'Could not find tracking for this order.');
      }

      setTracking((prev) => ({
        ...prev,
        [order.id]: {
          loading: false,
          error: null,
          status: data.status || null,
          statusHistory: data.statusHistory || [],
        },
      }));
    } catch (err) {
      setTracking((prev) => ({
        ...prev,
        [order.id]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Could not fetch tracking status.',
          status: null,
          statusHistory: [],
        },
      }));
    }
  }

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

        <AccountOverview />

        <div className="border border-white/10 p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <p className="text-white/60 text-[11px] uppercase tracking-[0.2em]">Profile</p>
            {!editingProfile && (
              <button
                onClick={startEditingProfile}
                className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.15em] flex items-center gap-1.5 transition-colors"
              >
                <Pencil size={12} strokeWidth={1.5} />
                Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-[0.15em] mb-1.5 block">First Name</label>
                  <input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full bg-transparent border border-white/20 text-white text-sm px-3 py-2 focus:border-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-[0.15em] mb-1.5 block">Last Name</label>
                  <input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full bg-transparent border border-white/20 text-white text-sm px-3 py-2 focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-[0.15em] mb-1.5 block">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="03001234567"
                  className="w-full bg-transparent border border-white/20 text-white text-sm px-3 py-2 focus:border-white focus:outline-none transition-colors"
                />
              </div>
              {profileError && <p className="text-red-400 text-xs">{profileError}</p>}
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="bg-white text-black text-[11px] uppercase tracking-[0.15em] font-semibold px-5 py-2.5 hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEditingProfile}
                  disabled={profileSaving}
                  className="text-white/50 hover:text-white text-[11px] uppercase tracking-[0.15em] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.15em] mb-1">Name</p>
                <p className="text-white text-sm">
                  {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : '—'}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.15em] mb-1">Phone</p>
                <p className="text-white text-sm">{user.phone || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-white/40 text-[10px] uppercase tracking-[0.15em] mb-1">Email</p>
                <p className="text-white text-sm">{user.email}</p>
              </div>
            </div>
          )}
        </div>

        <h2 id="order-history" className="text-white/60 text-[11px] uppercase tracking-[0.2em] mb-4 scroll-mt-28">Order History</h2>

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
            {orders.map((order) => {
              const track = tracking[order.id];
              return (
                <div key={order.id} className="py-5">
                  <div className="flex items-center justify-between gap-4">
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

                  <button
                    onClick={() => toggleTracking(order)}
                    className="mt-3 text-white/50 hover:text-white text-[11px] uppercase tracking-[0.15em] flex items-center gap-1.5 transition-colors"
                  >
                    {track ? 'Hide Tracking' : 'Track Order'}
                    <ChevronDown
                      size={13}
                      strokeWidth={1.5}
                      className={`transition-transform ${track ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {track && (
                    <div className="mt-3 bg-neutral-900/60 p-4">
                      {track.loading ? (
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Loader2 size={14} className="animate-spin" />
                          Fetching tracking status…
                        </div>
                      ) : track.error ? (
                        <p className="text-white/50 text-xs">{track.error}</p>
                      ) : (
                        <div>
                          {track.status && (
                            <p className="text-white text-sm font-medium mb-3">{track.status}</p>
                          )}
                          {track.statusHistory.length > 0 && (
                            <div className="space-y-3">
                              {track.statusHistory.map((event, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 flex-shrink-0" />
                                  <p className="text-white/80 text-sm leading-relaxed">{event.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
