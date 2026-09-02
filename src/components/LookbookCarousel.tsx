import { useEffect, useState } from 'react';

const LOOKBOOK_IMAGES = [
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B07380_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B019792_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B01931_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B01929_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B01904_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B018832_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B01875_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B01862-1_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/d1c5c32b-5803-4df4-8c12-d625ac6697a01_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/ccafdde2-2ce4-44a5-9c40-42f432e1387a_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/A7405436_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/A7405392_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/A7405351-1_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/A7405326_result-scaled.webp',
];

function shuffle(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LookbookCarousel() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    setImages(shuffle(LOOKBOOK_IMAGES));
  }, []);

  if (images.length === 0) return null;

  const track = [...images, ...images];

  return (
    <section className="py-20 lg:py-28 border-t border-white/5 overflow-hidden">
      <div className="text-center mb-12 px-6">
        <p className="text-white/40 text-[11px] uppercase tracking-[0.3em] mb-3">The Lookbook</p>
        <h2 className="text-white text-3xl sm:text-4xl font-bold tracking-tight">In The Wild</h2>
      </div>

      <div className="lookbook-track flex gap-3 px-3">
        {track.map((src, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[200px] sm:w-[260px] lg:w-[300px] bg-neutral-900"
            style={{ aspectRatio: '3/4' }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover pointer-events-none select-none"
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
