/**
 * UpgradeModal — listens for 'orca:open-upgrade' and presents the
 * 3-tier pricing comparison (Standard / Advanced / Ultimate).
 *
 * Bilingual (HE/EN). Pre-launch CTA is wired to a no-op stub that
 * dispatches 'orca:start-trial' — payment flow lands in a later phase.
 *
 * Visuals: cinematic motion entrance, animated aurora background,
 * orbital sparkles, tier cards with hover lift and tilt-glow.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Crown, Zap, X } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';
import { useEntitlement, type AppTier } from '@/hooks/use-entitlement';
import { cn } from '@/lib/utils';

interface TierDef {
  id: AppTier;
  icon: typeof Zap;
  name: { he: string; en: string };
  tagline: { he: string; en: string };
  price: { he: string; en: string };
  features: { he: string; en: string }[];
  accent: string;   // hex
  glow: string;     // rgba glow color
}

const TIERS: TierDef[] = [
  {
    id: 'standard',
    icon: Zap,
    name: { he: 'סטנדרט', en: 'Standard' },
    tagline: { he: 'הבסיס למסחר ממושמע', en: 'The disciplined-trading baseline' },
    price: { he: 'חינם', en: 'Free' },
    accent: '#94a3b8',
    glow: 'rgba(148,163,184,0.35)',
    features: [
      { he: 'יומן מסחר מלא', en: 'Full trade journal' },
      { he: 'חישובי R-Multiple', en: 'R-Multiple calculations' },
      { he: 'מגבלות סיכון 4 שכבות', en: '4-tier risk limits' },
      { he: 'לוח שנה כלכלי בסיסי', en: 'Basic economic calendar' },
      { he: 'תובנות AI שבועיות', en: 'Weekly AI insights' },
    ],
  },
  {
    id: 'advanced',
    icon: Sparkles,
    name: { he: 'מתקדם', en: 'Advanced' },
    tagline: { he: 'אנליטיקה ברמת פרו', en: 'Pro-grade analytics' },
    price: { he: '₪49/חודש', en: '$14/mo' },
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.55)',
    features: [
      { he: 'כל יתרונות סטנדרט', en: 'Everything in Standard' },
      { he: 'מפת חום ביצועי סשן', en: 'Session performance heatmap' },
      { he: 'התפלגות רצפי הצלחה/הפסד', en: 'Streak distribution' },
      { he: 'משך עסקה מול R', en: 'Trade duration vs R' },
      { he: 'ניתוח שחיקת עמלות', en: 'Fee drag impact' },
      { he: 'מצב Dual R/$ בכל הגרפים', en: 'Dual R/$ mode everywhere' },
    ],
  },
  {
    id: 'ultimate',
    icon: Crown,
    name: { he: 'אולטימייט', en: 'Ultimate' },
    tagline: { he: 'מנוע כמותי מלא', en: 'Full quant engine' },
    price: { he: '₪129/חודש', en: '$39/mo' },
    accent: '#d4af37',
    glow: 'rgba(212,175,55,0.55)',
    features: [
      { he: 'כל יתרונות מתקדם', en: 'Everything in Advanced' },
      { he: 'אוטוקורלציה Lag-1', en: 'Lag-1 autocorrelation' },
      { he: 'התפלגות זמן בין עסקאות', en: 'Inter-trade interval analysis' },
      { he: 'קלי אופטימלי (Full/Half)', en: 'Optimal Kelly sizing' },
      { he: 'יחס MAR מצטבר', en: 'Cumulative MAR ratio' },
      { he: 'מבנה Drawdown מלא', en: 'Full drawdown structure' },
      { he: 'יעילות הון מתגלגלת', en: 'Rolling capital efficiency' },
    ],
  },
];

const sparkleCSS = `
@keyframes upgradeAurora {
  0%   { transform: translate(-10%, -10%) rotate(0deg);   opacity: .55; }
  50%  { transform: translate( 10%,  10%) rotate(180deg); opacity: .85; }
  100% { transform: translate(-10%, -10%) rotate(360deg); opacity: .55; }
}
@keyframes upgradeStar {
  0%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
  50%      { opacity: 1; transform: scale(1)   rotate(180deg); }
}
@keyframes upgradeFloat {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-6px); }
}
`;

export function UpgradeModal() {
  const { lang } = useLang();
  const { tier: currentTier } = useEntitlement();
  const [open, setOpen] = useState(false);
  const [required, setRequired] = useState<AppTier>('advanced');

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
  const title = isHe ? 'בחר/י את התוכנית שלך' : 'Choose your plan';
  const subtitle = isHe
    ? '7 ימי ניסיון חינם בגישת Advanced — ללא חיוב, ניתן לבטל בכל עת'
    : '7-day free trial with Advanced access — no charge, cancel anytime';

  const startTrial = (tier: AppTier) => {
    window.dispatchEvent(new CustomEvent('orca:start-trial', { detail: { tier } }));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{sparkleCSS}</style>
          {/* Backdrop */}
          <motion.div
            key="upgrade-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9500,
              background: 'radial-gradient(ellipse at center, rgba(8,12,22,0.86), rgba(2,4,10,0.96))',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            dir={isHe ? 'rtl' : 'ltr'}
          />

          {/* Modal */}
          <motion.div
            key="upgrade-modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9501,
              display: 'grid', placeItems: 'center', padding: 20,
              pointerEvents: 'none',
            }}
            dir={isHe ? 'rtl' : 'ltr'}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                position: 'relative',
                width: 'min(1080px, 100%)',
                maxHeight: '92vh',
                overflowY: 'auto',
                borderRadius: 24,
                padding: 'clamp(20px, 3vw, 36px)',
                background: 'linear-gradient(160deg, rgba(14,20,36,0.92), rgba(6,10,20,0.96))',
                border: '1px solid rgba(34,211,238,0.18)',
                boxShadow: '0 40px 120px -20px rgba(0,0,0,0.7), 0 0 80px -20px rgba(34,211,238,0.18)',
                overflowX: 'hidden',
              }}
            >
              {/* Aurora layer */}
              <div aria-hidden style={{
                position: 'absolute', inset: '-30%', zIndex: 0,
                background:
                  'radial-gradient(ellipse 40% 30% at 30% 30%, rgba(34,211,238,0.22), transparent 60%),' +
                  'radial-gradient(ellipse 35% 25% at 75% 20%, rgba(168,85,247,0.20), transparent 60%),' +
                  'radial-gradient(ellipse 50% 35% at 50% 90%, rgba(212,175,55,0.16), transparent 60%)',
                animation: 'upgradeAurora 18s ease-in-out infinite',
                pointerEvents: 'none',
                filter: 'blur(20px)',
              }} />

              {/* Sparkle stars */}
              {[
                { top: '12%', left: '8%',  d: 0,    size: 6,  c: '#22d3ee' },
                { top: '22%', left: '92%', d: 0.6,  size: 5,  c: '#a78bfa' },
                { top: '68%', left: '6%',  d: 1.2,  size: 4,  c: '#d4af37' },
                { top: '78%', left: '88%', d: 1.8,  size: 6,  c: '#22d3ee' },
                { top: '38%', left: '50%', d: 0.3,  size: 3,  c: '#fff'    },
              ].map((s, i) => (
                <span key={i} aria-hidden style={{
                  position: 'absolute', top: s.top, left: s.left,
                  width: s.size, height: s.size, borderRadius: '50%',
                  background: s.c, boxShadow: `0 0 12px ${s.c}, 0 0 24px ${s.c}88`,
                  animation: `upgradeStar 3.6s ease-in-out ${s.d}s infinite`,
                  zIndex: 1, pointerEvents: 'none',
                }} />
              ))}

              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 14, insetInlineEnd: 14, zIndex: 5,
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#cbd5e1', display: 'grid', placeItems: 'center',
                  cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.55)'; e.currentTarget.style.color = '#fecaca'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#cbd5e1'; }}
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 22 }}>
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px', borderRadius: 999,
                    background: 'linear-gradient(90deg, rgba(34,211,238,0.14), rgba(168,85,247,0.14))',
                    border: '1px solid rgba(34,211,238,0.30)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                    color: '#22d3ee', textTransform: 'uppercase',
                    marginBottom: 14,
                  }}
                >
                  <Sparkles size={12} /> {isHe ? 'שדרוג תוכנית' : 'Plan Upgrade'}
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.4 }}
                  style={{
                    fontSize: 'clamp(22px, 3.2vw, 30px)', fontWeight: 800,
                    margin: 0, marginBottom: 6,
                    background: 'linear-gradient(90deg, #ffffff 0%, #22d3ee 50%, #a78bfa 100%)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                  }}
                >
                  {title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28, duration: 0.4 }}
                  style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}
                >
                  {subtitle}
                </motion.p>
              </div>

              {/* Tier grid */}
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                style={{ position: 'relative', zIndex: 2 }}
              >
                {TIERS.map((tier, idx) => {
                  const Icon = tier.icon;
                  const isCurrent = currentTier === tier.id;
                  const isRecommended = tier.id === required && !isCurrent;
                  return (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 24, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: isRecommended ? 1.03 : 1 }}
                      transition={{ delay: 0.25 + idx * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -4 }}
                      style={{
                        position: 'relative',
                        display: 'flex', flexDirection: 'column',
                        borderRadius: 18, padding: 22,
                        background: isRecommended
                          ? `linear-gradient(165deg, ${tier.glow.replace('0.55', '0.12')}, rgba(8,12,22,0.85))`
                          : 'linear-gradient(165deg, rgba(255,255,255,0.04), rgba(8,12,22,0.85))',
                        border: `1px solid ${isRecommended ? tier.accent + '88' : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: isRecommended
                          ? `0 0 40px -8px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        overflow: 'hidden',
                        animation: isRecommended ? 'upgradeFloat 4s ease-in-out infinite' : undefined,
                      }}
                    >
                      {isRecommended && (
                        <div style={{
                          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                          padding: '4px 12px', borderRadius: 999,
                          background: `linear-gradient(90deg, ${tier.accent}, #a78bfa)`,
                          color: '#0a0e1a', fontSize: 10, fontWeight: 800,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          boxShadow: `0 6px 20px -4px ${tier.glow}`,
                        }}>
                          {isHe ? 'מומלץ' : 'Recommended'}
                        </div>
                      )}
                      {isCurrent && (
                        <div style={{
                          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                          padding: '4px 12px', borderRadius: 999,
                          background: 'rgba(148,163,184,0.18)', color: '#cbd5e1',
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                          border: '1px solid rgba(148,163,184,0.4)',
                        }}>
                          {isHe ? 'התוכנית הנוכחית' : 'Current'}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: `${tier.accent}1c`, border: `1px solid ${tier.accent}55`,
                          display: 'grid', placeItems: 'center',
                          boxShadow: `0 0 16px -2px ${tier.glow}`,
                        }}>
                          <Icon size={18} style={{ color: tier.accent }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
                          {tier.name[isHe ? 'he' : 'en']}
                        </h3>
                      </div>
                      <p style={{ margin: 0, marginBottom: 10, fontSize: 11, color: '#94a3b8' }}>
                        {tier.tagline[isHe ? 'he' : 'en']}
                      </p>
                      <div style={{
                        fontSize: 26, fontWeight: 800, marginBottom: 14,
                        color: tier.accent, fontFamily: "'JetBrains Mono', monospace",
                        textShadow: `0 0 18px ${tier.glow}`,
                      }}>
                        {tier.price[isHe ? 'he' : 'en']}
                      </div>

                      <ul style={{ flex: 1, listStyle: 'none', padding: 0, margin: 0, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {tier.features.map((f, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: isHe ? 8 : -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.1 + i * 0.04 }}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#e2e8f0' }}
                          >
                            <Check size={13} style={{ color: tier.accent, flexShrink: 0, marginTop: 2 }} />
                            <span>{f[isHe ? 'he' : 'en']}</span>
                          </motion.li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => startTrial(tier.id)}
                        className={cn(
                          'w-full py-2.5 rounded-lg text-sm font-bold transition-all',
                          isCurrent && 'cursor-not-allowed opacity-60',
                        )}
                        style={{
                          background: isCurrent
                            ? 'rgba(148,163,184,0.14)'
                            : `linear-gradient(135deg, ${tier.accent}, ${tier.accent}cc)`,
                          color: isCurrent ? '#cbd5e1' : '#0a0e1a',
                          border: 'none',
                          letterSpacing: '0.04em',
                          boxShadow: isCurrent ? 'none' : `0 8px 24px -8px ${tier.glow}`,
                          cursor: isCurrent ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (isCurrent) return;
                          e.currentTarget.style.filter = 'brightness(1.1)';
                          e.currentTarget.style.boxShadow = `0 12px 32px -8px ${tier.glow}, 0 0 0 1px ${tier.accent}66`;
                        }}
                        onMouseLeave={e => {
                          if (isCurrent) return;
                          e.currentTarget.style.filter = 'brightness(1)';
                          e.currentTarget.style.boxShadow = `0 8px 24px -8px ${tier.glow}`;
                        }}
                      >
                        {isCurrent
                          ? (isHe ? 'התוכנית הפעילה' : 'Current plan')
                          : tier.id === 'standard'
                            ? (isHe ? 'המשך/י בחינם' : 'Stay on Free')
                            : (isHe ? 'התחל/י ניסיון 7 ימים' : 'Start 7-day trial')}
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              <p style={{ position: 'relative', zIndex: 2, textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: 18, marginBottom: 0 }}>
                {isHe
                  ? 'אין צורך בפרטי אשראי עד תום תקופת הניסיון · ביטול בקליק'
                  : 'No credit card required until trial ends · Cancel in one click'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
