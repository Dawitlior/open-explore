import { useEffect, useCallback } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';

interface FeatureManifestModalProps {
  T: TradingTheme;
  isRTL: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: '🎨',
    title: 'ממשק משתמש וחוויית שימוש',
    items: [
      'ממשק כהה פרימיום עם אפקטי תאורה',
      'תמיכה מלאה בעברית (RTL)',
      'מעבר מהיר בין עברית לאנגלית',
      'סרגל ניווט צדדי רספונסיבי',
      'מספר מצבי עבודה',
      'מדדי ביצועים מונפשים',
      'כרטיסים עם אפקט זכוכית',
      'אינטראקציות עדינות בעת מעבר עכבר',
      'מערכת ערכות עיצוב',
      'אנימציות חלקות',
    ],
  },
  {
    icon: '📊',
    title: 'ניתוח ביצועי מסחר',
    items: [
      'חישוב רווח והפסד מצטבר',
      'אחוז הצלחה בעסקאות',
      'Profit Factor',
      'Expectancy',
      'התפלגות R-Multiple',
      'גרף Equity Curve',
      'ניתוח Drawdown',
      'ביצועי מטבעות',
      'ניתוח לונג מול שורט',
      'ביצועים לפי יום בשבוע',
      'סיכום שבועי וחודשי',
    ],
  },
  {
    icon: '🐋',
    title: 'מדדי Orca',
    items: [
      'Orca Score ייחודי',
      'מדד בריאות ה־Edge',
      'התאמה לרג׳ים השוק',
      'מדד איכות החלטות',
      'מדידת משמעת מסחר',
      'מעקב עקביות סיכון',
      'פירוק מדד לציונים פנימיים',
      'השוואת ביצועים לאורך זמן',
    ],
  },
  {
    icon: '🧠',
    title: 'פסיכולוגיית מסחר',
    items: [
      'מעקב משמעת',
      'זיהוי מסחר יתר',
      'התראות Revenge Trading',
      'מדד פחד / חמדנות',
      'מעקב ביטחון בהחלטות',
      'בדיקת עמידה בחוקים',
      'זיהוי דפוסי התנהגות',
      'זיהוי Tilt',
    ],
  },
  {
    icon: '🛡️',
    title: 'ניהול סיכונים',
    items: [
      'חישוב גודל פוזיציה',
      'מעקב עקביות סיכון',
      'זיהוי סטייה מהסיכון המתוכנן',
      'מגבלת הפסד יומית',
      'מגבלת Drawdown',
      'זיהוי רצף הפסדים',
      'מצב התאוששות',
      'מד סיכון ויזואלי',
    ],
  },
  {
    icon: '📅',
    title: 'יומן מסחר וקלנדר',
    items: [
      'לוח שנה אינטראקטיבי',
      'צבעי רווח והפסד',
      'מספר עסקאות יומי',
      'סיכום שבועי',
      'מעבר בין חודשים',
      'צפייה בפרטי עסקה בלחיצה',
      'הדגשת רצפים',
    ],
  },
  {
    icon: '🤖',
    title: 'מנוע AI לניתוח ביצועים',
    items: [
      'זיהוי חוזקות במסחר',
      'זיהוי חולשות',
      'התראות על סטייה בניהול סיכון',
      'ניתוח דפוסי מסחר',
      'זיהוי אנומליות',
      'הסבר שינויים בביצועים',
      'יצירת תובנות לפי דרישה',
    ],
  },
];

