import { useState, useEffect } from 'react';

const STORAGE_KEY = 'orca-onboarding-done';
const NAME_KEY = 'orca-user-name';
const PROFILE_KEY = 'orca-user-profile';

type Step = 1 | 2 | 3 | 4 | 5;
type Profile = 'beginner' | 'intermediate' | 'advanced' | null;

const VALUE_TEXTS: Record<string, string> = {
  beginner: 'כדי להפוך לסוחר רווחי, הדבר החשוב ביותר הוא לא לנחש – אלא למדוד. הפלטפורמה של Orca תעניק לך את התשתית המקצועית ביותר: יומן בקטסט לבניית ביטחון באסטרטגיה, ויומן ג\'ורנל למעקב וניתוח טריידים בזמן אמת. רישום מדויק הוא ההבדל בין הימור לבין עסק רווחי, ואנחנו כאן כדי לוודא שאתה בונה את היסודות הנכונים מהיום הראשון.',
  intermediate: 'אם כבר טעמת מהשוק, אתה בטח מבין שאיסוף ידע זה לא מספיק – צריך סדר. המערכת של Orca נועדה לקחת את הידע שכבר צברת ולהפוך אותו לשיטה עקבית. באמצעות תיעוד קפדני וניתוח נתונים ביומנים שלנו, תוכל לזהות את הטעויות החוזרות שלך ולהתחיל לייצר רווחים בצורה מבוקרת ומקצועית. זה השלב שבו אתה מפסיק \'לנסות\' ומתחיל לסחור.',
  advanced: 'אם אתה כבר סוחר אז יש לך פה זהב! בתור סוחר פעיל, אתה יודע שהיתרון היחסי שלך נמצא בפרטים הקטנים. הפלטפורמה של Orca מספקת לך את כלי הניתוח המתקדמים ביותר בשוק: יומן בקטסט עמוק למקסום אסטרטגיות ויומן ג\'ורנל לניטור ביצועים ברמה הגבוהה ביותר. זהו הכלי שיאפשר לך לבצע אופטימיזציה מלאה ל-Edge שלך ולקחת את התיק שלך לשלב הבא. הנתונים שלך הם הכוח שלך – בוא נמנף אותם.',
};

