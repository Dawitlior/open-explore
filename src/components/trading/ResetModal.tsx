import { useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';

interface ResetModalProps {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ResetModal = ({ T, t, isRTL, onConfirm, onClose }: ResetModalProps) => {
  const [step, setStep] = useState(0); // 0=warning, 1=red confirm

  const handleFinalConfirm = () => {
    // Sound alert
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.frequency.value = 330; }, 150);
      setTimeout(() => { osc.stop(); ctx.close(); }, 400);
    } catch (_) { /* ignore */ }
    onConfirm();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg.card, border: `2px solid ${step === 1 ? T.accent.red : T.border.medium}`, borderRadius: T.radius.xl, padding: 32, maxWidth: 440, width: '90%', textAlign: 'center', boxShadow: step === 1 ? `0 0 40px ${T.accent.redGlow}` : T.shadow.elevated, transition: 'all 0.3s ease' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{step === 0 ? '⚠️' : '🔴'}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: step === 0 ? T.accent.orange : T.accent.red, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          {step === 0 ? t.resetAll : (isRTL ? 'אזהרה אחרונה' : 'FINAL WARNING')}
        </div>
        <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7, marginBottom: 24 }}>
          {step === 0 ? t.resetWarning : (isRTL ? 'כל העסקאות, ההגדרות והנתונים יימחקו לצמיתות. אין דרך חזרה.' : 'All trades, settings, and data will be permanently destroyed. There is no going back.')}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>{t.cancel}</button>
          {step === 0 ? (
            <button onClick={() => setStep(1)} style={{ padding: '10px 24px', background: `${T.accent.orange}20`, border: `1px solid ${T.accent.orange}`, borderRadius: T.radius.md, color: T.accent.orange, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {isRTL ? 'המשך' : 'Continue'}
            </button>
          ) : (
            <button onClick={handleFinalConfirm} style={{ padding: '10px 24px', background: `linear-gradient(135deg, ${T.accent.red}, #991b1b)`, border: 'none', borderRadius: T.radius.md, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, animation: 'pulse 2s infinite' }}>
              {t.resetConfirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
