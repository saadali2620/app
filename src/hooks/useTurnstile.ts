import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

// Prefer the env var (set VITE_TURNSTILE_SITE_KEY in Vercel), falls back to the
// live key so local dev / preview branches without the env var still work.
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '0x4AAAAAAEpPaxvM-BXh-ahF';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * Mounts an invisible Turnstile widget and exposes the verification token.
 * Attach \`containerRef\` to a hidden <div> in the checkout form; the widget
 * verifies silently in the background and \`token\` populates once it passes.
 */
export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (document.querySelector(\`script[src="\${SCRIPT_SRC}"]\`)) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      size: 'invisible',
      callback: (t: string) => setToken(t),
      'error-callback': () => setToken(''),
      'expired-callback': () => setToken(''),
    });
  }, [ready]);

  const reset = useCallback(() => {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
      setToken('');
    }
  }, []);

  return { containerRef, token, reset };
}
