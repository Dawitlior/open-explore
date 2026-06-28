import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Crown, Check, X } from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { AppTier } from '@/hooks/use-entitlement';
import { useEntitlement } from '@/hooks/use-entitlement';

interface ModeSwitchProps {
  T: TradingTheme;
  isRTL: boolean;
}

type TierMeta = {
  id: AppTier;
  label: string;
  labelHe: string;
  color: (T: TradingTheme) => string;
  glow: string;
  icon: typeof Zap;
  desc: string;
  descHe: string;
  tagline: string;
  taglineHe: string;
};

const TIER_OPTIONS: TierMeta[] = [
  { id: 'standard', label: 'STANDARD', labelHe: 'סטנדרט', color: (T) => T.accent.blue, glow: 'rgba(59,130,246,0.55)', icon: Zap,
    desc: 'Core journal, risk limits, calendar, and baseline analytics', descHe: 'יומן, מגבלות סיכון, קלנדר ואנליטיקה בסיסית',
    tagline: 'The disciplined baseline', taglineHe: 'הבסיס למסחר ממושמע' },
  { id: 'advanced', label: 'ADVANCED', labelHe: 'מתקדם', color: (T) => T.accent.cyan, glow: 'rgba(34,211,238,0.6)', icon: Sparkles,
    desc: 'Professional analytics, R/$ chart controls, and deeper diagnostics', descHe: 'אנליטיקה מקצועית, בקרות R/$ ודיאגנוסטיקה עמוקה',
    tagline: 'Pro-grade analytics', taglineHe: 'אנליטיקה ברמת פרו' },
  { id: 'ultimate', label: 'ULTIMATE', labelHe: 'אולטימייט', color: (T) => T.accent.purple, glow: 'rgba(168,85,247,0.6)', icon: Crown,
    desc: 'Full quant engine, Kelly, MAR, autocorrelation, and drawdown structure', descHe: 'מנוע כמותי מלא, Kelly, MAR, אוטוקורלציה ומבנה Drawdown',
    tagline: 'Full quant engine', taglineHe: 'מנוע כמותי מלא' },
];

const cinematicCSS = `
@keyframes msAurora {
  0%   { transform: translate(-12%, -8%) rotate(0deg);   opacity: .55; }
  50%  { transform: translate( 10%, 12%) rotate(180deg); opacity: .9;  }
  100% { transform: translate(-12%, -8%) rotate(360deg); opacity: .55; }
}
@keyframes msStar {
  0%,100% { opacity: 0; transform: scale(.5) rotate(0); }
  50%     { opacity: 1; transform: scale(1)  rotate(180deg); }
}
@keyframes msOrbit {
  from { transform: rotate(0deg)   translateX(64px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(64px) rotate(-360deg); }
}
@keyframes msOrbitRev {
  from { transform: rotate(0deg)   translateX(80px) rotate(0deg); }
  to   { transform: rotate(-360deg) translateX(80px) rotate(360deg); }
}
@keyframes msPulseRing {
  0%   { transform: scale(.85); opacity: .9; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes msShimmer {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
@keyframes msScan {
  0%   { transform: translateY(-100%); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}
@keyframes msIconFloat {
  0%,100% { transform: translateY(0) rotate(-2deg); }
  50%     { transform: translateY(-6px) rotate(2deg); }
}
@keyframes msCheckPop {
  0%   { transform: scale(0) rotate(-90deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes msSpark {
  0%   { transform: translate(0,0) scale(0); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
}
`;

