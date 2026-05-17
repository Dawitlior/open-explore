import { useState, useMemo, useEffect } from 'react';
import { useUserPreferences, DEFAULT_PREFS, type UserPreferences } from '@/hooks/use-user-preferences';
import { scopedStorage } from '@/lib/scoped-storage';
import { toast } from 'sonner';

/**
 * RiskOnboardingWizard — three-step setup modal (Theme → Risk Matrix → Broker API
 * Firewall guide). Triggers once when the authenticated user's `user_preferences`
 * row still contains the default uninitialized values, then persists the user's
 * choices via the preferences hook and dismisses itself.
 */

const DISMISS_KEY = 'orca-risk-onboarding-done';

const THEMES: { id: string; label: { he: string; en: string }; swatch: string[] }[] = [
  { id: 'orca-neon', label: { he: 'Orca ניאון', en: 'Orca Neon' }, swatch: ['#061326', '#0b1730', '#00f2ff', '#06d6a0'] },
  { id: 'midnight', label: { he: 'חצות', en: 'Midnight' }, swatch: ['#020202', '#0b1730', '#00f2ff', '#3b82f6'] },
  { id: 'indigo', label: { he: 'אינדיגו ליל', en: 'Indigo Noir' }, swatch: ['#06030f', '#1a1338', '#a78bfa', '#6366f1'] },
  { id: 'platinum', label: { he: 'לבן יוקרתי', en: 'Platinum' }, swatch: ['#ffffff', '#f1f5f9', '#1d4ed8', '#b45309'] },
];

export function shouldShowRiskOnboarding(prefs: UserPreferences, loaded: boolean): boolean {
  if (!loaded) return false;
  if (scopedStorage.getSync(DISMISS_KEY)) return false;
  // Show only when the saved row still matches all of the seed defaults.
  return (
    prefs.theme === DEFAULT_PREFS.theme &&
    Number(prefs.daily_risk_limit) === DEFAULT_PREFS.daily_risk_limit &&
    Number(prefs.weekly_risk_limit) === DEFAULT_PREFS.weekly_risk_limit &&
    Number(prefs.monthly_risk_limit) === DEFAULT_PREFS.monthly_risk_limit &&
    Number(prefs.risk_per_trade_default) === DEFAULT_PREFS.risk_per_trade_default
  );
}

interface Props {
  isRTL: boolean;
  onDismiss: () => void;
}

