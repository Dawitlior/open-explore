import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import { useReveal } from '../use-reveal';

export function MktPricing() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang).pricing;
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<'ils' | 'usd'>('ils');
  const ref = useReveal<HTMLElement>();

  const sym = t.currency[currency];

  return (
    <section id="pricing" ref={ref} className="mk-reveal py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>{t.title}</h2>
          <p className="mt-3" style={{ color: 'var(--mk-muted)' }}>{t.sub}</p>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <div className="inline-flex rounded-full p-1" style={{ border: '1px solid var(--mk-border)' }}>
            <button onClick={() => setYearly(false)}
                    className="px-4 py-1.5 text-sm rounded-full transition-colors"
                    style={{
                      background: !yearly ? 'var(--mk-surface)' : 'transparent',
                      color: !yearly ? 'var(--mk-text)' : 'var(--mk-muted)',
                    }}>
              {t.toggleMonthly}
            </button>
            <button onClick={() => setYearly(true)}
                    className="px-4 py-1.5 text-sm rounded-full transition-colors"
                    style={{
                      background: yearly ? 'var(--mk-surface)' : 'transparent',
                      color: yearly ? 'var(--mk-text)' : 'var(--mk-muted)',
                    }}>
              {t.toggleYearly} · <span data-placeholder="true">{t.yearlyDiscount}</span>
            </button>
          </div>

          <div className="inline-flex rounded-full p-1" style={{ border: '1px solid var(--mk-border)' }}>
            {(['ils', 'usd'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                      className="px-3 py-1.5 text-sm rounded-full transition-colors min-w-[40px]"
                      style={{
                        background: currency === c ? 'var(--mk-surface)' : 'transparent',
                        color: currency === c ? 'var(--mk-text)' : 'var(--mk-muted)',
                      }}>
                {t.currency[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {t.plans.map((p, i) => {
            const popular = p.id === 'advanced';
            return (
              <div key={p.id} className="mk-card p-6 relative flex flex-col"
                   style={{
                     borderColor: popular ? 'var(--mk-primary)' : 'var(--mk-border)',
                     boxShadow: popular ? '0 0 0 1px var(--mk-primary), 0 20px 60px -30px color-mix(in srgb, var(--mk-primary) 60%, transparent)' : undefined,
                   }}>
                {p.badge && (
                  <div className="absolute -top-3 inset-x-0 flex justify-center">
                    <span className="px-3 py-1 rounded-full text-xs flex items-center gap-1"
                          style={{
                            background: popular ? 'linear-gradient(135deg, var(--mk-primary), var(--mk-primary-2))' : 'var(--mk-surface)',
                            color: popular ? '#00171a' : 'var(--mk-muted)',
                            border: popular ? 'none' : '1px solid var(--mk-border)',
                            fontWeight: 700,
                          }}>
                      {popular && <Star size={12} />}
                      {p.badge}
                    </span>
                  </div>
                )}

                <h3 className="mk-display text-2xl" style={{ color: 'var(--mk-text)' }}>{p.name}</h3>
                <p className="mt-2 text-sm min-h-[48px]" style={{ color: 'var(--mk-muted)' }}>{p.desc}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="mk-num text-4xl" style={{ color: 'var(--mk-text)' }}>{sym}</span>
                  <span data-placeholder="true" className="mk-num text-4xl">«PRICE_{p.id.toUpperCase()}»</span>
                  <span className="text-sm" style={{ color: 'var(--mk-muted)' }}>
                    /{yearly ? (lang === 'he' ? 'שנה' : 'yr') : (lang === 'he' ? 'חודש' : 'mo')}
                  </span>
                </div>

                <Link to="/auth?mode=register"
                      className={popular ? 'mk-btn-primary mt-6 text-center' : 'mk-btn-ghost mt-6 text-center'}>
                  {t.cta}
                </Link>

                <div className="mt-2 text-[10px]" data-placeholder="true">
                  «STRIPE_PRICE_ID_{p.id.toUpperCase()}_{yearly ? 'YEARLY' : 'MONTHLY'}»
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs" style={{ color: 'var(--mk-muted)' }}>
          {t.disclaimer}
        </p>
      </div>
    </section>
  );
}
