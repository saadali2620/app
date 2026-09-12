import { Mail, Instagram, MapPin } from 'lucide-react';

interface ContactPageProps {
  navigate: (path: string) => void;
}

export default function ContactPage({ navigate }: ContactPageProps) {
  void navigate;

  return (
    <div className="min-h-screen bg-black pt-28 pb-20">
      <div className="max-w-[700px] mx-auto px-6 lg:px-10 text-center">
        <p className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-4">Get in Touch</p>
        <h1 className="text-white text-2xl sm:text-3xl font-medium mb-6">Contact Us</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-12 max-w-[480px] mx-auto">
          Small team, real replies. You won't get a bot or a canned script here — just give
          us a bit of time and you'll hear from an actual person. Email or Instagram,
          whichever you check more.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          <a
            href="mailto:help@nors.com.pk"
            className="flex items-center gap-3 text-white/80 hover:text-white text-sm transition-colors border border-white/20 hover:border-white/50 px-6 py-4"
          >
            <Mail size={18} strokeWidth={1.5} />
            help@nors.com.pk
          </a>
          <a
            href="https://instagram.com/nors.com.pk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-white/80 hover:text-white text-sm transition-colors border border-white/20 hover:border-white/50 px-6 py-4"
          >
            <Instagram size={18} strokeWidth={1.5} />
            IG - NORS.
          </a>
        </div>

        {/* Studio address — moved here from the footer so it sits with the
            other ways to reach us instead of doing double duty in the
            footer's fine print. */}
        <div className="flex items-center justify-center gap-2 text-white/40 text-sm mt-10">
          <MapPin size={16} strokeWidth={1.5} />
          8-D, Block #2, PECHS, Karachi
        </div>
      </div>
    </div>
  );
}
