import { useEffect, useState } from 'react';

interface PolicyPageProps {
  navigate: (path: string) => void;
}

interface PolicyDoc {
  slug: string;
  label: string;
  content: string;
}

const POLICY_SLUGS: { slug: string; label: string }[] = [
  { slug: 'privacy-policy-2', label: 'Privacy Policy' },
  { slug: 'payment-policy', label: 'Payment Policy' },
  { slug: 'shipping-policy', label: 'Shipping Policy' },
  { slug: 'exchange-refund-policy', label: 'Exchange & Refund Policy' },
];

const WP_BASE = (import.meta.env.VITE_WC_BASE_URL ?? '/enterprise/index.php?rest_route=/wc/store/v1').replace(
  '/wc/store/v1',
  '/wp/v2'
);

function cleanPolicyHtml(html: string): string {
  return html
    .replace(/<div class="wpb-content-wrapper">/g, '')
    .replace(/<p>\[vc_row\][\s\S]*?\[vc_column_text[^\]]*\]<\/p>/g, '')
    .replace(/<p>\[\/vc_column_text\][\s\S]*?\[\/vc_row\]<\/p>/g, '')
    .replace(/<\/div>\s*$/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();
}

export default function PolicyPage({ navigate }: PolicyPageProps) {
  void navigate;
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [active, setActive] = useState(POLICY_SLUGS[0].slug);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        POLICY_SLUGS.map(async ({ slug, label }) => {
          try {
            const res = await fetch(`${WP_BASE}/pages&slug=${slug}`);
            const data = await res.json();
            const raw = data[0]?.content?.rendered ?? '';
            return { slug, label, content: cleanPolicyHtml(raw) };
          } catch {
            return { slug, label, content: '' };
          }
        })
      );
      if (!cancelled) {
        setDocs(results);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeDoc = docs.find((d) => d.slug === active);

  return (
    <div className="min-h-screen bg-black pt-28 pb-20">
      <div className="max-w-[900px] mx-auto px-6 lg:px-10">
        <h1 className="text-white text-2xl sm:text-3xl font-medium mb-10">Policies</h1>

        <div className="flex flex-wrap gap-2 mb-10 border-b border-white/10 pb-6">
          {POLICY_SLUGS.map(({ slug, label }) => (
            <button
              key={slug}
              onClick={() => setActive(slug)}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.15em] border transition-colors ${
                active === slug
                  ? 'border-white bg-white text-black'
                  : 'border-white/20 text-white/60 hover:border-white/50 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-neutral-900 animate-pulse w-full" />
            <div className="h-4 bg-neutral-900 animate-pulse w-5/6" />
            <div className="h-4 bg-neutral-900 animate-pulse w-2/3" />
          </div>
        ) : activeDoc && activeDoc.content ? (
          <div
            className="policy-content text-white/70 text-sm leading-relaxed [&_p]:mb-4 [&_strong]:text-white [&_strong]:font-medium"
            dangerouslySetInnerHTML={{ __html: activeDoc.content }}
          />
        ) : (
          <p className="text-white/50 text-sm">This policy is unavailable right now.</p>
        )}
      </div>
    </div>
  );
}
