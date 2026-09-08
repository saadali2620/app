import { useEffect, useState, useCallback } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return { path: hash, params: {} };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      // Safari performs its own async scroll adjustment after a hashchange
      // (it tries to jump to any element matching the new hash), which can
      // run *after* a synchronous scrollTo(0, 0) here and leave the page
      // stuck mid-scroll. Deferring to the next animation frame lets our
      // reset win instead of getting overridden.
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
