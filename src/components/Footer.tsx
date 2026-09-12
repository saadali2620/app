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
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">// Real Talk</h3>
          <p className="text-white/70 text-sm leading-relaxed">
            Small batches, made on purpose. We source locally and lose sleep over fit,
            fabric, and finishing — every single time.
          </p>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">Got a Question?</h3>
          <p className="text-white/70 text-sm leading-relaxed mb-4">
            Sizing question, order issue, or just want to talk fabric — email or DM, we'll
            get back to you. Might take a day, but you'll always get an answer.
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
              { label: 'BATCH 01', path: '/collections/batch-01' },
              { label: 'Track Order', path: '/track-order' },
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
          est. 2021 / all rights reserved
        </p>
      </div>
    </footer>
  );
}
