import { useEffect } from 'react';

interface NotFoundPageProps {
  navigate: (path: string) => void;
}

export default function NotFoundPage({ navigate }: NotFoundPageProps) {
  // The host serves the app shell for unknown URLs, so tell search engines
  // not to index them once the page renders.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black pt-28 pb-20">
      <div className="max-w-[700px] mx-auto px-6 lg:px-10 text-center">
        <p className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-4">Error 404</p>
        <h1 className="text-white text-2xl sm:text-3xl font-medium mb-6">That page doesn't exist</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-10 max-w-[480px] mx-auto">
          The link may be broken, or the page may have moved. Head back to the homepage and pick up from there.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-white text-black text-[11px] uppercase tracking-[0.2em] font-medium px-8 py-4 hover:bg-white/90 transition-colors"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
