import { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

interface HeaderProps {
  navigate: (path: string) => void;
  currentPath: string;
}

export default function Header({ navigate, currentPath }: HeaderProps) {
  const { totalItems, openCart } = useCart();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "Shop All" (the general catalog) and "About" are temporarily hidden
  // site-wide — see App.tsx routing guard too. BATCH 01 stays, since it's
  // the current drop.
  const navLinks = [
    { label: 'BATCH 01', path: '/collections/batch-01' },
    { label: 'Track Order', path: '/track-order' },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-black/95 backdrop-blur-md py-3 shadow-lg shadow-black/20'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden text-white"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>

          {/* Desktop nav left */}
          <nav className="hidden lg:flex items-center gap-7 flex-1">
            {navLinks.slice(0, 1).map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`text-[11px] uppercase tracking-[0.18em] font-medium transition-colors duration-300 ${
                  isActive(link.path) ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Logo center */}
          <button
            onClick={() => navigate('/')}
            className="absolute left-1/2 -translate-x-1/2 select-none flex-shrink-0"
          >
            <img
              src="https://nors.com.pk/enterprise/wp-content/uploads/2026/08/nors-updated-logo-resized-300-px-width-white.svg"
              alt="nors."
              className="h-6 sm:h-7 w-auto"
            />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-5 flex-1 justify-end">
            <nav className="hidden lg:flex items-center gap-7">
              {navLinks.slice(1).map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`text-[11px] uppercase tracking-[0.18em] font-medium transition-colors duration-300 ${
                    isActive(link.path) ? 'text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <button
              onClick={() => navigate(user ? '/account' : '/login')}
              className="text-white transition-transform hover:scale-110 duration-300"
              aria-label={user ? 'My Account' : 'Log In'}
            >
              <User size={20} strokeWidth={1.5} />
            </button>

            <button
              onClick={openCart}
              className="relative text-white transition-transform hover:scale-110 duration-300"
              aria-label="Open cart"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-500 ${
          menuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div
          className={`absolute left-0 top-0 bottom-0 w-[75%] max-w-[320px] bg-black border-r border-white/10 p-8 flex flex-col transition-transform duration-500 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-12">
            <span className="text-white font-bold tracking-[0.3em] text-lg">nors.</span>
            <button onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white">
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
          <nav className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setMenuOpen(false);
                }}
                className={`text-sm uppercase tracking-[0.18em] font-medium text-left transition-colors ${
                  isActive(link.path) ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
          <button
              onClick={() => {
                navigate(user ? '/account' : '/login');
                setMenuOpen(false);
              }}
              className={`text-sm uppercase tracking-[0.18em] font-medium text-left transition-colors ${
                isActive('/account') || isActive('/login') ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {user ? 'My Account' : 'Log In'}
            </button>
          </nav>
          <div className="mt-auto pt-8 border-t border-white/10">
            <p className="text-white/40 text-[11px] uppercase tracking-[0.15em]">Designed in Karachi</p>
            <p className="text-white/40 text-[11px] uppercase tracking-[0.15em]">Proudly made in Pakistan</p>
          </div>
        </div>
      </div>
    </>
  );
}
