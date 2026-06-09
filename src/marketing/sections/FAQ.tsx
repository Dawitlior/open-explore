import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import { useReveal } from '../use-reveal';

export function MktFAQ() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).faq;
  const [open, setOpen] = useState<number | null>(0);
  const ref = useReveal<HTMLElement>();

  return (
    <section id="faq" ref={ref} className="mk-reveal py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{t.title}</h2>

        <div className="mt-10 space-y-2">
          {t.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="mk-card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-start px-5 py-4 flex items-center justify-between gap-4"
                  style={{ color: 'var(--mk-text)', fontWeight: 600 }}
                  aria-expanded={isOpen}
                >
                  <span>{it.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: 'var(--mk-muted)',
                      transition: 'transform .2s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm" style={{ color: 'var(--mk-muted)', lineHeight: 1.6 }}>
                    {it.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
