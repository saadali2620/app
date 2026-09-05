import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';
import { clearWooCart, addToWooCart, submitWooCheckout, getPaymentMethods } from '@/lib/woocommerce';
import { useTurnstile } from '@/hooks/useTurnstile';
import { HoneypotField } from '@/components/HoneypotField';
import { Check } from 'lucide-react';

interface CheckoutPageProps {
  navigate: (path: string) => void;
}

export default function CheckoutPage({ navigate }: CheckoutPageProps) {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    phone: '',
  });
  const { containerRef: turnstileRef, token: turnstileToken, reset: resetTurnstile } = useTurnstile();
  const [honeypot, setHoneypot] = useState('');

  const shipping = totalPrice > 5000 ? 0 : 250;
  const grandTotal = totalPrice + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await clearWooCart();
      for (const item of items) {
        await addToWooCart(item.variantId, item.quantity);
      }

      const methods = await getPaymentMethods();
      const paymentMethod = methods.includes('payfast') ? 'payfast' : methods[0] ?? 'cod';

      const result = await submitWooCheckout(
        {
          first_name: form.firstName,
          last_name: form.lastName,
          address_1: form.address,
          city: form.city,
          email: form.email,
          phone: form.phone,
          country: 'PK',
        },
        paymentMethod,
        {
          turnstileToken,
          honeypot,
        }
      );

      if (result.payment_result?.redirect_url && paymentMethod !== 'cod' && paymentMethod !== 'bacs') {
        clearCart();
        window.location.href = result.payment_result.redirect_url;
        return;
      }

      clearCart();
      setSubmitted(true);
    } catch (err) {
      const code = (err as any)?.code;
      if (code === 'nors_turnstile_failed') {
        resetTurnstile();
        setError('We could not verify your browser. Please try again.');
      } else if (code === 'nors_honeypot_triggered') {
        setError('Something went wrong. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong placing your order.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black pt-20 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <Check size={32} strokeWidth={1.5} className="text-white" />
        </div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Order Confirmed</h1>
        <p className="text-white/60 text-sm max-w-md leading-relaxed">
          Thank you for your order. We'll send a confirmation email shortly. Due to high influx of
          orders, please bear with us as we navigate through each and all queries.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-white text-black px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black pt-20 flex flex-col items-center justify-center px-6 text-center gap-6">
        <h1 className="text-white text-2xl font-medium">Your cart is empty</h1>
        <button
          onClick={() => navigate('/collections/all')}
          className="text-white text-[11px] uppercase tracking-[0.2em] border-b border-white/30 pb-1 hover:border-white transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <h1 className="text-white text-3xl font-bold tracking-tight mb-10">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-white text-[11px] uppercase tracking-[0.18em] font-medium mb-4">
                Contact
              </h2>
              <input
                type="email"
                required
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <h2 className="text-white text-[11px] uppercase tracking-[0.18em] font-medium mb-4">
                Shipping Address
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                />
                <input
                  required
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                />
                <input
                  required
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="sm:col-span-2 bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                />
                <input
                  required
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                />
                <input
                  required
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-transparent border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div ref={turnstileRef} />
            <HoneypotField value={honeypot} onChange={setHoneypot} />

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white text-black py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Placing Order…' : \`Place Order — \${formatPrice(grandTotal)}\`}
            </button>
          </form>

          {/* Order summary */}
          <div className="lg:pl-8">
            <h2 className="text-white text-[11px] uppercase tracking-[0.18em] font-medium mb-4">
              Order Summary ({totalItems})
            </h2>
            <div className="border border-white/10 p-6 space-y-4">
              {items.map((item) => (
                <div key={\`\${item.productId}-\${item.size}\`} className="flex gap-4">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-20 object-cover bg-white/5"
                  />
                  <div className="flex-1">
                    <h3 className="text-white text-sm font-medium leading-tight">{item.name}</h3>
                    <p className="text-white/40 text-xs mt-1">Size: {item.size} / Qty: {item.quantity}</p>
                    <p className="text-white text-sm mt-1">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Shipping</span>
                  <span className="text-white">
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-white font-medium text-lg">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>

            <p className="text-white/40 text-xs mt-4 leading-relaxed">
              Free shipping on orders over Rs. 5,000. Powered by Cash on Delivery within Pakistan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
