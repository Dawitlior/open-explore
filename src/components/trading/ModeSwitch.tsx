import { useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { OperatingMode, SystemMode, Tier } from '@/hooks/use-settings';
import { useSettings } from '@/hooks/use-settings';
import { tierLabel } from '@/lib/tier-access';

interface ModeSwitchProps {
  T: TradingTheme;
  isRTL: boolean;
  // Legacy props kept for back-compat; ignored. Tier is read straight from settings.
  operatingMode?: OperatingMode;
  systemMode?: SystemMode;
  onOperatingModeChange?: (mode: OperatingMode) => void;
  onSystemModeChange?: (mode: SystemMode) => void;
  hiddenModes?: OperatingMode[];
  hideDepthSwitch?: boolean;
}

interface TierSpec {
  id: Tier;
  icon: string;
  color: (T: TradingTheme) => string;
  desc: { he: string; en: string };
}

const TIER_SPECS: TierSpec[] = [
  {
    id: 'starter',
    icon: '🎓',
    color: (T) => T.accent.cyan,
    desc: {
      he: 'יומן בסיסי: לוח שנה, יומן ידני, מד סיכון.',
      en: 'Basic journal: calendar, manual journal, risk meter.',
    },
  },
  {
    id: 'pro',
    icon: '📊',
    color: (T) => T.accent.blue,
    desc: {
      he: 'מקצועי: מכ״ם מלא, תובנות AI, סקירה שבועית, אנליטיקה.',
      en: 'Professional: full radar, AI insights, weekly review, analytics.',
    },
  },
  {
    id: 'alpha',
    icon: '⚡',
    color: (T) => T.accent.purple,
    desc: {
      he: 'אלפא: גישה מלאה כולל אורקל, מעבדת קוונט וווידג׳טים מתקדמים.',
      en: 'Alpha: full access including Oracle, QuantLab, advanced widgets.',
    },
  },
];

export const ModeSwitch = ({ T, isRTL }: ModeSwitchProps) => {
  const settings = useSettings();
  const [pending, setPending] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = () => {
    if (!pending) return;
    setLoading(true);
    setTimeout(() => {
      settings.setTier(pending);
      setLoading(false);
      setPending(null);
    }, 500);
  };

  return (
    <>
      <div style={{ padding: '0 10px', marginBottom: 10 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
          color: T.text.muted, textTransform: 'uppercase', marginBottom: 6,
          fontFamily: "'IBM Plex Mono', monospace", paddingInlineStart: 4,
        }}>
          {isRTL ? 'מסלול' : 'Tier'}
        </div>
        <div style={{ display: 'flex', gap: 3, background: T.bg.primary, borderRadius: T.radius.md, padding: 3 }}>
          {TIER_SPECS.map(spec => {
            const active = settings.tier === spec.id;
            const c = spec.color(T);
            return (
              <button
                key={spec.id}
                onClick={() => { if (!active) setPending(spec.id); }}
                aria-pressed={active}
                style={{
                  flex: 1, padding: '7px 4px', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: 'none', borderRadius: T.radius.sm, cursor: 'pointer',
                  background: active ? `${c}20` : 'transparent',
                  color: active ? c : T.text.muted,
                  transition: 'all 0.2s', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <span style={{ fontSize: 12 }}>{spec.icon}</span>
                <span>{tierLabel(spec.id, isRTL)}</span>
                {active && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: c, borderRadius: 1 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {pending && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
          onClick={() => !loading && setPending(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            padding: 32, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: T.shadow.elevated,
          }}>
            {loading ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1s ease infinite' }}>⚡</div>
                <div style={{ fontSize: 14, color: T.accent.cyan, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  {isRTL ? 'מחליף מסלול...' : 'Switching tier...'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{TIER_SPECS.find(s => s.id === pending)?.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                  {isRTL ? `מעבר ל-${tierLabel(pending, true)}` : `Switch to ${tierLabel(pending, false)}`}
                </div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6, marginBottom: 20 }}>
                  {TIER_SPECS.find(s => s.id === pending)?.desc[isRTL ? 'he' : 'en']}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={() => setPending(null)} style={{
                    padding: '9px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`,
                    borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12,
                  }}>{isRTL ? 'ביטול' : 'Cancel'}</button>
                  <button onClick={confirm} style={{
                    padding: '9px 24px', border: 'none', borderRadius: T.radius.md, color: T.bg.primary,
                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.purple})`,
                  }}>{isRTL ? 'אשר' : 'Confirm'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