export const ModeSwitch = ({ T, isRTL }: ModeSwitchProps) => {
  const { tier } = useEntitlement();
  const [pendingTier, setPendingTier] = useState<AppTier | null>(null);
  const [phase, setPhase] = useState<'ask' | 'transmuting' | 'done'>('ask');

  const close = () => { setPendingTier(null); setPhase('ask'); };

  const handleTierConfirm = () => {
    if (!pendingTier) return;
    setPhase('transmuting');
    setTimeout(() => {
      window.localStorage.setItem('orca:tier-preview', pendingTier);
      window.dispatchEvent(new CustomEvent('orca:tier-preview-changed', { detail: { tier: pendingTier } }));
      setPhase('done');
      setTimeout(close, 1100);
    }, 1200);
  };

  const meta = TIER_OPTIONS.find(m => m.id === pendingTier);
  const accent = meta ? meta.color(T) : T.accent.cyan;
  const glow = meta?.glow ?? 'rgba(34,211,238,0.55)';
  const Icon = meta?.icon ?? Sparkles;

  return (
    <>
      <div style={{ padding: '0 10px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 4, background: T.bg.primary, borderRadius: T.radius.md, padding: 4 }}>
          {TIER_OPTIONS.map(m => {
            const color = m.color(T);
            const openTier = () => {
              if (m.id !== tier) { setPhase('ask'); setPendingTier(m.id); }
            };
            return (
            <button
              key={m.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); openTier(); }}
              // iOS Safari sometimes drops synthetic click after touch — use a pointer
              // fallback so taps reliably open the modal on mobile.
              onPointerUp={(e) => {
                if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                  e.preventDefault();
                  e.stopPropagation();
                  openTier();
                }
              }}
              style={{
                flex: 1,
                // Larger tap targets so mobile users can reliably hit them.
                padding: '12px 6px',
                minHeight: 44,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', border: 'none', borderRadius: T.radius.sm,
                cursor: 'pointer',
                background: tier === m.id ? `${color}20` : 'transparent',
                color: tier === m.id ? color : T.text.muted,
                transition: 'all 0.2s', position: 'relative',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              {tier === m.id && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: color, borderRadius: 1, pointerEvents: 'none' }} />}
              {isRTL ? m.labelHe : m.label}
            </button>
          );})}
        </div>
      </div>


      {createPortal(
      <AnimatePresence>
        {pendingTier && meta && (
          <>
            <style>{cinematicCSS}</style>
            <motion.div
              key="ms-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => phase === 'ask' && close()}
              style={{
                position: 'fixed', inset: 0, zIndex: 9600,
                background: 'radial-gradient(ellipse at center, rgba(6,10,22,0.82), rgba(2,4,10,0.96))',
                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              }}
              dir={isRTL ? 'rtl' : 'ltr'}
            />

            <motion.div
              key="ms-modal"
              initial={{ opacity: 0, scale: 0.86, y: 30, rotateX: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24, mass: 0.9 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9601,
                display: 'grid', placeItems: 'center', padding: 20,
                pointerEvents: 'none', perspective: 1200,
              }}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  pointerEvents: 'auto',
                  position: 'relative',
                  width: 'min(460px, 100%)',
                  borderRadius: 24,
                  padding: '34px 28px 26px',
                  background: `linear-gradient(165deg, rgba(14,20,36,0.94), rgba(6,10,20,0.98))`,
                  border: `1px solid ${accent}55`,
                  boxShadow: `0 50px 140px -20px rgba(0,0,0,0.8), 0 0 90px -10px ${glow}`,
                  overflow: 'hidden',
                }}
              >
                {/* Aurora */}
                <div aria-hidden style={{
                  position: 'absolute', inset: '-40%', zIndex: 0,
                  background:
                    `radial-gradient(ellipse 45% 35% at 30% 25%, ${glow.replace(/[\d.]+\)$/, '0.32)')}, transparent 60%),` +
                    `radial-gradient(ellipse 40% 30% at 75% 80%, ${glow.replace(/[\d.]+\)$/, '0.22)')}, transparent 60%)`,
                  animation: 'msAurora 14s ease-in-out infinite',
                  filter: 'blur(22px)', pointerEvents: 'none',
                }} />

                {/* Sparkle stars */}
                {[
                  { top: '10%', left: '8%', d: 0,   s: 5, c: accent },
                  { top: '18%', left: '88%', d: 0.7, s: 4, c: '#fff' },
                  { top: '70%', left: '6%', d: 1.2, s: 3, c: '#fff' },
                  { top: '82%', left: '90%', d: 1.9, s: 5, c: accent },
                ].map((s, i) => (
                  <span key={i} aria-hidden style={{
                    position: 'absolute', top: s.top, left: s.left,
                    width: s.s, height: s.s, borderRadius: '50%',
                    background: s.c, boxShadow: `0 0 10px ${s.c}, 0 0 20px ${s.c}88`,
                    animation: `msStar 3.4s ease-in-out ${s.d}s infinite`,
                    zIndex: 1, pointerEvents: 'none',
                  }} />
                ))}

                {/* Scanline during transmute */}
                {phase === 'transmuting' && (
                  <div aria-hidden style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, right: 0, height: '40%',
                      background: `linear-gradient(180deg, transparent, ${accent}33 45%, ${accent}aa 50%, ${accent}33 55%, transparent)`,
                      animation: 'msScan 1.2s ease-in-out forwards',
                    }} />
                  </div>
                )}

                {/* Close */}
                {phase === 'ask' && (
                  <button onClick={close} aria-label="Close" style={{
                    position: 'absolute', top: 12, insetInlineEnd: 12, zIndex: 5,
                    width: 30, height: 30, borderRadius: 9,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                    color: '#cbd5e1', display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}>
                    <X size={14} />
                  </button>
                )}

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  {/* Icon halo */}
                  <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 14px' }}>
                    {/* orbiting dots */}
                    <span aria-hidden style={{
                      position: 'absolute', top: '50%', left: '50%', width: 8, height: 8,
                      marginLeft: -4, marginTop: -4, borderRadius: '50%', background: accent,
                      boxShadow: `0 0 12px ${accent}, 0 0 24px ${glow}`,
                      animation: 'msOrbit 4s linear infinite',
                    }} />
                    <span aria-hidden style={{
                      position: 'absolute', top: '50%', left: '50%', width: 5, height: 5,
                      marginLeft: -2.5, marginTop: -2.5, borderRadius: '50%', background: '#fff',
                      boxShadow: `0 0 10px #fff, 0 0 22px ${accent}`,
                      animation: 'msOrbitRev 6s linear infinite',
                    }} />
                    {/* pulsing rings */}
                    {phase === 'transmuting' && [0, 0.4, 0.8].map((d, i) => (
                      <span key={i} aria-hidden style={{
                        position: 'absolute', inset: 12, borderRadius: '50%',
                        border: `2px solid ${accent}`,
                        animation: `msPulseRing 1.4s ease-out ${d}s infinite`,
                      }} />
                    ))}
                    {/* core */}
                    <div style={{
                      position: 'absolute', inset: 18, borderRadius: '50%',
                      background: `radial-gradient(circle at 30% 30%, ${accent}, ${accent}44 60%, transparent 75%)`,
                      display: 'grid', placeItems: 'center',
                      boxShadow: `inset 0 0 30px ${glow}, 0 0 40px ${glow}`,
                      animation: phase === 'ask' ? 'msIconFloat 3.6s ease-in-out infinite' : undefined,
                    }}>
                      {phase === 'done'
                        ? <Check size={34} style={{ color: '#fff', filter: `drop-shadow(0 0 8px ${accent})`, animation: 'msCheckPop .6s cubic-bezier(.34,1.56,.64,1) forwards' }} />
                        : <Icon size={32} style={{ color: '#fff', filter: `drop-shadow(0 0 8px ${accent})` }} />}
                    </div>
                  </div>

                  {phase === 'done' && (
                    <>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const angle = (i / 10) * Math.PI * 2;
                        const dx = Math.cos(angle) * 80;
                        const dy = Math.sin(angle) * 80;
                        return (
                          <span key={i} aria-hidden style={{
                            position: 'absolute', top: 60, left: '50%',
                            width: 6, height: 6, borderRadius: '50%',
                            background: accent, boxShadow: `0 0 10px ${accent}`,
                            ['--dx' as any]: `${dx}px`, ['--dy' as any]: `${dy}px`,
                            animation: 'msSpark .9s ease-out forwards',
                          }} />
                        );
                      })}
                    </>
                  )}

                  {/* Tier label chip */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 999, marginBottom: 10,
                    background: `${accent}1c`, border: `1px solid ${accent}55`,
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
                    color: accent, textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <Sparkles size={11} /> {isRTL ? meta.labelHe : meta.label}
                  </div>

                  <h3 style={{
                    margin: 0, marginBottom: 6, fontSize: 20, fontWeight: 800,
                    background: `linear-gradient(90deg, #fff, ${accent})`,
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {phase === 'done'
                      ? (isRTL ? 'התוכנית הוחלפה' : 'Tier activated')
                      : phase === 'transmuting'
                        ? (isRTL ? 'מבצע החלפה…' : 'Switching…')
                        : (isRTL ? 'החלפת תוכנית' : 'Switch Tier')}
                  </h3>

                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 4 }}>
                    {isRTL ? meta.taglineHe : meta.tagline}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginBottom: 18, padding: '0 8px' }}>
                    {isRTL ? meta.descHe : meta.desc}
                  </div>

                  {phase === 'ask' && (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button onClick={close} style={{
                        padding: '10px 22px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                        color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        transition: 'all .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                      >{isRTL ? 'ביטול' : 'Cancel'}</button>
                      <button
                        onClick={handleTierConfirm}
                        onPointerUp={(e) => {
                          if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                            e.preventDefault();
                            handleTierConfirm();
                          }
                        }}
                        style={{
                        position: 'relative', overflow: 'hidden',
                        padding: '12px 28px', border: 'none', borderRadius: 12,
                        color: '#0a0e1a', cursor: 'pointer', fontSize: 12, fontWeight: 800,
                        letterSpacing: '0.06em', minHeight: 44,
                        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        boxShadow: `0 10px 28px -8px ${glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                        transition: 'all .2s',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <span aria-hidden style={{
                          position: 'absolute', top: 0, bottom: 0, width: '40%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)',
                          animation: 'msShimmer 2.2s ease-in-out infinite',
                        }} />
                        <span style={{ position: 'relative' }}>{isRTL ? 'אישור החלפה' : 'Confirm Switch'}</span>
                      </button>
                    </div>
                  )}

                  {phase === 'transmuting' && (
                    <div style={{
                      marginTop: 4, height: 4, borderRadius: 999, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.06)',
                    }}>
                      <div style={{
                        height: '100%', width: '45%', borderRadius: 999,
                        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                        animation: 'msShimmer 1.1s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body)}
    </>
  );
};
