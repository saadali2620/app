import { Instagram, Mail } from 'lucide-react';

interface FooterProps {
  navigate: (path: string) => void;
}

export default function Footer({ navigate }: FooterProps) {
  return (
    <footer className="bg-black text-white border-t border-white/10">
      {/* Fine print */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-20 grid md:grid-cols-3 gap-12">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">// Fine Print</h3>
          <p className="text-white/70 text-sm leading-relaxed">
            Limited edition seasonal collections embracing the current culture. Locally sourced with
            an obsessive attention to fit, fabric and fabrication.
          </p>
          <p className="text-white/40 text-xs mt-4 uppercase tracking-[0.15em]">
            Designed in Karachi / Proudly made in Pakistan
          </p>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">Have a Query?</h3>
          <p className="text-white/70 text-sm leading-relaxed mb-4">
            We are available to help through email and instagram. Due to high influx of orders,
            please bear with us as we navigate through each and all queries.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="mailto:help@nors.com.pk"
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              <Mail size={15} strokeWidth={1.5} />
              help@nors.com.pk
            </a>
            <a
              href="https://instagram.com/nors.com.pk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              <Instagram size={15} strokeWidth={1.5} />
              IG - NORS.
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">Navigate</h3>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Shop All', path: '/collections/all' },
              { label: 'BATCH 01', path: '/collections/batch-011' },
              { label: 'About', path: '/about' },
              { label: 'Policies', path: '/policies' },
              { label: 'Contact Us', path: '/contact' },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="text-white/70 hover:text-white text-sm text-left transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-6 px-6 lg:px-10 max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white font-bold tracking-[0.3em] text-lg">nors.</span>
        <p className="text-white/30 text-xs uppercase tracking-[0.15em]">
          since 2021 / all rights reserved
        </p>
      </div>
    </footer>
  );
}
