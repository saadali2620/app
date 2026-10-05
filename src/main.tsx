import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/longPressSelect';
import { initPixel } from '@/lib/pixel';
import { currentRoutePath } from '@/hooks/useRouter';
import { importerForPath, prefetchAllPages } from '@/routes';

initPixel();

// After a new deploy, a tab that was open before it can ask for a page file
// whose name no longer exists. Reload once to pick up the new build instead of
// leaving a blank screen. The session flag stops a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (window.sessionStorage.getItem('nors:reloaded-for-update')) return;
    window.sessionStorage.setItem('nors:reloaded-for-update', '1');
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

async function start() {
  // If this URL needs one of the split pages (e.g. /checkout opened directly),
  // fetch it before rendering. The pre-rendered HTML stays on screen meanwhile,
  // so there is no blank flash while the file arrives. Capped at 4 seconds.
  const load = importerForPath(currentRoutePath());
  if (load) {
    await Promise.race([load().catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 4000))]);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Once the page is up, quietly download the other pages so tapping through
  // to checkout, account etc. feels instant.
  if (document.readyState === 'complete') prefetchAllPages();
  else window.addEventListener('load', prefetchAllPages, { once: true });
}

start();

// Service worker: caches the app files and product images on this device so
// repeat visits open almost instantly, and the shell still opens offline.
// Production builds only. It never touches the shop API, cart or checkout.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* not critical: the site works exactly as before without it */
    });
  });
}
