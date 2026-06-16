import { useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { useKillSwitch, formatKillRemaining } from '@/hooks/use-kill-switch';

interface Props { T: TradingTheme; isRTL: boolean; }

/**
 * Kill Switch — blocks new trade submissions for a chosen duration.
 * Release requires typing UNLOCK (high friction, intentional).
 */
export const KillSwitchPanel = ({ T, isRTL }: Props) => {
  const { isLocked, msRemaining, engage, release, state } = useKillSwitch();
  const [confirmHours, setConfirmHours] = useState<number | null>(null);
  const [unlockText, setUnlockText] = useState('');

  const presetHours = [1, 4, 24];
  const presetLabel = (h: number) =>
    h === 1 ? (isRTL ? 'שעה' : '1h')
      : h === 4 ? (isRTL ? '4 שעות' : '4h')
        : (isRTL ? '24 שעות' : '24h');

  return (
    <div style={{
      background: isLocked
        ? `linear-gradient(135deg, ${T.accent.red}15, ${T.accent.red}05)`
        : T.bg.card,
      border: `1px solid ${isLocked ? T.accent.red + '60' : T.border.medium}`,
      borderRadius: 12,
      padding: 14,
      boxShadow: isLocked ? `0 0 24px ${T.accent.red}30` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}>{isLocked ? '🛑' : '🟢'}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, color: T.text.muted, textTransform: 'uppercase',
            letterSpacing: '0.16em', fontFamily: "'JetBrains Mono', monospace",
          }}>
            {isRTL ? 'מתג ביטחון' : 'Kill Switch'}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: isLocked ? T.accent.red : T.accent.green,
          }}>
            {isLocked
              ? (isRTL ? `נעול · נותר ${formatKillRemaining(msRemaining, true)}` : `LOCKED · ${formatKillRemaining(msRemaining, false)} left`)
              : (isRTL ? 'פעיל — מסחר חופשי' : 'CLEAR — trading allowed')}
          </div>
        </div>
      </div>

      <div style={{
        fontSize: 11, color: T.text.secondary, lineHeight: 1.55, marginBottom: 12,
      }}>
        {isLocked
          ? (isRTL
            ? `הופעל ב-${state.engagedAt ? new Date(state.engagedAt).toLocaleString('he-IL') : '—'}. כל ניסיון לפתוח עסקה חדשה ייחסם עד שחרור ידני או סיום הזמן.`
            : `Engaged ${state.engagedAt ? new Date(state.engagedAt).toLocaleString() : '—'}. New trade submissions will be blocked until manual release or timeout.`)
          : (isRTL
            ? 'מנעול אחד-לחיצה למנוע "עוד עסקה אחת" רגשית. בחר משך — והמערכת תחסום פתיחות חדשות.'
            : 'One-tap lock to prevent the emotional "just one more trade". Pick a duration — the system will block new entries.')}
      </div>

      {!isLocked && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presetHours.map(h => (
              <button key={h} onClick={() => setConfirmHours(h)}
                style={{
                  flex: 1, minWidth: 80, padding: '10px 12px',
                  background: confirmHours === h ? `${T.accent.red}25` : T.bg.tertiary,
                  border: `1px solid ${confirmHours === h ? T.accent.red : T.border.medium}`,
                  borderRadius: 8, color: T.text.primary,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {presetLabel(h)}
              </button>
            ))}
          </div>

          {confirmHours != null && (
            <div style={{
              marginTop: 10, padding: 10,
              background: `${T.accent.red}10`, border: `1px solid ${T.accent.red}40`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, color: T.text.primary, marginBottom: 8 }}>
                {isRTL
                  ? `לחסום פתיחת עסקאות חדשות למשך ${presetLabel(confirmHours)}?`
                  : `Block new trade entries for ${presetLabel(confirmHours)}?`}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { engage(confirmHours); setConfirmHours(null); }}
                  style={{
                    flex: 1, padding: '8px 12px',
                    background: T.accent.red, color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontWeight: 700, fontSize: 12,
                  }}>
                  {isRTL ? 'הפעל מתג' : 'Engage Kill Switch'}
                </button>
                <button onClick={() => setConfirmHours(null)}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent', color: T.text.muted,
                    border: `1px solid ${T.border.medium}`, borderRadius: 6, cursor: 'pointer',
                    fontSize: 12,
                  }}>
                  {isRTL ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isLocked && (
        <div style={{
          padding: 10,
          background: `${T.bg.tertiary}`,
          border: `1px solid ${T.border.medium}`,
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 6 }}>
            {isRTL ? 'לשחרור ידני, הקלד UNLOCK:' : 'To release manually, type UNLOCK:'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={unlockText} onChange={(e) => setUnlockText(e.target.value)}
              placeholder="UNLOCK"
              style={{
                flex: 1, padding: '8px 12px',
                background: T.bg.primary,
                border: `1px solid ${T.border.medium}`,
                borderRadius: 6, color: T.text.primary,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              }} />
            <button disabled={unlockText.trim() !== 'UNLOCK'}
              onClick={() => { release(); setUnlockText(''); }}
              style={{
                padding: '8px 14px',
                background: unlockText.trim() === 'UNLOCK' ? T.accent.green : T.bg.tertiary,
                color: unlockText.trim() === 'UNLOCK' ? '#fff' : T.text.muted,
                border: 'none', borderRadius: 6,
                cursor: unlockText.trim() === 'UNLOCK' ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: 12,
              }}>
              {isRTL ? 'שחרר' : 'Release'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
