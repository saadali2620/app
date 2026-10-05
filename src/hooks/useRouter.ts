import { useEffect, useState, useCallback, useRef } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
}

// The same build is served at the domain root and from the /enterprise copy.
const BASE = /^\/enterprise(\/|$)/.test(window.location.pathname) ? '/enterprise' : '';

// Route path = pathname (minus BASE, no trailing slash) + query string.
function parsePath(): Route {
  let pathname = window.location.pathname;
  if (BASE && pathname.startsWith(BASE)) pathname = pathname.slice(BASE.length);
  pathname = pathname.replace(/\/+$/, '') || '/';
  return { path: pathname + window.location.search, params: {} };
}

/** The route path (no /enterprise prefix, no trailing slash) for the current URL. */
export function currentRoutePath(): string {
  return parsePath().path;
}

// Old links look like /#/login. Rewrite them once to /login.
function migrateHash() {
  const h = window.location.hash;
  if (h.startsWith('#/')) {
    window.history.replaceState(null, '', BASE + h.slice(1));
  }
}

// Remembers scroll position per path so navigating back restores where the
// user left off, while a fresh navigation always starts at the top.
const scrollPositions = new Map<string, number>();

function jumpTo(y: number) {
  // 'instant' beats the global CSS scroll-behavior: smooth; repeated on the
  // next frame as a safety net for browsers that adjust scroll asynchronously.
  window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'instant' }));
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => {
    migrateHash();
    return parsePath();
  });
  const pathRef = useRef(route.path);

  useEffect(() => {
    // Disable the browser's own scroll restoration so it can't fight ours.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const sync = (restore: boolean) => {
      scrollPositions.set(pathRef.current, window.scrollY);
      migrateHash();
      const next = parsePath();
      pathRef.current = next.path;
      setRoute(next);
      jumpTo(restore ? scrollPositions.get(next.path) ?? 0 : 0);
    };

    const onPop = () => sync(true);
    const onHash = () => sync(false); // old-style #/path links still work
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // Navigating to the page you're already on scrolls to the top instead.
  const navigate = useCallback((path: string) => {
    if (parsePath().path === path) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }
    scrollPositions.set(pathRef.current, window.scrollY);
    window.history.pushState(null, '', BASE + path);
    pathRef.current = path;
    setRoute({ path, params: {} });
    jumpTo(0);
  }, []);

  return { route, navigate };
}
