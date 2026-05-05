import { useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { OperatingMode, SystemMode } from '@/hooks/use-settings';
import { modeColors } from '@/lib/trading-theme';

interface ModeSwitchProps {
  T: TradingTheme;
  isRTL: boolean;
  operatingMode: OperatingMode;
  systemMode: SystemMode;
  onOperatingModeChange: (mode: OperatingMode) => void;
  onSystemModeChange: (mode: SystemMode) => void;
  hiddenModes?: OperatingMode[];
  hideDepthSwitch?: boolean;
}

export const ModeSwitch = ({ T, isRTL, operatingMode, systemMode, onOperatingModeChange, onSystemModeChange, hiddenModes = [], hideDepthSwitch = false }: ModeSwitchProps) => {
  const [pendingMode, setPendingMode] = useState<{ type: 'operating' | 'depth'; value: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleModeConfirm = () => {
    if (!pendingMode) return;
    setLoading(true);
    setTimeout(() => {
      if (pendingMode.type === 'operating') {
        onOperatingModeChange(pendingMode.value as OperatingMode);
      } else {
        onSystemModeChange(pendingMode.value as SystemMode);
      }
      setLoading(false);
      setPendingMode(null);
    }, 600);
  };

  const operatingModes: { id: OperatingMode; label: string; labelHe: string; color: string; desc: string; descHe: string }[] = ([
    { id: 'beginner', label: 'BEGINNER', labelHe: 'מתחיל', color: modeColors.beginner || '#22d3ee', desc: 'Simplified dashboard for new traders', descHe: 'לוח פשוט לסוחרים מתחילים' },
    { id: 'live', label: 'LIVE', labelHe: 'חי', color: modeColors.live, desc: 'Real-time execution focus', descHe: 'מיקוד ביצוע בזמן אמת' },
    { id: 'review', label: 'REVIEW', labelHe: 'סקירה', color: modeColors.review, desc: 'Statistical intelligence', descHe: 'מודיעין סטטיסטי' },
    { id: 'research', label: 'RESEARCH', labelHe: 'מחקר', color: modeColors.research, desc: 'Advanced analytics lab', descHe: 'מעבדת אנליטיקה מתקדמת' },
  ];

  return (
    <>
      {/* Operating Mode Switcher */}
      <div style={{ padding: '0 10px', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 3, background: T.bg.primary, borderRadius: T.radius.md, padding: 3 }}>
          {operatingModes.map(m => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id !== operatingMode) setPendingMode({ type: 'operating', value: m.id });
              }}
              style={{
                flex: 1, padding: '5px 2px', fontSize: 8, fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer',
                background: operatingMode === m.id ? `${m.color}20` : 'transparent',
                color: operatingMode === m.id ? m.color : T.text.muted,
                transition: 'all 0.2s', position: 'relative',
              }}
            >
              {operatingMode === m.id && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: m.color, borderRadius: 1 }} />}
              {isRTL ? m.labelHe : m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Depth Mode Switcher */}
      <div style={{ padding: '0 10px', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 3, background: T.bg.primary, borderRadius: T.radius.md, padding: 3 }}>
          {(['standard', 'alpha'] as SystemMode[]).map(m => (
            <button
              key={m}
              onClick={() => {
                if (m !== systemMode) setPendingMode({ type: 'depth', value: m });
              }}
              style={{
                flex: 1, padding: '5px 2px', fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer',
                background: systemMode === m ? (m === 'alpha' ? `${T.accent.purple}20` : `${T.accent.blue}15`) : 'transparent',
                color: systemMode === m ? (m === 'alpha' ? T.accent.purple : T.accent.blue) : T.text.muted,
                transition: 'all 0.2s'
              }}
            >
              {m === 'standard' ? (isRTL ? 'סטנדרט' : 'Standard') : (isRTL ? 'אלפא' : 'Alpha')}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={() => !loading && setPendingMode(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            padding: 32, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: T.shadow.elevated,
          }}>
            {loading ? (
              <div>
                <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1s ease infinite' }}>⚡</div>
                <div style={{ fontSize: 14, color: T.accent.cyan, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  {isRTL ? 'טוען מצב...' : 'Loading mode...'}
                </div>
                <div style={{ marginTop: 16, height: 3, background: T.bg.tertiary, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '70%', background: `linear-gradient(90deg, ${T.accent.cyan}, ${T.accent.purple})`, borderRadius: 2, animation: 'slideRight 0.6s ease infinite' }} />
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>
                  {pendingMode.type === 'depth' && pendingMode.value === 'alpha' ? '🔓' : 
                   pendingMode.type === 'operating' && pendingMode.value === 'beginner' ? '🎓' : '🔄'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                  {pendingMode.type === 'depth' && pendingMode.value === 'alpha'
                    ? (isRTL ? 'הפעלת מצב Alpha' : 'Activate Alpha Mode')
                    : pendingMode.type === 'operating' && pendingMode.value === 'beginner'
                      ? (isRTL ? 'מעבר למצב מתחיל' : 'Switch to Beginner Mode')
                      : (isRTL ? 'החלפת מצב' : 'Switch Mode')}
                </div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6, marginBottom: 6 }}>
                  {pendingMode.type === 'operating'
                    ? operatingModes.find(m => m.id === pendingMode.value)?.[isRTL ? 'descHe' : 'desc']
                    : pendingMode.value === 'alpha'
                      ? (isRTL ? 'מצב Alpha מפעיל מדדים מתקדמים, צפיפות נתונים גבוהה, ומודלים חזויים.' : 'Alpha mode activates advanced metrics, high data density, and predictive modeling.')
                      : (isRTL ? 'מצב Standard מציג ממשק נקי ומינימלי.' : 'Standard mode shows a clean, minimal interface.')}
                </div>
                <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 20 }}>
                  {isRTL ? 'הלוח יתעדכן בהתאם למצב החדש.' : 'Dashboard will reconfigure for the new mode.'}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={() => setPendingMode(null)} style={{
                    padding: '9px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`,
                    borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12
                  }}>{isRTL ? 'ביטול' : 'Cancel'}</button>
                  <button onClick={handleModeConfirm} style={{
                    padding: '9px 24px', border: 'none', borderRadius: T.radius.md, color: T.bg.primary,
                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: pendingMode.value === 'alpha'
                      ? `linear-gradient(135deg, ${T.accent.purple}, ${T.accent.blue})`
                      : pendingMode.value === 'beginner'
                        ? `linear-gradient(135deg, #22d3ee, #06b6d4)`
                        : `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`
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
