import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';

interface CartDrawerProps {
  navigate: (path: string) => void;
}

export default function CartDrawer({ navigate }: CartDrawerProps) {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, totalItems } = useCart();

  const handleCheckout = () => {
    navigate('/checkout');
    closeCart();
  };

  // Critically-damped — this is a state toggle (tap to open/close), not a
  // live-dragged gesture, so no overshoot. Anchored to the right, since
  // that's where the cart icon lives — enter and exit share the same edge.
  const sheetSpring = { type: 'spring' as const, damping: 30, stiffness: 340 };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          {/* Backdrop — dims to focus since this is a modal task, not a
              parallel panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={closeCart}
          />

          {/* Drawer — materializes in from the right and fully unmounts on
              close, so it can never trap a click behind an invisible layer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={sheetSpring}
            className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-black border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} strokeWidth={1.5} className="text-white" />
                <h2 className="text-white text-sm uppercase tracking-[0.18em] font-medium">
                  Cart ({totalItems})
                </h2>
              </div>
              <button
                onClick={closeCart}
                className="text-white/60 hover:text-white active:scale-90 transition-all duration-100"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                <ShoppingBag size={48} strokeWidth={1} className="text-white/20" />
                <p className="text-white/50 text-sm">Your cart is empty</p>
                <button
                  onClick={() => {
                    closeCart();
                    navigate('/collections/all');
                  }}
                  className="text-white text-[11px] uppercase tracking-[0.18em] border-b border-white/30 pb-1 hover:border-white active:scale-95 transition-all duration-150"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="flex flex-col gap-5">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.size}`}
                        className="flex gap-4 pb-5 border-b border-white/5 last:border-0"
                      >
                        <button
                          onClick={() => {
                            closeCart();
                            navigate(`/products/${item.slug}`);
                          }}
                          className="flex-shrink-0 active:scale-95 transition-transform duration-100"
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-24 object-cover bg-white/5"
                          />
                        </button>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-white text-sm font-medium leading-tight">{item.name}</h3>
                            <p className="text-white/40 text-xs mt-1">Size: {item.size}</p>
                            <p className="text-white text-sm mt-1">{formatPrice(item.price)}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 border border-white/15">
                              <button
                                onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                                className="text-white/60 hover:text-white active:scale-90 active:text-white transition-all duration-100 p-1.5"
                              >
                                <Minus size={13} strokeWidth={1.5} />
                              </button>
                              <span className="text-white text-xs w-5 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                                className="text-white/60 hover:text-white active:scale-90 active:text-white transition-all duration-100 p-1.5"
                              >
                                <Plus size={13} strokeWidth={1.5} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.productId, item.size)}
                              className="text-white/40 hover:text-red-400 active:scale-90 transition-all duration-100"
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-sm uppercase tracking-[0.15em]">Subtotal</span>
                    <span className="text-white text-lg font-medium">{formatPrice(totalPrice)}</span>
                  </div>
                  <p className="text-white/40 text-xs">Shipping & taxes calculated at checkout.</p>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-white text-black py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all duration-150"
                  >
                    Checkout
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
