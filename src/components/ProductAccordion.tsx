import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AccordionSection } from '@/types';

interface ProductAccordionProps {
  sections: AccordionSection[];
}

export default function ProductAccordion({ sections }: ProductAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!sections.length) return null;

  return (
    <div className="border-t border-white/10">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border-b border-white/10">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className={`w-full flex items-center justify-between py-4 text-left text-[11px] uppercase tracking-[0.18em] font-medium transition-colors active:scale-[0.99] ${
                isOpen ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {section.title}
              {/* A single stroke that rotates 45° into an × rather than a
                  plus/minus glyph swap — one continuous shape the eye can
                  track through the motion instead of two different marks. */}
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={`relative w-3 h-3 flex-shrink-0 ${isOpen ? 'text-white' : 'text-white/40'}`}
              >
                <span className="absolute top-1/2 left-0 right-0 h-px bg-current -translate-y-1/2" />
                <span className="absolute left-1/2 top-0 bottom-0 w-px bg-current -translate-x-1/2" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { type: 'spring', damping: 26, stiffness: 260 },
                    opacity: { duration: 0.2 },
                  }}
                  className="overflow-hidden"
                >
                  <div
                    className="pb-6 text-white/60 text-sm leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:font-semibold [&_th]:uppercase [&_th]:text-[11px] [&_th]:tracking-wide [&_th]:pb-2 [&_th]:border-b [&_th]:border-white/20 [&_td]:py-2 [&_td]:border-b [&_td]:border-white/10 [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