export const FeatureManifestModal = ({ T, isRTL, onClose }: FeatureManifestModalProps) => {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)', animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
          border: `1px solid ${T.border.medium}`,
          borderRadius: T.radius.xl,
          maxWidth: 780, width: '94%', maxHeight: '90vh', overflow: 'hidden',
          boxShadow: `${T.shadow.elevated}, 0 0 80px rgba(0,0,0,0.4)`,
          animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 32px 20px',
          background: `linear-gradient(135deg, ${T.accent.cyan}06, ${T.accent.purple}06)`,
          borderBottom: `1px solid ${T.border.subtle}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>🐋</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>
                    ORCA<span style={{ fontWeight: 300, color: T.text.muted, marginInlineStart: 6 }}>Investment</span>
                  </div>
                  <div style={{ fontSize: 9, color: T.text.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                    Trading Intelligence System
                  </div>
                </div>
              </div>
              <h2 style={{
                fontSize: 15, fontWeight: 700, color: T.text.primary, margin: '0 0 10px',
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5,
                direction: 'rtl', textAlign: 'right',
              }}>
                מערכת Orca – סביבת עבודה לסוחר מקצועי
              </h2>
              <p style={{
                fontSize: 12, color: T.text.secondary, lineHeight: 1.8, margin: 0,
                direction: 'rtl', textAlign: 'right',
              }}>
                מערכת זו נבנתה כדי לעזור לחברי קהילת Orca להפוך לסוחרים טובים יותר באמצעות משמעת, ניתוח נתונים וניהול סיכונים מתקדם.
                <br />
                הדאשבורד משלב יומן מסחר, ניתוח ביצועים, מעקב פסיכולוגי וכלי בינה מלאכותית כדי לספק תמונה מלאה על תהליך המסחר.
                <br />
                המטרה של המערכת אינה לייצר איתותים, אלא לעזור לסוחר להבין את הביצועים שלו ולשפר את קבלת ההחלטות לאורך זמן.
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: '50%', border: `1px solid ${T.border.medium}`,
              background: T.bg.tertiary, color: T.text.muted, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              flexShrink: 0, marginInlineStart: 16,
            }}>×</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflow: 'auto', padding: '20px 32px 28px', flex: 1 }}>
          {/* Disclaimer */}
          <div style={{
            padding: 16, marginBottom: 20,
            background: `${T.accent.orange}06`, border: `1px solid ${T.accent.orange}18`,
            borderRadius: T.radius.md, direction: 'rtl', textAlign: 'right',
          }}>
            <div style={{ fontSize: 9, color: T.accent.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              ⚠️ הבהרה חשובה
            </div>
            <p style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.8, margin: 0 }}>
              המערכת אינה מערכת איתותים ואינה מספקת המלצות השקעה.
              הנתונים והניתוחים המוצגים מבוססים על פעילות המסחר האישית של המשתמש ונועדו לצרכי למידה, שיפור תהליך המסחר ופיתוח משמעת מקצועית.
              המסחר בשווקים פיננסיים כרוך בסיכון, ועל כל משתמש לפעול בהתאם לשיקול דעתו האישי.
            </p>
          </div>

          {/* Feature sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320, 1fr))', gap: 14 }}>
            {SECTIONS.map((section, i) => (
              <div
                key={i}
                style={{
                  background: `linear-gradient(135deg, ${T.bg.card} 0%, ${T.bg.tertiary} 100%)`,
                  border: `1px solid ${T.border.subtle}`,
                  borderRadius: T.radius.lg, padding: 18,
                  transition: 'all 0.2s', animation: `fadeIn ${0.15 + i * 0.05}s ease`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{section.icon}</span>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: T.accent.cyan,
                    fontFamily: "'JetBrains Mono', monospace", direction: 'rtl',
                  }}>
                    {section.title}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, direction: 'rtl' }}>
                  {section.items.map((item, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 11, color: T.text.secondary, padding: '2px 0',
                    }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: T.accent.cyan, flexShrink: 0,
                        boxShadow: `0 0 4px ${T.accent.cyan}40`,
                      }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 20, padding: 14, textAlign: 'center',
            background: T.bg.tertiary, borderRadius: T.radius.md,
            border: `1px solid ${T.border.subtle}`,
          }}>
            <div style={{ fontSize: 10, color: T.text.dim, letterSpacing: '0.08em' }}>
              ORCA INVESTMENT — TRADING INTELLIGENCE SYSTEM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
