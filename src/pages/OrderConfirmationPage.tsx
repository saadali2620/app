import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { flushPendingPurchase } from '@/lib/pixel';

interface OrderConfirmationPageProps {
  path: string;
  navigate: (path: string) => void;
}

function parseOrderConfirmation(path: string) {
  const withoutPrefix = path.replace('/order-confirmation/', '');
  const [idPart, queryPart] = withoutPrefix.split('?');
  const orderId = idPart || '';
  const params = new URLSearchParams(queryPart || '');
  const status = params.get('status') === 'success' ? 'success' : 'failed';
  return { orderId, status };
}

export default function OrderConfirmationPage({ path, navigate }: OrderConfirmationPageProps) {
  const { orderId, status } = parseOrderConfirmation(path);
  const isSuccess = status === 'success';

  // Card/online-gateway orders leave the site to pay, so their Purchase event
  // was stashed at checkout. Fire it now that payment is confirmed.
  useEffect(() => {
    if (isSuccess) flushPendingPurchase();
  }, [isSuccess]);

  return (
    <div className="min-h-screen bg-black pt-20 flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSuccess ? 'bg-white/10' : 'bg-red-500/10'}`}>
        {isSuccess ? (
          <Check size={32} strokeWidth={1.5} className="text-white" />
        ) : (
          <X size={32} strokeWidth={1.5} className="text-red-400" />
        )}
      </div>
      <h1 className="text-white text-3xl font-bold tracking-tight">
        {isSuccess ? 'Order Confirmed' : 'Payment Failed'}
      </h1>
      <p className="text-white/60 text-sm max-w-md leading-relaxed">
        {isSuccess
          ? `Thank you for your order${orderId ? ` #${orderId}` : ''}. We'll send a confirmation email shortly. Due to high influx of orders, please bear with us as we navigate through each and all queries.`
          : "Your payment could not be completed. You haven't been charged. Please try again or choose a different payment method at checkout."}
      </p>
      <button
        onClick={() => navigate(isSuccess ? '/' : '/checkout')}
        className="mt-4 bg-white text-black px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 transition-colors"
      >
        {isSuccess ? 'Back to Home' : 'Try Again'}
      </button>
    </div>
  );
}
