import { useState } from 'react';
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
                                                          className={`w-full flex items-center justify-between py-4 text-left text-[11px] uppercase tracking-[0.18em] font-medium transition-colors ${
                                                                            isOpen ? 'text-white' : 'text-white/70 hover:text-white'
                                                          }`}
                                                        >
                                            {section.title}
                                                        <span
                                                                          className={`text-base leading-none font-normal transition-transform duration-200 ${
                                                                                              isOpen ? 'text-white' : 'text-white/40'
                                                                          }`}
                                                                        >
                                                          {isOpen ? '−' : '+'}
                                                        </span>
                                          </button>
                                {isOpen && (
                                              <div
                                                                className="pb-6 text-white/60 text-sm leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:font-semibold [&_th]:uppercase [&_th]:text-[11px] [&_th]:tracking-wide [&_th]:pb-2 [&_th]:border-b [&_th]:border-white/20 [&_td]:py-2 [&_td]:border-b [&_td]:border-white/10 [&_p]:mb-2"
                                                                dangerouslySetInnerHTML={{ __html: section.content }}
                                                              />
                                            )}
                              </div>
                            );
        })}
        </div>
      );
}
</div>
