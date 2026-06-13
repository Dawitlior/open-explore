import { useState } from 'react';
import { toast } from 'sonner';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';

interface ResetModalProps {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ResetModal = ({ T, t, isRTL, onConfirm, onClose }: ResetModalProps) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0=warning, 1=red confirm, 2=wiping, 3=done
  const [closing, setClosing] = useState(false);

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.18;
      osc.start();
      setTimeout(() => { osc.frequency.value = 330; }, 150);
      setTimeout(() => { try { osc.stop(); ctx.close(); } catch { /* ignore */ } }, 400);
    } catch { /* ignore */ }
  };

  const handleFinalConfirm = async () => {
    playAlertSound();
    setStep(2);
    try {
      await Promise.resolve(onConfirm());
      setStep(3);
      // Smooth fade-out then close
      setTimeout(() => {
        setClosing(true);
        setTimeout(() => onClose(), 350);
      }, 600);
    } catch (err) {
      console.error('[Reset] Failed:', err);
      toast.error(isRTL ? 'איפוס נכשל. נסה שוב.' : 'Reset failed. Please try again.');
      setStep(1);
    }
  };

  const handleClose = () => {
    if (step === 2) return; // can't close mid-wipe
    setClosing(true);
    setTimeout(() => onClose(), 250);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0,
        background: step === 3 ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.8)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.35s ease, background 0.6s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.bg.card,
          border: `2px solid ${step >= 1 ? T.accent.red : T.border.medium}`,
          borderRadius: T.radius.xl,
          padding: 32, maxWidth: 440, width: '90%', textAlign: 'center',
          boxShadow: step >= 1 ? `0 0 40px ${T.accent.redGlow}` : T.shadow.elevated,
          transition: 'all 0.3s ease',
          transform: closing ? 'scale(0.92)' : step === 3 ? 'scale(1.02)' : 'scale(1)',
          opacity: closing ? 0 : 1,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16, animation: step === 2 ? 'pulse 1s infinite' : undefined }}>
          {step === 0 ? '⚠️' : step === 1 ? '🔴' : step === 2 ? '🌀' : '✅'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: step === 0 ? T.accent.orange : step === 3 ? T.accent.green : T.accent.red, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          {step === 0 ? t.resetAll
            : step === 1 ? (isRTL ? 'אזהרה אחרונה' : 'FINAL WARNING')
            : step === 2 ? (isRTL ? 'מוחק נתונים…' : 'WIPING DATA…')
            : (isRTL ? 'הכל נמחק' : 'ALL CLEAR')}
        </div>
        <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7, marginBottom: 24 }}>
          {step === 0 ? t.resetWarning
            : step === 1 ? (isRTL ? 'כל העסקאות, היומנים, ההגדרות והנתונים יימחקו לצמיתות. אין דרך חזרה.' : 'All trades, journals, settings, and data will be permanently destroyed. There is no going back.')
            : step === 2 ? (isRTL ? 'מנקה את אורקה ויומן גורנל…' : 'Clearing Orca + Journal storage…')
            : (isRTL ? 'המערכת אופסה בהצלחה.' : 'System reset successfully.')}
        </div>

        {step < 2 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={handleClose} style={{ padding: '10px 24px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>{t.cancel}</button>
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
        )}

        {step === 2 && (
          <div style={{ height: 4, width: '100%', background: T.bg.tertiary, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '40%', background: `linear-gradient(90deg, transparent, ${T.accent.red}, transparent)`, animation: 'resetSlide 1.2s linear infinite' }} />
          </div>
        )}
      </div>
      <style>{`
        @keyframes resetSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
      `}</style>
    </div>
  );
};