export const RiskOnboardingWizard = ({ isRTL, onDismiss }: Props) => {
  const { prefs, update } = useUserPreferences();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [theme, setTheme] = useState<string>(prefs.theme);
  const [perTrade, setPerTrade] = useState<string>(String(prefs.risk_per_trade_default));
  const [daily, setDaily] = useState<string>(String(prefs.daily_risk_limit));
  const [weekly, setWeekly] = useState<string>(String(prefs.weekly_risk_limit));
  const [monthly, setMonthly] = useState<string>(String(prefs.monthly_risk_limit));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const t = (he: string, en: string) => (isRTL ? he : en);

  const parsed = useMemo(() => ({
    perTrade: parseFloat(perTrade),
    daily: parseFloat(daily),
    weekly: parseFloat(weekly),
    monthly: parseFloat(monthly),
  }), [perTrade, daily, weekly, monthly]);

  const matrixValid =
    [parsed.perTrade, parsed.daily, parsed.weekly, parsed.monthly].every(n => Number.isFinite(n) && n > 0);

  const finish = async () => {
    if (!matrixValid) {
      toast.error(t('כל הערכים חייבים להיות חיוביים', 'All values must be positive'));
      return;
    }
    try {
      setSaving(true);
      await update({
        theme,
        daily_risk_limit: parsed.daily,
        weekly_risk_limit: parsed.weekly,
        monthly_risk_limit: parsed.monthly,
        risk_per_trade_default: parsed.perTrade,
      });
      void scopedStorage.setItem(DISMISS_KEY, '1');
      toast.success(t('ההגדרות נשמרו', 'Preferences saved'));
      onDismiss();
    } catch {
      toast.error(t('שמירה נכשלה', 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    void scopedStorage.setItem(DISMISS_KEY, '1');
    onDismiss();
  };

  const ACCENT = '#00f2ff';
  const TEAL = '#06d6a0';
  const BG_CARD = 'linear-gradient(165deg, rgba(11,23,48,0.96), rgba(6,19,38,0.96))';

  const stepperDots = (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{
          width: s === step ? 24 : 8, height: 8, borderRadius: 4,
          background: s <= step ? ACCENT : 'rgba(255,255,255,0.12)',
          transition: 'all 0.35s ease',
          boxShadow: s === step ? `0 0 12px ${ACCENT}80` : 'none',
        }} />
      ))}
    </div>
  );

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 99997,
        background: 'rgba(2, 8, 20, 0.78)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'Poppins', 'Inter', sans-serif",
        animation: 'orcaRiskFadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes orcaRiskFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orcaRiskCardIn { from { transform: translateY(18px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>
      <div style={{
        width: '100%', maxWidth: 580,
        background: BG_CARD,
        border: `1px solid ${ACCENT}30`,
        borderRadius: 22,
        padding: '28px 26px 24px',
        boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px ${ACCENT}20, 0 0 60px ${ACCENT}20`,
        animation: 'orcaRiskCardIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        color: '#f1f5f9',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {stepperDots}

        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('הגדרת חשבון ראשונית', 'Initial Setup')}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 4px', letterSpacing: '-0.01em' }}>
            {step === 1 && t('בחר ערכת נושא', 'Choose your theme')}
            {step === 2 && t('מטריצת ניהול סיכון', 'Risk Management Matrix')}
            {step === 3 && t('Firewall ל-API של הברוקר', 'Broker API Firewall')}
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(241,245,249,0.55)', margin: '0 0 18px', lineHeight: 1.55 }}>
            {step === 1 && t('כל הצבעים, הגרפים והאקצנטים יתאימו את עצמם בהתאם.', 'Every chart, accent, and surface will adapt to this choice.')}
            {step === 2 && t('הגדר את גבולות הסיכון שלך בדולרים. מנוע ה-R יסתמך על הערכים האלה.', 'Define your USD risk budgets. The R-engine uses them as Tier-3 fallback.')}
            {step === 3 && t('מפתחות API של הברוקר מוגבלים ל-Read-Only בלבד. אף פקודת מסחר לא תישלח מהמערכת.', 'Broker API keys are restricted to Read-Only scope. No trades will ever be placed from this platform.')}
          </p>
        </div>

        {/* STEP 1 — THEME */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            {THEMES.map(opt => {
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  style={{
                    padding: 14, borderRadius: 14, cursor: 'pointer',
                    background: active ? `${ACCENT}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? `${ACCENT}80` : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.25s ease',
                    textAlign: 'start',
                    boxShadow: active ? `0 0 18px ${ACCENT}30` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {opt.swatch.map(c => (
                      <div key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? ACCENT : '#f1f5f9' }}>
                    {isRTL ? opt.label.he : opt.label.en}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2 — RISK MATRIX */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
            {([
              { label: t('סיכון לעסקה ($)', 'Per-trade risk ($)'), val: perTrade, setter: setPerTrade, hint: t('ברירת מחדל כל פוזיציה חדשה', 'Default for each new position') },
              { label: t('מגבלה יומית ($)', 'Daily limit ($)'), val: daily, setter: setDaily, hint: t('שמש כ-Proxy ב-R-Engine', 'Used as Tier-3 R proxy') },
              { label: t('מגבלה שבועית ($)', 'Weekly limit ($)'), val: weekly, setter: setWeekly, hint: t('עצירה רכה', 'Soft stop') },
              { label: t('מגבלה חודשית ($)', 'Monthly limit ($)'), val: monthly, setter: setMonthly, hint: t('עצירה קשה', 'Hard stop') },
            ] as const).map(f => (
              <label key={f.label} style={{
                padding: 12, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'block',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: TEAL, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {f.label}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={f.val}
                  onChange={e => f.setter(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(0,0,0,0.35)',
                    border: `1px solid ${ACCENT}40`,
                    color: '#f1f5f9', fontSize: 16, fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace", textAlign: 'center',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: 9.5, color: 'rgba(241,245,249,0.45)', marginTop: 5, textAlign: 'center' }}>{f.hint}</div>
              </label>
            ))}
          </div>
        )}

        {/* STEP 3 — BROKER API FIREWALL */}
        {step === 3 && (
          <div style={{
            padding: 16, borderRadius: 14, marginBottom: 18,
            background: `linear-gradient(135deg, ${ACCENT}10, ${TEAL}08)`,
            border: `1px solid ${ACCENT}35`,
            fontSize: 12.5, lineHeight: 1.65, color: 'rgba(241,245,249,0.82)',
          }}>
            <div style={{ fontWeight: 800, color: ACCENT, marginBottom: 8, fontSize: 13 }}>
              🛡️ {t('מדיניות אבטחה', 'Security Policy')}
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              <li>{t('מפתחות API מאוחסנים במנגנון Vault מוצפן, מבודד פר משתמש.', 'API keys are stored inside a per-user encrypted Vault.')}</li>
              <li>{t('Scope קשיח: Read-Only / היסטוריה בלבד. אין הרשאת מסחר.', 'Hard scope: Read-Only / history only. No trading permission.')}</li>
              <li>{t('כל בקשה מחויבת ב-RLS — נתונים שלך אף פעם לא נחשפים למשתמש אחר.', 'Every request is RLS-gated — your data is never visible to other users.')}</li>
              <li>{t('ניתן למחוק את המפתח בכל רגע מתפריט ההגדרות.', 'You can revoke the key at any time from the Settings panel.')}</li>
            </ul>
          </div>
        )}

        {/* Footer controls */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <button
            onClick={skip}
            style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(241,245,249,0.45)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t('דלג בינתיים', 'Skip for now')}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                style={{
                  padding: '10px 18px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(241,245,249,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                ← {t('חזור', 'Back')}
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                disabled={step === 2 && !matrixValid}
                style={{
                  padding: '10px 22px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${ACCENT}, ${TEAL})`,
                  color: '#06131F', border: 'none',
                  cursor: step === 2 && !matrixValid ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                  opacity: step === 2 && !matrixValid ? 0.55 : 1,
                  boxShadow: `0 6px 18px ${ACCENT}40`,
                }}
              >
                {t('המשך', 'Continue')} →
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                style={{
                  padding: '10px 22px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${TEAL}, #0d9488)`,
                  color: '#06131F', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                  boxShadow: `0 6px 18px ${TEAL}40`,
                }}
              >
                {saving ? '…' : t('שמור והפעל', 'Save & Activate')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
