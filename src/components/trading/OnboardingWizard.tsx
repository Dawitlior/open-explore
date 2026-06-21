import { useState } from 'react';
import orcaQR from '@/assets/orca-qr-code.jpeg';
import { scopedStorage } from '@/lib/scoped-storage';
import { useLang } from '@/hooks/use-lang';

/**
 * OnboardingWizard — five-step bilingual intake shown once per new user.
 * Bloomberg-grade aesthetic: black canvas, hairline white borders, monospace
 * numerics, zero color accents.
 *
 * All copy now respects the active language (he/en) via `useLang`. Hebrew
 * users see RTL Hebrew, English users see LTR English — chosen at signup.
 */

const STORAGE_KEY = 'orca-onboarding-done';
const NAME_KEY = 'orca-user-name';
const PROFILE_KEY = 'orca-user-profile';

type Step = 1 | 2 | 3 | 4 | 5;
type Profile = 'beginner' | 'intermediate' | 'advanced' | null;

const VALUE_TITLES_HE: Record<string, string> = {
  beginner: 'הצעד הראשון שלך לעבר מקצוענות',
  intermediate: 'הגיע הזמן לעבור למסחר סיסטמטי',
  advanced: 'מצאת את \'הזהב\' של הסוחרים המקצועיים',
};
const VALUE_TITLES_EN: Record<string, string> = {
  beginner: 'Your first step toward professional trading',
  intermediate: 'Time to graduate to systematic trading',
  advanced: 'You found the gold standard of professional traders',
};

const VALUE_TEXTS_HE: Record<string, string> = {
  beginner: 'כדי להפוך לסוחר רווחי, הדבר החשוב ביותר הוא לא לנחש – אלא למדוד. הפלטפורמה של Orca תעניק לך את התשתית המקצועית ביותר: יומן בקטסט (Backtest) לבניית ביטחון באסטרטגיה, ויומן ג\'ורנל (Journal) למעקב וניתוח טריידים בזמן אמת. רישום מדויק הוא ההבדל בין הימור לבין עסק רווחי, ואנחנו כאן כדי לוודא שאתה בונה את היסודות הנכונים מהיום הראשון.',
  intermediate: 'אם כבר טעמת מהשוק, אתה בטח מבין שאיסוף ידע זה לא מספיק – צריך סדר. המערכת של Orca נועדה לקחת את הידע שכבר צברת ולהפוך אותו לשיטה עקבית. באמצעות תיעוד קפדני וניתוח נתונים ביומנים שלנו, תוכל לזהות את הטעויות החוזרות שלך ולהתחיל לייצר רווחים בצורה מבוקרת ומקצועית. זה השלב שבו אתה מפסיק \'לנסות\' ומתחיל לסחור.',
  advanced: 'בתור סוחר פעיל, אתה יודע שהיתרון היחסי שלך נמצא בפרטים הקטנים. הפלטפורמה של Orca מספקת לך את כלי הניתוח המתקדמים ביותר בשוק: יומן בקטסט עמוק למקסום אסטרטגיות ויומן ג\'ורנל לניטור ביצועים ברמה הגבוהה ביותר. זהו הכלי שיאפשר לך לבצע אופטימיזציה מלאה ל-Edge שלך ולקחת את התיק שלך לשלב הבא. הנתונים שלך הם הכוח שלך – בוא נמנף אותם.',
};
const VALUE_TEXTS_EN: Record<string, string> = {
  beginner: 'To become a profitable trader, the most important thing is not to guess — it is to measure. The Orca platform gives you the most professional infrastructure available: a Backtest journal to build confidence in your strategy, and a live Journal to track and analyze trades in real time. Precise recording is the difference between gambling and running a profitable business — we are here to make sure you build the right foundations from day one.',
  intermediate: 'If you have already tasted the markets, you understand that collecting knowledge is not enough — you need structure. Orca is built to take the knowledge you already have and turn it into a consistent system. Through rigorous documentation and data analysis inside our journals, you can identify your repeating mistakes and start producing profits in a controlled, professional way. This is the stage where you stop "trying" and start trading.',
  advanced: 'As an active trader, you know your edge lives in the small details. The Orca platform provides the most advanced analytics on the market: a deep Backtest journal to maximize your strategies and a live Journal to monitor performance at the highest level. This is the tool that lets you fully optimize your edge and take your portfolio to the next stage. Your data is your power — let us leverage it.',
};

