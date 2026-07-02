import { useState, useMemo, useEffect } from 'react';
import { useUserPreferences, DEFAULT_PREFS, type UserPreferences } from '@/hooks/use-user-preferences';
import { scopedStorage } from '@/lib/scoped-storage';
import { toast } from 'sonner';

/**
 * RiskOnboardingWizard — three-step setup modal (Theme → Risk Matrix → Broker
 * API Firewall guide). Rewritten in a Bloomberg-grade B&W language: pure black
 * canvas, hairline white borders, monospace numerics, zero color accents on
 * chrome. Theme swatches are the only non-grayscale surface (they have to be —
 * they preview the user's chosen palette).
 */

const DISMISS_KEY = 'orca-risk-onboarding-done';

const THEMES: { id: string; label: { he: string; en: string }; swatch: string[] }[] = [
  { id: 'orca-neon', label: { he: 'Orca ניאון', en: 'Orca Neon' }, swatch: ['#061326', '#0b1730', '#00f2ff', '#06d6a0'] },
  { id: 'midnight', label: { he: 'חצות', en: 'Midnight' }, swatch: ['#020202', '#0b1730', '#00f2ff', '#3b82f6'] },
  { id: 'blue', label: { he: 'כחול', en: 'Blue' }, swatch: ['#0B1120', '#1E293B', '#38BDF8', '#E6EEF8'] },
  
];

