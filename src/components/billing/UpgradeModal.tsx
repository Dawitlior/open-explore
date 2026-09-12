/**
 * UpgradeModal — listens for 'orca:open-upgrade' and presents the
 * 2-plan pricing comparison (Free / Pro).
 *
 * Bilingual (HE/EN). Checkout goes through Stripe via useSubscription.
 *
 * Visual register: formal and institutional — flat surfaces, restrained
 * typography, one accent line. No aurora, sparkles or floating cards.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, X } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';
import { useEntitlement, type AppTier } from '@/hooks/use-entitlement';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface TierDef {
  id: AppTier;
  name: { he: string; en: string };
  tagline: { he: string; en: string };
  price: { he: string; en: string };
  period: { he: string; en: string } | null;
  features: { he: string; en: string }[];
}

const TIERS: TierDef[] = [
  {
    id: 'free',
    name: { he: 'חינם', en: 'Free' },
    tagline: { he: 'הבסיס למסחר ממושמע', en: 'The disciplined-trading baseline' },
    price: { he: '0 ₪', en: '$0' },
    period: null,
    features: [
      { he: 'יומן מסחר מלא', en: 'Full trade journal' },
      { he: 'חישובי R-Multiple', en: 'R-Multiple calculations' },
      { he: 'מגבלות סיכון 4 שכבות', en: '4-tier risk limits' },
      { he: 'לוח שנה כלכלי', en: 'Economic calendar' },
      { he: 'תובנות AI שבועיות', en: 'Weekly AI insights' },
      { he: 'אנליטיקה מקצועית — התמונה הגדולה', en: 'Pro analytics — Big Picture' },
      { he: 'מצב Dual R/$ בכל הגרפים', en: 'Dual R/$ mode everywhere' },
      { he: 'עד 2 תיקים', en: 'Up to 2 portfolios' },
    ],
  },
  {
    id: 'pro',
    name: { he: 'פרו', en: 'Pro' },
    tagline: { he: 'מנוע כמותי מלא', en: 'Full quant engine' },
    price: { he: '10$', en: '$10' },
    period: { he: 'לחודש', en: 'per month' },
    features: [
      { he: 'כל מה שיש בחינם', en: 'Everything in Free' },
      { he: 'ערוץ פילוח וחלוקה', en: 'Breakdown & Distribution channel' },
      { he: 'מעבדת קוונט מלאה', en: 'Full Quant Lab channel' },
      { he: 'קלי אופטימלי (Full/Half)', en: 'Optimal Kelly sizing' },
      { he: 'אוטוקורלציה Lag-1 וזמן בין עסקאות', en: 'Lag-1 autocorrelation & inter-trade timing' },
      { he: 'יחס MAR מצטבר ומבנה Drawdown', en: 'Cumulative MAR & drawdown structure' },
      { he: 'יעילות הון מתגלגלת', en: 'Rolling capital efficiency' },
      { he: 'עד 10 תיקים', en: 'Up to 10 portfolios' },
    ],
  },
];

export function UpgradeModal() {
  const { lang } = useLang();
  const { tier: currentTier } = useEntitlement();
  const [open, setOpen] = useState(false);
  const [required, setRequired] = useState<AppTier>('pro');
  const [checkoutTier, setCheckoutTier] = useState<AppTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { startCheckout } = useSubscription();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { required?: AppTier } | undefined;
      if (detail?.required) setRequired(detail.required);
      setOpen(true);
    };
    window.addEventListener('orca:open-upgrade', onOpen);
    return () => window.removeEventListener('orca:open-upgrade', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const isHe = lang === 'he';
  const title = isHe ? 'תוכניות ומנוי' : 'Plans & subscription';
  const subtitle = isHe
    ? 'שתי תוכניות בלבד. ניתן לבטל בכל עת.'
    : 'Two plans only. Cancel at any time.';

  const startTrial = async (tier: AppTier) => {
    if (tier === 'free') {
      window.dispatchEvent(new CustomEvent('orca:start-trial', { detail: { tier } }));
      setOpen(false);
      return;
    }
    setCheckoutTier(tier);
    setCheckoutError(null);
    try {
      await startCheckout('pro');
      setOpen(false);
    } catch {
      setCheckoutError(isHe
        ? 'לא הצלחנו לפתוח את דף התשלום. נסה/י שוב.'
        : 'Could not open the payment page. Please try again.');
    } finally {
      setCheckoutTier(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="upgrade-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9500,
              background: 'hsl(var(--background) / 0.72)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            dir={isHe ? 'rtl' : 'ltr'}
          />

          {/* Modal */}
          <motion.div
            key="upgrade-modal"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9501,
              display: 'grid', placeItems: 'center', padding: 20,
              pointerEvents: 'none',
            }}
            dir={isHe ? 'rtl' : 'ltr'}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                position: 'relative',
                width: 'min(880px, 100%)',
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: 14,
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 28px 80px -28px hsl(0 0% 0% / 0.7)',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: 'clamp(20px, 3vw, 28px)',
                  borderBottom: '1px solid hsl(var(--border))',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
                      textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))',
                      marginBottom: 8,
                    }}
                  >
                    Orca Investment
                  </div>
                  <h2 style={{ margin: 0, fontSize: 'clamp(18px, 2.4vw, 22px)', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                    {title}
                  </h2>
                  <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'hsl(var(--muted-foreground))' }}>
                    {subtitle}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label={isHe ? 'סגירה' : 'Close'}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'transparent',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--muted-foreground))',
                    display: 'grid', placeItems: 'center', cursor: 'pointer',
                    transition: 'color .15s, border-color .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Tier grid */}
              <div
                className="grid grid-cols-1 md:grid-cols-2"
                style={{ gap: 0 }}
              >
                {TIERS.map((tier, idx) => {
                  const isCurrent = currentTier === tier.id;
                  const isRecommended = tier.id === required && !isCurrent;
                  return (
                    <div
                      key={tier.id}
                      style={{
                        position: 'relative',
                        display: 'flex', flexDirection: 'column',
                        padding: 'clamp(20px, 3vw, 28px)',
                        borderInlineEnd: idx === 0 ? '1px solid hsl(var(--border))' : undefined,
                        background: isRecommended ? 'hsl(var(--muted) / 0.35)' : 'transparent',
                      }}
                    >
                      {/* Accent rule on the recommended plan */}
                      {isRecommended && (
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute', top: 0, insetInline: 0, height: 2,
                            background: 'hsl(var(--primary))',
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                          {tier.name[isHe ? 'he' : 'en']}
                        </h3>
                        {isRecommended && (
                          <span
                            style={{
                              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
                              textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
                              color: 'hsl(var(--primary))',
                              border: '1px solid hsl(var(--primary) / 0.4)',
                            }}
                          >
                            {isHe ? 'מומלץ' : 'Recommended'}
                          </span>
                        )}
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
                              textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
                              color: 'hsl(var(--muted-foreground))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          >
                            {isHe ? 'פעילה' : 'Current'}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '0 0 16px', fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>
                        {tier.tagline[isHe ? 'he' : 'en']}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
                        <span
                          style={{
                            fontSize: 30, fontWeight: 600, lineHeight: 1,
                            color: 'hsl(var(--foreground))',
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >
                          {tier.price[isHe ? 'he' : 'en']}
                        </span>
                        {tier.period && (
                          <span style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>
                            {tier.period[isHe ? 'he' : 'en']}
                          </span>
                        )}
                      </div>

                      <ul
                        style={{
                          flex: 1, listStyle: 'none', padding: 0, margin: '0 0 22px',
                          display: 'flex', flexDirection: 'column', gap: 9,
                        }}
                      >
                        {tier.features.map((f, i) => (
                          <li
                            key={i}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 9,
                              fontSize: 12, lineHeight: 1.5,
                              color: 'hsl(var(--muted-foreground))',
                            }}
                          >
                            <Check
                              size={13}
                              style={{
                                flexShrink: 0, marginTop: 2,
                                color: isRecommended ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                              }}
                            />
                            <span>{f[isHe ? 'he' : 'en']}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={isCurrent || checkoutTier !== null}
                        onClick={() => { void startTrial(tier.id); }}
                        className={cn(
                          'w-full py-2.5 rounded-md text-[12.5px] font-semibold transition-opacity',
                          (isCurrent || checkoutTier !== null) && 'opacity-60',
                        )}
                        style={{
                          background: isCurrent || !isRecommended ? 'transparent' : 'hsl(var(--primary))',
                          color: isCurrent || !isRecommended ? 'hsl(var(--foreground))' : 'hsl(var(--primary-foreground))',
                          border: `1px solid ${isCurrent || !isRecommended ? 'hsl(var(--border))' : 'hsl(var(--primary))'}`,
                          cursor: isCurrent ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isCurrent
                          ? (isHe ? 'התוכנית הפעילה' : 'Current plan')
                          : checkoutTier === tier.id
                            ? (isHe ? 'פותח תשלום…' : 'Opening checkout…')
                            : tier.id === 'free'
                              ? (isHe ? 'המשך/י בחינם' : 'Stay on Free')
                              : (isHe ? 'מעבר לתשלום' : 'Continue to payment')}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '14px 20px',
                  borderTop: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--muted) / 0.25)',
                }}
              >
                <ShieldCheck size={13} style={{ color: 'hsl(var(--muted-foreground))' }} />
                <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                  {isHe
                    ? 'תשלום מאובטח בעיבוד Stripe · ביטול בכל עת'
                    : 'Secure payment processed by Stripe · Cancel at any time'}
                </span>
              </div>

              {checkoutError && (
                <p
                  role="alert"
                  style={{
                    textAlign: 'center', fontSize: 11.5, margin: 0,
                    padding: '10px 20px',
                    color: 'hsl(var(--destructive))',
                    borderTop: '1px solid hsl(var(--border))',
                  }}
                >
                  {checkoutError}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