export const OnboardingWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [fadeIn, setFadeIn] = useState(true);

  const transition = (next: Step) => {
    setFadeIn(false);
    setTimeout(() => { setStep(next); setFadeIn(true); }, 300);
  };

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    localStorage.setItem(NAME_KEY, name);
    if (profile) localStorage.setItem(PROFILE_KEY, profile);
    onComplete();
  };

  const BG = '#030810';
  const GOLD = '#D4AF37';
  const BLUE = '#1e3a5f';
  const CYAN = '#06d6a0';

  const progressPct = (step / 5) * 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: `radial-gradient(ellipse at 50% 30%, ${BLUE}40 0%, ${BG} 60%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Poppins', 'Inter', sans-serif", direction: 'rtl',
      overflow: 'hidden',
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: 'linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Progress bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'rgba(255,255,255,0.05)',
      }}>
        <div style={{
          height: '100%', width: `${progressPct}%`,
          background: `linear-gradient(90deg, ${GOLD}, ${CYAN})`,
          transition: 'width 0.5s ease',
          boxShadow: `0 0 12px ${GOLD}60`,
        }} />
      </div>

      {/* Step indicator */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {[1,2,3,4,5].map(s => (
          <div key={s} style={{
            width: s === step ? 24 : 8, height: 8, borderRadius: 4,
            background: s <= step ? GOLD : 'rgba(255,255,255,0.1)',
            transition: 'all 0.4s ease',
            boxShadow: s === step ? `0 0 12px ${GOLD}50` : 'none',
          }} />
        ))}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginRight: 8, fontWeight: 700, letterSpacing: 1 }}>{step}/5</span>
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 560, width: '90%', textAlign: 'center',
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
        transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* STEP 1 — Gateway */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, filter: `drop-shadow(0 0 20px ${GOLD}40)` }}>🐋</div>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, color: '#f1f5f9', marginBottom: 8, letterSpacing: '-0.5px' }}>
              ברוך הבא ל-Orca Investment
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 36 }}>
              בוא נתחיל בהגדרה אישית של סביבת העבודה שלך.
            </p>
            <div style={{ maxWidth: 340, margin: '0 auto' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 1, marginBottom: 8, textAlign: 'right' }}>
                מה שמך המלא?
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="הכנס את שמך..."
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.2)',
                  color: '#f1f5f9', fontSize: 15, fontWeight: 600,
                  outline: 'none', direction: 'rtl', textAlign: 'right',
                  fontFamily: "'Poppins', sans-serif",
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${GOLD}60`; e.currentTarget.style.boxShadow = `0 0 20px ${GOLD}15`; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <button
              onClick={() => transition(2)}
              disabled={!name.trim()}
              style={{
                marginTop: 32, padding: '14px 48px', borderRadius: 12,
                background: name.trim() ? `linear-gradient(135deg, ${GOLD}, #b8941e)` : 'rgba(255,255,255,0.05)',
                color: name.trim() ? '#0a0e1a' : 'rgba(255,255,255,0.2)',
                border: 'none', fontSize: 14, fontWeight: 800, cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease', letterSpacing: 0.5,
                boxShadow: name.trim() ? `0 4px 24px ${GOLD}30` : 'none',
              }}
            >
              המשך →
            </button>
          </div>
        )}

        {/* STEP 2 — Ecosystem */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 36, marginBottom: 16 }}>👥</div>
            <h2 style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
              האם אתה כבר חלק ממשפחת Orca?
            </h2>
            {isMember === null ? (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
                <button onClick={() => { setIsMember(true); transition(3); }} style={{
                  padding: '14px 32px', borderRadius: 12, border: `1px solid ${GOLD}40`,
                  background: `${GOLD}10`, color: GOLD, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.3s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}20`; e.currentTarget.style.boxShadow = `0 0 20px ${GOLD}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${GOLD}10`; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  כן, אני כבר בפנים
                </button>
                <button onClick={() => setIsMember(false)} style={{
                  padding: '14px 32px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  עדיין לא
                </button>
              </div>
            ) : isMember === false ? (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  הכוח של Orca נמצא בקהילה. הצטרף עכשיו כדי לקבל עדכונים, ניתוחים וליווי מהשטח.
                </p>
                <div style={{
                  width: 200, height: 200, margin: '0 auto 24px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ fontSize: 48 }}>📱</div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>QR CODE</span>
                </div>
                <button onClick={() => transition(3)} style={{
                  padding: '14px 36px', borderRadius: 12, border: `1px solid ${CYAN}40`,
                  background: `${CYAN}10`, color: CYAN, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  הצטרפתי, בוא נמשיך →
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3 — Profiler */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📊</div>
            <h2 style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
              הגדר את הפרופיל שלך כסוחר
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
              זה יעזור לנו להתאים את החוויה עבורך
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, margin: '0 auto' }}>
              {([
                { id: 'beginner' as const, icon: '🌱', title: 'מתחיל', desc: 'חדש לגמרי בעולם המסחר' },
                { id: 'intermediate' as const, icon: '📈', title: 'בינוני', desc: 'מכיר את הקונספטים, צופה בתכנים, מבין את הבסיס' },
                { id: 'advanced' as const, icon: '⚡', title: 'מתקדם', desc: 'סוחר פעיל ברמה יומית/שבועית' },
              ]).map(opt => (
                <button key={opt.id} onClick={() => { setProfile(opt.id); transition(4); }} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                  borderRadius: 14, border: `1px solid ${profile === opt.id ? `${GOLD}50` : 'rgba(255,255,255,0.08)'}`,
                  background: profile === opt.id ? `${GOLD}08` : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.3s', textAlign: 'right', direction: 'rtl',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}30`; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = profile === opt.id ? `${GOLD}50` : 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = profile === opt.id ? `${GOLD}08` : 'rgba(255,255,255,0.02)'; }}
                >
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{opt.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — Value Proposition */}
        {step === 4 && profile && (
          <div>
            <div style={{ fontSize: 36, marginBottom: 16 }}>
              {profile === 'beginner' ? '🌱' : profile === 'intermediate' ? '📈' : '⚡'}
            </div>
            <h2 style={{ fontSize: 'clamp(16px, 3.5vw, 22px)', fontWeight: 800, color: '#f1f5f9', marginBottom: 20 }}>
              {name}, הנה מה ש-Orca יכולה לעשות בשבילך
            </h2>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,175,55,0.12)',
              borderRadius: 16, padding: '24px 22px', textAlign: 'right', direction: 'rtl',
              maxHeight: '40vh', overflowY: 'auto',
            }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 2, margin: 0 }}>
                {VALUE_TEXTS[profile]}
              </p>
            </div>
            <button onClick={() => transition(5)} style={{
              marginTop: 28, padding: '14px 48px', borderRadius: 12,
              background: `linear-gradient(135deg, ${GOLD}, #b8941e)`,
              color: '#0a0e1a', border: 'none', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', transition: 'all 0.3s',
              boxShadow: `0 4px 24px ${GOLD}30`,
            }}>
              מוכן — בוא נמשיך →
            </button>
          </div>
        )}

        {/* STEP 5 — Commitment */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
            <h2 style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>
              רגע לפני שיוצאים לדרך...
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.9, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
              האם אתה מתחייב לתהליך של משמעת, תיעוד וצמיחה? מסחר הוא מרתון, לא ספרינט. ההצלחה שלך ב-Orca תלויה בעקביות שלך במילוי היומנים ובניתוח העצמי.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={finish} style={{
                padding: '16px 48px', borderRadius: 14,
                background: `linear-gradient(135deg, ${CYAN}, #0d9488)`,
                color: '#0a0e1a', border: 'none', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.3s',
                boxShadow: `0 4px 30px ${CYAN}30, 0 0 60px ${CYAN}10`,
                letterSpacing: 0.3,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
              >
                אני מתחייב – בוא נתחיל!
              </button>
              <button onClick={() => transition(4)} style={{
                padding: '14px 28px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
              }}>
                ← חזור אחורה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const shouldShowOnboarding = (): boolean => {
  return !localStorage.getItem(STORAGE_KEY);
};
