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

const VERIFY_TIMEOUT_MS = 20000;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * Mounts an invisible Turnstile widget and exposes the verification token.
 * Attach containerRef to a hidden <div> in the checkout form; the widget
 * verifies silently in the background and token populates once it passes.
 */
export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  // True when the check could not finish (script blocked, widget error, or no
  // token within the wait below). Lets the page say so instead of waiting forever.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      size: 'invisible',
      callback: (t: string) => {
        setToken(t);
        setFailed(false);
      },
      'error-callback': () => {
        setToken('');
        setFailed(true);
      },
      'expired-callback': () => setToken(''),
    });
  }, [ready]);

  const reset = useCallback(() => {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
      setToken('');
      setFailed(false);
    }
  }, []);

  // No token after this long counts as a failed check.
  useEffect(() => {
    if (token || failed) return;
    const t = window.setTimeout(() => setFailed(true), VERIFY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [token, failed]);

  return { containerRef, token, failed, reset };
}
