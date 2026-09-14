import { useEffect, useState, useCallback, useRef } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return { path: hash, params: {} };
}

// Remembers scroll position per path so navigating back restores where the
// user left off, while a fresh navigation (into a product, a collection,
// etc.) always starts at the top instead of inheriting the previous page's
// scroll offset.
const scrollPositions = new Map<string, number>();

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);
  const pathRef = useRef(route.path);
  const isPopRef = useRef(false);

  useEffect(() => {
    // Disable the browser's own scroll restoration so it can't fight with
    // ours — that fight is what caused a new page to render at the old
    // scroll offset for a frame before snapping to the top.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const onPopState = () => {
      isPopRef.current = true;
    };

    const onChange = () => {
      scrollPositions.set(pathRef.current, window.scrollY);

      const nextRoute = parseHash();
      const wasPop = isPopRef.current;
      isPopRef.current = false;

      pathRef.current = nextRoute.path;
      setRoute(nextRoute);

      const restoreY = wasPop ? scrollPositions.get(nextRoute.path) ?? 0 : 0;

      // Explicit behavior: 'auto' overrides the global CSS
      // `scroll-behavior: smooth`, so this reset/restore is an instant
      // jump, never an animated scroll. Safari also performs its own async
      // scroll adjustment after a hashchange (it tries to jump to any
      // element matching the new hash), which can run *after* a
      // synchronous scrollTo here and leave the page stuck mid-scroll —
      // deferring to the next animation frame lets our reset/restore win
      // instead of getting overridden.
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
      });
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
