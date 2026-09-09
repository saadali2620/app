import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  navigate: (path: string) => void;
}

// Starter FAQ content — grounded in what the site actually does today
// (per-product sizing, Track Order page, Policies page, PayFast + COD at
// checkout, Karachi/Pakistan-only shipping). Edit freely; nothing here is
// final copy.
const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What sizes do you carry?',
    answer:
      "Available sizes are listed on each product page, along with a fit note where relevant. If you're between sizes, message us on Instagram or email and we'll help you pick.",
  },
  {
    question: 'How do I track my order?',
    answer:
      'Use the Track Order page with your order number and phone number to see the latest status.',
  },
  {
    question: "What's your exchange and refund policy?",
    answer:
      'Full details are on the Exchange & Refund Policy tab of our Policies page.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Cash on Delivery, or secure online payment via PayFast (card, bank account, or mobile wallet).',
  },
  {
    question: 'Where are you based, and do you ship internationally?',
    answer:
      "We're based in Karachi and currently ship within Pakistan only.",
  },
];

export default function FAQAccordion({ navigate }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 lg:py-28 border-t border-white/10">
      <div className="max-w-[800px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <p className="text-white/40 text-[11px] uppercase tracking-[0.25em] mb-3">Need to know</p>
          <h2 className="text-white text-3xl sm:text-4xl font-bold tracking-tight">FAQs</h2>
        </div>

        <div className="flex flex-col divide-y divide-white/10 border-t border-b border-white/10">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-white text-sm sm:text-base font-medium">{item.question}</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={1.5}
                    className={`shrink-0 text-white/50 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
                  }`}
                  style={{ display: 'grid' }}
                >
                  <div className="overflow-hidden">
                    <p className="text-white/60 text-sm leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => navigate('/contact')}
            className="text-white text-[11px] uppercase tracking-[0.2em] border-b border-white/30 pb-1 hover:border-white transition-colors"
          >
            Still have questions? Contact us
          </button>
        </div>
      </div>
    </section>
  );
}
