import type { TradingTheme } from '@/lib/trading-theme';
import type { RiskLimitStatus } from '@/lib/risk-limits';

interface RiskLimitAlertProps {
  T: TradingTheme;
  isRTL: boolean;
  status: RiskLimitStatus;
  onClose: () => void;
}

export const RiskLimitAlert = ({ T, isRTL, status, onClose }: RiskLimitAlertProps) => {
  if (status.breachedLevel === 'none') return null;

  const levelConfig = {
    daily: { icon: '⚠️', color: T.accent.orange, title: isRTL ? 'מגבלת הפסד יומית' : 'Daily Loss Limit' },
    weekly: { icon: '🔴', color: T.accent.red, title: isRTL ? 'מגבלת הפסד שבועית' : 'Weekly Loss Limit' },
    monthly: { icon: '🚨', color: '#991b1b', title: isRTL ? 'מגבלת הפסד חודשית' : 'Monthly Loss Limit' },
  };

  const cfg = levelConfig[status.breachedLevel as keyof typeof levelConfig];
  if (!cfg) return null;

  // Sound alert
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 600; gain.gain.value = 0.2;
    osc.start();
    setTimeout(() => { osc.frequency.value = 400; }, 150);
    setTimeout(() => { osc.stop(); ctx.close(); }, 350);
  } catch (_) { /* ignore */ }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bg.card, border: `2px solid ${cfg.color}`,
        borderRadius: T.radius.xl, padding: 32, maxWidth: 480, width: '90%',
        textAlign: 'center', boxShadow: `0 0 60px ${cfg.color}40`,
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{cfg.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.8, marginBottom: 8 }}>
          {isRTL ? status.messageHe : status.message}
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, marginBottom: 20 }}>
          <div style={{ padding: '8px 14px', background: T.bg.tertiary, borderRadius: T.radius.md }}>
            <div style={{ fontSize: 8, color: T.text.dim, textTransform: 'uppercase' }}>{isRTL ? 'הפסד יומי' : 'Daily'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: status.dailyBreached ? T.accent.red : T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{status.dailyNegR.toFixed(1)}R</div>
          </div>
          <div style={{ padding: '8px 14px', background: T.bg.tertiary, borderRadius: T.radius.md }}>
            <div style={{ fontSize: 8, color: T.text.dim, textTransform: 'uppercase' }}>{isRTL ? 'הפסד שבועי' : 'Weekly'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: status.weeklyBreached ? T.accent.red : T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{status.weeklyNegR.toFixed(1)}R</div>
          </div>
          <div style={{ padding: '8px 14px', background: T.bg.tertiary, borderRadius: T.radius.md }}>
            <div style={{ fontSize: 8, color: T.text.dim, textTransform: 'uppercase' }}>{isRTL ? 'הפסד חודשי' : 'Monthly'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: status.monthlyBreached ? T.accent.red : T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{status.monthlyNegR.toFixed(1)}R</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          padding: '10px 32px', background: `${cfg.color}20`, border: `1px solid ${cfg.color}`,
          borderRadius: T.radius.md, color: cfg.color, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isRTL ? 'הבנתי' : 'I Understand'}
        </button>
      </div>
    </div>
  );
};