export function shouldShowRiskOnboarding(prefs: UserPreferences, loaded: boolean): boolean {
  if (!loaded) return false;
  if (scopedStorage.getSync(DISMISS_KEY)) return false;
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

// Bloomberg-grade B&W palette
const INK = '#000000';
const PAPER = '#ffffff';
const ASH_900 = '#0a0a0a';
const ASH_700 = '#1a1a1a';
const ASH_600 = '#2a2a2a';
const ASH_200 = '#9a9a9a';
const ASH_100 = '#c4c4c4';
const MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";
const SANS = "'Poppins', 'Inter', sans-serif";

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

  // Primitives
  const primaryBtn: React.CSSProperties = {
    padding: '12px 28px', borderRadius: 0,
    background: PAPER, color: INK, border: `1px solid ${PAPER}`,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: 'pointer', fontFamily: MONO, transition: 'background .18s, color .18s',
  };
  const ghostBtn: React.CSSProperties = {
    padding: '12px 22px', borderRadius: 0,
    background: 'transparent', color: ASH_200, border: `1px solid ${ASH_600}`,
    fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: 'pointer', fontFamily: MONO,
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 99997,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: SANS,
        animation: 'orcaRiskFadeIn 0.22s ease',
        color: PAPER,
      }}
    >
      <style>{`
        @keyframes orcaRiskFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orcaRiskCardIn { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 620,
        background: ASH_900,
        border: `1px solid ${PAPER}`,
        borderRadius: 0,
        padding: 0,
        boxShadow: '0 20px 80px rgba(0,0,0,0.85)',
        animation: 'orcaRiskCardIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {/* Header band */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 22px', borderBottom: `1px solid ${ASH_600}`,
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
          color: ASH_200, direction: 'ltr',
        }}>
          <span>ORCA · RISK TERMINAL</span>
          <span style={{ color: PAPER, fontWeight: 700 }}>
            {String(step).padStart(2,'0')} / 03
          </span>
        </div>

        {/* Top progress rail */}
        <div style={{ height: 2, background: ASH_700 }}>
          <div style={{
            height: '100%', width: `${(step / 3) * 100}%`, background: PAPER,
            transition: 'width .45s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>

        <div style={{ padding: '28px 24px 22px' }}>
          {/* Section title */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: ASH_200, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 8, direction: 'ltr' }}>
              {t('הגדרת חשבון ראשונית', 'Initial Setup')}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em', color: PAPER }}>
              {step === 1 && t('בחר ערכת נושא', 'Choose your theme')}
              {step === 2 && t('מטריצת ניהול סיכון', 'Risk Management Matrix')}
              {step === 3 && t('Firewall ל-API של הברוקר', 'Broker API Firewall')}
            </h2>
            <p style={{ fontSize: 12.5, color: ASH_200, margin: 0, lineHeight: 1.65 }}>
              {step === 1 && t('כל הצבעים, הגרפים והאקצנטים יתאימו את עצמם בהתאם.', 'Every chart, accent, and surface will adapt to this choice.')}
              {step === 2 && t('הגדר את גבולות הסיכון שלך בדולרים. מנוע ה-R יסתמך על הערכים האלה.', 'Define your USD risk budgets. The R-engine uses them as Tier-3 fallback.')}
              {step === 3 && t('מפתחות API של הברוקר מוגבלים ל-Read-Only בלבד. אף פקודת מסחר לא תישלח מהמערכת.', 'Broker API keys are restricted to Read-Only scope. No trades will ever be placed from this platform.')}
            </p>
          </div>

          {/* STEP 1 — THEME */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: ASH_600, border: `1px solid ${ASH_600}`, marginBottom: 20 }}>
              {THEMES.map(opt => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    style={{
                      padding: 16, borderRadius: 0, cursor: 'pointer',
                      background: active ? PAPER : INK,
                      color: active ? INK : PAPER,
                      border: 'none',
                      transition: 'background .18s',
                      textAlign: 'start',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                      {opt.swatch.map(c => (
                        <div key={c} style={{ width: 18, height: 18, background: c, border: `1px solid ${active ? INK : ASH_600}` }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>
                      {isRTL ? opt.label.he : opt.label.en}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, marginTop: 4, opacity: 0.55, letterSpacing: '0.14em', textTransform: 'uppercase', direction: 'ltr' }}>
                      {opt.id}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2 — RISK MATRIX */}
          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: ASH_600, border: `1px solid ${ASH_600}`, marginBottom: 20 }}>
              {([
                { code: 'R/TRADE', label: t('סיכון לעסקה ($)', 'Per-trade risk ($)'), val: perTrade, setter: setPerTrade, hint: t('ברירת מחדל כל פוזיציה', 'Default per position') },
                { code: 'R/DAY', label: t('מגבלה יומית ($)', 'Daily limit ($)'), val: daily, setter: setDaily, hint: t('Proxy ב-R-Engine', 'R-engine proxy') },
                { code: 'R/WEEK', label: t('מגבלה שבועית ($)', 'Weekly limit ($)'), val: weekly, setter: setWeekly, hint: t('עצירה רכה', 'Soft stop') },
                { code: 'R/MONTH', label: t('מגבלה חודשית ($)', 'Monthly limit ($)'), val: monthly, setter: setMonthly, hint: t('עצירה קשה', 'Hard stop') },
              ] as const).map(f => (
                <label key={f.code} style={{
                  padding: '14px 14px 12px', background: INK,
                  display: 'block',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, direction: 'ltr' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, color: ASH_200, letterSpacing: '0.18em' }}>{f.code}</span>
                    <span style={{ fontSize: 10, color: ASH_100, fontWeight: 600 }}>{f.label}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={f.val}
                    onChange={e => f.setter(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 0,
                      background: INK, border: `1px solid ${ASH_600}`,
                      color: PAPER, fontSize: 18, fontWeight: 700,
                      fontFamily: MONO, textAlign: 'center',
                      outline: 'none', transition: 'border-color .18s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = PAPER; }}
                    onBlur={e => { e.currentTarget.style.borderColor = ASH_600; }}
                  />
                  <div style={{ fontFamily: MONO, fontSize: 9, color: ASH_200, marginTop: 6, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {f.hint}
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* STEP 3 — FIREWALL */}
          {step === 3 && (
            <div style={{
              padding: '18px 20px', marginBottom: 20,
              background: INK, border: `1px solid ${ASH_600}`,
              borderInlineStart: `2px solid ${PAPER}`,
              fontSize: 13, lineHeight: 1.85, color: ASH_100,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: PAPER, marginBottom: 12, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                {t('מדיניות אבטחה', 'Security Policy')}
              </div>
              <ul style={{ margin: 0, paddingInlineStart: 18, listStyle: 'square' }}>
                <li style={{ marginBottom: 6 }}>{t('מפתחות API מאוחסנים במנגנון Vault מוצפן, מבודד פר משתמש.', 'API keys stored inside a per-user encrypted Vault.')}</li>
                <li style={{ marginBottom: 6 }}>{t('Scope קשיח: Read-Only / היסטוריה בלבד. אין הרשאת מסחר.', 'Hard scope: Read-Only / history only. No trading permission.')}</li>
                <li style={{ marginBottom: 6 }}>{t('כל בקשה מחויבת ב-RLS — נתונים שלך אף פעם לא נחשפים למשתמש אחר.', 'Every request is RLS-gated — your data is never visible to other users.')}</li>
                <li>{t('ניתן למחוק את המפתח בכל רגע מתפריט ההגדרות.', 'You can revoke the key at any time from the Settings panel.')}</li>
              </ul>
            </div>
          )}

          {/* Footer controls */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 16, borderTop: `1px solid ${ASH_600}`, flexWrap: 'wrap',
          }}>
            <button onClick={skip} style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: ASH_200, background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '4px 0',
            }}>
              {t('דלג', 'Skip')}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 1 && (
                <button onClick={() => setStep((step - 1) as 1 | 2 | 3)} style={ghostBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = PAPER; e.currentTarget.style.color = PAPER; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ASH_600; e.currentTarget.style.color = ASH_200; }}>
                  ← {t('חזור', 'Back')}
                </button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                  disabled={step === 2 && !matrixValid}
                  style={{
                    ...primaryBtn,
                    opacity: step === 2 && !matrixValid ? 0.4 : 1,
                    cursor: step === 2 && !matrixValid ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!(step === 2 && !matrixValid)) { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}>
                  {t('המשך', 'Continue')} →
                </button>
              ) : (
                <button onClick={finish} disabled={saving} style={primaryBtn}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}>
                  {saving ? '…' : t('שמור והפעל', 'Save & Activate')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
