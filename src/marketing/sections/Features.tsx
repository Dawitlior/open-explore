import { Award, ShieldCheck, BrainCircuit, LineChart, Cloud, Languages } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import { useReveal } from '../use-reveal';

const ICONS = [Award, ShieldCheck, BrainCircuit, LineChart, Cloud, Languages];

export function MktFeatures() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).features;
  const ref = useReveal<HTMLElement>();

  return (
    <section ref={ref} className="mk-reveal py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{t.title}</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.items.map((it, i) => {
            const Icon = ICONS[i] || Award;
            return (
              <div key={i} className="mk-card p-6">
                <div
                  className="inline-flex h-10 w-10 rounded-lg items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--mk-primary) 14%, transparent)',
                    color: 'var(--mk-primary)',
                  }}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 mk-display text-lg" style={{ color: 'var(--mk-text)' }}>{it.title}</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--mk-muted)', lineHeight: 1.6 }}>{it.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