const isValidName = (n: string): boolean => {
  const trimmed = n.trim();
  if (trimmed.length < 2) return false;
  if (!/^[\u0590-\u05FFa-zA-Z\s\-']+$/.test(trimmed)) return false;
  const parts = trimmed.split(/\s+/).filter(p => p.length >= 1);
  return parts.length >= 2;
};

// Bloomberg-grade B&W palette — no chroma, only grayscale.
const INK = '#000000';
const PAPER = '#ffffff';
const ASH_900 = '#0a0a0a';
const ASH_700 = '#1a1a1a';
const ASH_600 = '#2a2a2a';
const ASH_400 = '#4a4a4a';
const ASH_200 = '#9a9a9a';
const ASH_100 = '#c4c4c4';

const MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";
const SANS = "'Poppins', 'Inter', sans-serif";

export const OnboardingWizard = ({ onComplete }: { onComplete: () => void }) => {
  const { isRTL, t } = useLang();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [fadeIn, setFadeIn] = useState(true);

  const dir = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'right' | 'left' = isRTL ? 'right' : 'left';
  const arrowFwd = isRTL ? '→' : '→';
  const arrowBack = isRTL ? '←' : '←';

  const transition = (next: Step) => {
    setFadeIn(false);
    setTimeout(() => { setStep(next); setFadeIn(true); }, 240);
  };

  const finish = () => {
    void scopedStorage.setItem(STORAGE_KEY, '1');
    void scopedStorage.setItem(NAME_KEY, name.trim());
    if (profile) void scopedStorage.setItem(PROFILE_KEY, profile);
    void scopedStorage.setItem('orca-trader-mind-prompt-pending', '1');
    onComplete();
  };

  const handleNameContinue = () => {
    if (!isValidName(name)) {
      setNameError(t(
        'יש להזין שם מלא (שם פרטי ושם משפחה) באותיות בלבד',
        'Please enter your full name (first and last) using letters only',
      ));
      return;
    }
    setNameError('');
    transition(2);
  };

  const progressPct = (step / 5) * 100;

  const primaryBtn: React.CSSProperties = {
    padding: '14px 40px', borderRadius: 0,
    background: PAPER, color: INK,
    border: `1px solid ${PAPER}`,
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.18em', textTransform: 'uppercase',
    fontFamily: MONO,
    transition: 'background .2s, color .2s, border .2s',
  };
  const ghostBtn: React.CSSProperties = {
    padding: '12px 24px', borderRadius: 0,
    background: 'transparent', color: ASH_200,
    border: `1px solid ${ASH_600}`,
    fontSize: 10, fontWeight: 600, cursor: 'pointer',
    letterSpacing: '0.18em', textTransform: 'uppercase',
    fontFamily: MONO,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: INK,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, direction: dir,
      overflow: 'auto',
      color: PAPER,
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
        backgroundSize: '88px 88px',
      }} />

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        background: ASH_700, zIndex: 100000,
      }}>
        <div style={{
          height: '100%', width: `${progressPct}%`,
          background: PAPER,
          transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      <div style={{
        position: 'fixed', top: 14, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', zIndex: 100000,
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
        color: ASH_200,
        direction: 'ltr',
      }}>
        <span>ORCA · ONBOARDING TERMINAL</span>
        <span style={{ color: PAPER, fontWeight: 700 }}>
          STEP {String(step).padStart(2, '0')} / 05
        </span>
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 620, width: '92%',
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.34s cubic-bezier(0.16,1,0.3,1)',
        padding: '64px 0 40px',
        border: `1px solid ${ASH_700}`,
        background: ASH_900,
      }}>
        <div style={{ padding: '36px 40px' }}>
          {/* STEP 1 — Name */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ASH_200, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 14, direction: 'ltr' }}>
                01 · IDENTITY
              </div>
              <h1 style={{ fontSize: 'clamp(22px, 4.4vw, 32px)', fontWeight: 700, color: PAPER, marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.15, fontFamily: SANS }}>
                {t('ברוך/ה הבא/ה ל-Orca Investment', 'Welcome to Orca Investment')}
              </h1>
              <p style={{ fontSize: 13, color: ASH_200, marginBottom: 32, lineHeight: 1.7 }}>
                {t(
                  'הגדר את חשבון המסחר שלך. כל הנתונים מאוחסנים מקומית ומוצפנים פר-משתמש.',
                  'Set up your trading account. All data is stored locally and encrypted per user.',
                )}
              </p>
              <div>
                <label style={{ display: 'block', fontFamily: MONO, fontSize: 10, fontWeight: 600, color: PAPER, letterSpacing: '0.2em', marginBottom: 10, textAlign, textTransform: 'uppercase' }}>
                  {t('שם מלא', 'Full name')}
                </label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); if (nameError) setNameError(''); }}
                  placeholder={t('ישראל ישראלי', 'Jane Doe')}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 0,
                    background: INK, border: `1px solid ${nameError ? PAPER : ASH_600}`,
                    color: PAPER, fontSize: 16, fontWeight: 600,
                    outline: 'none', direction: dir, textAlign,
                    fontFamily: SANS,
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = PAPER; }}
                  onBlur={e => { e.currentTarget.style.borderColor = nameError ? PAPER : ASH_600; }}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameContinue(); }}
                />
                {nameError && (
                  <div style={{ fontSize: 11, color: PAPER, marginTop: 10, textAlign, fontFamily: MONO, letterSpacing: '0.04em' }}>
                    ▲ {nameError}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
                <button
                  onClick={handleNameContinue}
                  disabled={!name.trim()}
                  style={{
                    ...primaryBtn,
                    opacity: name.trim() ? 1 : 0.35,
                    cursor: name.trim() ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={e => { if (name.trim()) { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; e.currentTarget.style.border = `1px solid ${PAPER}`; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}
                >
                  {t('המשך', 'Continue')} {arrowFwd}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Community */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ASH_200, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 14, direction: 'ltr' }}>
                02 · COMMUNITY
              </div>
              <h2 style={{ fontSize: 'clamp(18px, 3.6vw, 26px)', fontWeight: 700, color: PAPER, marginBottom: 8, letterSpacing: '-0.01em' }}>
                {t('האם את/ה כבר חלק ממשפחת Orca?', 'Are you already part of the Orca family?')}
              </h2>
              {isMember === null ? (
                <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                  <button onClick={() => { setIsMember(true); transition(3); }} style={primaryBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; }}
                    onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}>
                    {t('כן, אני בפנים', 'Yes, I am in')}
                  </button>
                  <button onClick={() => setIsMember(false)} style={ghostBtn}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = PAPER; e.currentTarget.style.color = PAPER; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = ASH_600; e.currentTarget.style.color = ASH_200; }}>
                    {t('עדיין לא', 'Not yet')}
                  </button>
                </div>
              ) : isMember === false ? (
                <div style={{ marginTop: 22 }}>
                  <p style={{ fontSize: 13, color: ASH_200, lineHeight: 1.85, marginBottom: 22 }}>
                    {t(
                      'הצטרף לקהילת Orca כדי לקבל עדכונים, ניתוחים וליווי. סרוק את הקוד:',
                      'Join the Orca community to receive updates, analysis, and guidance. Scan the code:',
                    )}
                  </p>
                  <div style={{
                    width: 'min(260px, 80vw)', margin: '0 auto 22px',
                    padding: 12, background: PAPER,
                    border: `1px solid ${ASH_600}`,
                  }}>
                    <img src={orcaQR} alt="Orca Community QR" style={{
                      width: '100%', height: 'auto', display: 'block',
                      filter: 'grayscale(1) contrast(1.1)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={() => transition(3)} style={primaryBtn}
                      onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; }}
                      onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}>
                      {t('הצטרפתי — המשך', 'I joined — Continue')} {arrowFwd}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 3 — Profile */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ASH_200, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 14, direction: 'ltr' }}>
                03 · TRADER PROFILE
              </div>
              <h2 style={{ fontSize: 'clamp(18px, 3.6vw, 26px)', fontWeight: 700, color: PAPER, marginBottom: 6, letterSpacing: '-0.01em' }}>
                {t('הגדר את הפרופיל שלך כסוחר', 'Define your trader profile')}
              </h2>
              <p style={{ fontSize: 12, color: ASH_200, marginBottom: 22 }}>
                {t('נתאים את הכלים שלנו לידע ולניסיון שלך.', 'We will tailor our tools to your knowledge and experience.')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: `1px solid ${ASH_600}`, background: ASH_600 }}>
                {([
                  { id: 'beginner' as const, code: '01', title: t('מתחיל', 'Beginner'), desc: t('חדש לגמרי בעולם המסחר', 'Brand new to the world of trading') },
                  { id: 'intermediate' as const, code: '02', title: t('בינוני', 'Intermediate'), desc: t('מכיר את הקונספטים, מבין את הבסיס', 'Knows the concepts and understands the basics') },
                  { id: 'advanced' as const, code: '03', title: t('מתקדם', 'Advanced'), desc: t('סוחר פעיל ברמה יומית/שבועית', 'Active trader on a daily / weekly basis') },
                ]).map(opt => {
                  const active = profile === opt.id;
                  return (
                    <button key={opt.id} onClick={() => { setProfile(opt.id); transition(4); }} style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
                      border: 'none',
                      background: active ? PAPER : INK,
                      color: active ? INK : PAPER,
                      cursor: 'pointer', transition: 'all .18s', textAlign, direction: dir,
                      width: '100%',
                    }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = ASH_700; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = INK; } }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', flexShrink: 0, opacity: 0.55 }}>{opt.code}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em' }}>{opt.title}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.62, marginTop: 3, fontFamily: MONO, letterSpacing: '0.02em' }}>{opt.desc}</div>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 14 }}>{arrowFwd}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 — Value */}
          {step === 4 && profile && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ASH_200, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 14, direction: 'ltr' }}>
                04 · BRIEFING · {profile.toUpperCase()}
              </div>
              <h2 style={{ fontSize: 'clamp(16px, 3.2vw, 22px)', fontWeight: 700, color: PAPER, marginBottom: 18, letterSpacing: '-0.01em', lineHeight: 1.35 }}>
                {(isRTL ? VALUE_TITLES_HE : VALUE_TITLES_EN)[profile]}
              </h2>
              <div style={{
                background: INK, border: `1px solid ${ASH_600}`,
                padding: '22px 24px', textAlign, direction: dir,
                maxHeight: '38vh', overflowY: 'auto',
                borderInlineStart: `2px solid ${PAPER}`,
              }}>
                <p style={{ fontSize: 13.5, color: ASH_100, lineHeight: 2, margin: 0, fontFamily: SANS }}>
                  {(isRTL ? VALUE_TEXTS_HE : VALUE_TEXTS_EN)[profile]}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => transition(3)} style={ghostBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = PAPER; e.currentTarget.style.color = PAPER; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ASH_600; e.currentTarget.style.color = ASH_200; }}>
                  {arrowBack} {t('חזור', 'Back')}
                </button>
                <button onClick={() => transition(5)} style={primaryBtn}
                  onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; }}
                  onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}>
                  {t('המשך', 'Continue')} {arrowFwd}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — Commitment */}
          {step === 5 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ASH_200, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 14, direction: 'ltr' }}>
                05 · COMMITMENT
              </div>
              <h2 style={{ fontSize: 'clamp(18px, 3.6vw, 26px)', fontWeight: 700, color: PAPER, marginBottom: 12, letterSpacing: '-0.01em' }}>
                {t('רגע לפני שיוצאים לדרך', 'One moment before we begin')}
              </h2>
              <p style={{ fontSize: 14, color: ASH_100, lineHeight: 1.95, marginBottom: 28 }}>
                {t(
                  'האם את/ה מתחייב/ת לתהליך של משמעת, תיעוד וצמיחה? מסחר הוא מרתון, לא ספרינט. ההצלחה שלך ב-Orca תלויה בעקביות במילוי היומנים ובניתוח עצמי.',
                  'Do you commit to a process of discipline, documentation, and growth? Trading is a marathon, not a sprint. Your success at Orca depends on consistency in filling out your journals and self-analysis.',
                )}
              </p>
              <div style={{
                fontFamily: MONO, fontSize: 10, color: ASH_400, letterSpacing: '0.18em',
                textTransform: 'uppercase', marginBottom: 18, paddingTop: 18,
                borderTop: `1px solid ${ASH_600}`, direction: 'ltr',
              }}>
                Signed · {name.trim() || '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => transition(4)} style={ghostBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = PAPER; e.currentTarget.style.color = PAPER; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ASH_600; e.currentTarget.style.color = ASH_200; }}>
                  {arrowBack} {t('חזור', 'Back')}
                </button>
                <button onClick={finish} style={primaryBtn}
                  onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; }}
                  onMouseLeave={e => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = INK; }}>
                  {t('אני מתחייב — התחל', 'I commit — Begin')} {arrowFwd}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const shouldShowOnboarding = (): boolean => {
  return !scopedStorage.getSync(STORAGE_KEY);
};
