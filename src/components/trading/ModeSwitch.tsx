import { useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { AppTier } from '@/hooks/use-entitlement';
import { useEntitlement } from '@/hooks/use-entitlement';

interface ModeSwitchProps {
  T: TradingTheme;
  isRTL: boolean;
}

const TIER_OPTIONS: { id: AppTier; label: string; labelHe: string; color: (T: TradingTheme) => string; desc: string; descHe: string }[] = [
  { id: 'standard', label: 'STANDARD', labelHe: 'סטנדרט', color: (T) => T.accent.blue, desc: 'Core journal, risk limits, calendar, and baseline analytics', descHe: 'יומן, מגבלות סיכון, קלנדר ואנליטיקה בסיסית' },
  { id: 'advanced', label: 'ADVANCED', labelHe: 'מתקדם', color: (T) => T.accent.cyan, desc: 'Professional analytics, R/$ chart controls, and deeper diagnostics', descHe: 'אנליטיקה מקצועית, בקרות R/$ ודיאגנוסטיקה עמוקה' },
  { id: 'ultimate', label: 'ULTIMATE', labelHe: 'אולטימייט', color: (T) => T.accent.purple, desc: 'Full quant engine, Kelly, MAR, autocorrelation, and drawdown structure', descHe: 'מנוע כמותי מלא, Kelly, MAR, אוטוקורלציה ומבנה Drawdown' },
];

export const ModeSwitch = ({ T, isRTL }: ModeSwitchProps) => {
  const { tier } = useEntitlement();
  const [pendingTier, setPendingTier] = useState<AppTier | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTierConfirm = () => {
    if (!pendingTier) return;
    setLoading(true);
    setTimeout(() => {
      window.localStorage.setItem('orca:tier-preview', pendingTier);
      window.dispatchEvent(new CustomEvent('orca:tier-preview-changed', { detail: { tier: pendingTier } }));
      setLoading(false);
      setPendingTier(null);
    }, 600);
  };

  return (
    <>
      <div style={{ padding: '0 10px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 3, background: T.bg.primary, borderRadius: T.radius.md, padding: 3 }}>
          {TIER_OPTIONS.map(m => {
            const color = m.color(T);
            return (
            <button
              key={m.id}
              onClick={() => {
                if (m.id !== tier) setPendingTier(m.id);
              }}
              style={{
                flex: 1, padding: '5px 2px', fontSize: 8, fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer',
                background: tier === m.id ? `${color}20` : 'transparent',
                color: tier === m.id ? color : T.text.muted,
                transition: 'all 0.2s', position: 'relative',
              }}
            >
              {tier === m.id && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: color, borderRadius: 1 }} />}
              {isRTL ? m.labelHe : m.label}
            </button>
          );})}
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingTier && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={() => !loading && setPendingTier(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            padding: 32, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: T.shadow.elevated,
          }}>
            {loading ? (
              <div>
                <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1s ease infinite' }}>⚡</div>
                <div style={{ fontSize: 14, color: T.accent.cyan, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  {isRTL ? 'טוען תוכנית...' : 'Loading tier...'}
                </div>
                <div style={{ marginTop: 16, height: 3, background: T.bg.tertiary, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '70%', background: `linear-gradient(90deg, ${T.accent.cyan}, ${T.accent.purple})`, borderRadius: 2, animation: 'slideRight 0.6s ease infinite' }} />
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔓</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                  {isRTL ? 'החלפת תוכנית' : 'Switch Tier'}
                </div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6, marginBottom: 6 }}>
                  {TIER_OPTIONS.find(m => m.id === pendingTier)?.[isRTL ? 'descHe' : 'desc']}
                </div>
                <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 20 }}>
                  {isRTL ? 'המערכת תציג שכבות Standard / Advanced / Ultimate בלבד.' : 'The app will show Standard / Advanced / Ultimate layers only.'}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={() => setPendingTier(null)} style={{
                    padding: '9px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`,
                    borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12
                  }}>{isRTL ? 'ביטול' : 'Cancel'}</button>
                  <button onClick={handleTierConfirm} style={{
                    padding: '9px 24px', border: 'none', borderRadius: T.radius.md, color: T.bg.primary,
                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: pendingTier === 'ultimate'
                      ? `linear-gradient(135deg, ${T.accent.purple}, ${T.accent.blue})`
                      : pendingTier === 'advanced'
                        ? `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`
                        : `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.cyan})`
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
