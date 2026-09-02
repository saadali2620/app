import { useEffect, useState } from 'react';

const LOOKBOOK_IMAGES = [
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B07213_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B07387_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/776012b2-2581-4f25-96a8-f716c37565e8_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B07289_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/5405cc69-dc7e-470d-af4e-e2c207c7704f_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B07260_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B07413_result.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/09/A7405332.jpg-scaled.jpeg',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B01901-1_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/af017bb2-44e7-443f-8434-9ac938faeac5_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/V_B018732_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/A7405347_result-scaled.webp',
  'https://nors.com.pk/enterprise/wp-content/uploads/2026/08/A74053502_result-scaled.webp',
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
