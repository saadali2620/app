import { useState } from 'react';

interface TrackOrderPageProps {
  navigate: (path: string) => void;
}

const PHONE_PATTERN = /^(?:\+92|0)3\d{9}$/;

interface StatusEvent {
  code: string;
  message: string;
}

interface TrackResult {
  trackingNumber: string;
  orderRefNumber: string;
  status: string;
  statusHistory: StatusEvent[];
}

const TRACK_ENDPOINT = 'https://nors.com.pk/index.php?rest_route=/nors/v1/track-order';

export default function TrackOrderPage({ navigate }: TrackOrderPageProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!orderNumber.trim()) {
      setError('Enter your order number.');
      return;
    }
    if (!PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))) {
      setError('Enter the phone number used at checkout (e.g. 03001234567).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.found) {
        setError(data.message || 'We could not find that order. Check the order number and phone number and try again.');
        return;
      }

      setResult({
        trackingNumber: data.trackingNumber,
        orderRefNumber: data.orderRefNumber,
        status: data.status,
        statusHistory: data.statusHistory ?? [],
      });
    } catch (err) {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Track Order</h1>
        <p className="text-white/60 text-sm mb-10 leading-relaxed">
          Enter your order number and the phone number used at checkout to see your delivery status.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <input
            required
            placeholder="Order Number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
          />
          <input
            required
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Tracking…' : 'Track Order'}
          </button>
        </form>

        {result && (
          <div className="mt-12 border border-white/10 p-6">
            <p className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-1">Order {result.orderRefNumber}</p>
            <h2 className="text-white text-2xl font-bold tracking-tight mb-6">{result.status}</h2>

            <p className="text-white/40 text-xs uppercase tracking-[0.15em] mb-1">Tracking Number</p>
            <p className="text-white text-sm mb-8">{result.trackingNumber}</p>

            {result.statusHistory.length > 0 && (
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-[0.2em] mb-4">Journey</p>
                <div className="space-y-4">
                  {result.statusHistory.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 flex-shrink-0" />
                      <p className="text-white/80 text-sm leading-relaxed">{event.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-10 text-white text-[11px] uppercase tracking-[0.2em] border-b border-white/30 pb-1 hover:border-white transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
