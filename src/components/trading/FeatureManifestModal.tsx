import { useEffect, useCallback } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';

interface FeatureManifestModalProps {
  T: TradingTheme;
  isRTL: boolean;
  onClose: () => void;
}

interface Section { icon: string; title: string; items: string[]; }

const SECTIONS_HE: Section[] = [
  { icon: '🎨', title: 'ממשק משתמש וחוויית שימוש', items: ['ממשק כהה פרימיום עם אפקטי תאורה, זכוכית ו-Liquid Sweep','תמיכה מלאה בעברית (RTL) ואנגלית עם החלפה מיידית','סרגל ניווט צדדי + תפריט פופאפ דינמי במובייל','3 ערכות נושא: Midnight, Indigo Noir, Platinum White','אנימציות סינמטיות ברמת PS5 עם בידוד דימנשן','כרטיסי זכוכית ומיקרו-אינטראקציות עדינות','מצב פרטיות (Privacy Mask) להסתרת נתונים פיננסיים מיידית','אופטימיזציית מובייל ברמה ארגונית עם safe-area ו-100dvh','יעדי מגע 44px, צפיפות אדפטיבית, ללא zoom ב-iOS'] },
  { icon: '🎛️', title: 'הגדרות פונקציונליות מתקדמות', items: ['Theme Studio — בחירת צבע אישי וגזירת פלטה מלאה אוטומטית','נעילה של 7 ימים על Theme אישי לשמירת יציבות ויזואלית','תצוגה מקדימה חיה של ה-Theme לפני התחייבות','שליטה בצפיפות ממשק (Compact / Comfortable / Spacious)','Font Scale דינמי 85%–120% לכל הממשק','Reduce Motion — כיבוי מעברים ואנימציות לא חיוניות','מאסטר וולום לצלילי APEX + הפעלה/כיבוי + צליל בדיקה','ברירות מחדל למסחר: סיכון %, יעד R, מטבע','Command Palette וקיצורי מקלדת'] },
  { icon: '🚀', title: 'אונבורדינג חכם (5 שלבים)', items: ['שלב הזדהות — הזנת שם מלא עם וולידציה','שלב קהילה — חיבור לקהילת Orca עם QR Code','שלב פרופילינג — בחירת רמת סוחר (מתחיל/בינוני/מתקדם)','שלב הצעת ערך — הסבר מותאם אישית לפי רמה','שלב מחויבות — התחייבות למשמעת מסחר','זיכרון localStorage — לא חוזר בכניסות הבאות','עיצוב פרימיום כחול-שחור-זהב'] },
  { icon: '📊', title: 'ניתוח ביצועי מסחר', items: ['חישוב רווח/הפסד מצטבר ו-Equity Curve מתקדם','אחוז הצלחה, Profit Factor ותוחלת ב-R-Multiples','התפלגות R-Multiple מקצועית','ניתוח Drawdown מקסימלי ועומק נסיגה','ביצועים לפי נכס, כיוון, יום בשבוע ושעה','סיכום שבועי, חודשי ושנתי','AnalyticsQuantLab — מודולים כמותיים מקצועיים','טבלאות דאשבורד מובנות עם היררכיה 3-שכבתית'] },
  { icon: '🐋', title: 'מדדי Orca', items: ['Orca Score ייחודי (0–100)','מדד בריאות ה-Edge','התאמה לרג׳ים השוק (Regime Fit)','מדד איכות החלטות ומשמעת','עקביות סיכון ו-Risk Drift','פירוק מדד לציונים פנימיים','השוואת ביצועים לאורך זמן'] },
  { icon: '🧠', title: 'פסיכולוגיה והתנהגות', items: ['PsychologyLab — מעקב רגשי ושאלון פסיכולוגי יומי','זיהוי Overtrading ו-Revenge Trading','מדד פחד/חמדנות (Fear & Greed)','מעקב ביטחון בהחלטות וקונטקסט התנהגותי','בדיקת עמידה בחוקים ו-Tilt Detection','Behavioral Sentiment — אותות פסיכולוגיים בזמן אמת','דיאגנוסטיקה פסיכולוגית מתקדמת'] },
  { icon: '🛡️', title: 'מנוע סיכונים ומגבלות 4-שכבתי', items: ['מגבלת -1R לטרייד בודד','מגבלת -2R הפסד יומי','מגבלת -5R הפסד שבועי','מגבלת -10R הפסד חודשי','התראות RiskLimitAlert בזמן אמת','חישוב גודל פוזיציה אוטומטי + מינוף','זיהוי סטייה מהסיכון המתוכנן ו-Risk Drift','מצב צינון (Cool-Off) ומצב התאוששות','מד סיכון ויזואלי קומפקטי'] },
  { icon: '📝', title: 'יומן מסחר (Journal)', items: ['גשר Orca↔Journal לסנכרון מלא','ניתוח בוקר — מצב רוח, תוכנית, BTC, מאקרו','ניתוח סוף יום — טריידים, טעויות, לקחים','נעילות סינמטיות נפרדות לבוקר ולערב','צילומי גרפים (בוקר + ערב)','ארכיון מלא — חיפוש, מיון, צבעי סיכון','Date Picker דינמי + סנכרון תאריכים','אנליטיקת שלבים (Phase Analytics)'] },
  { icon: '🧪', title: 'יומן בק-טסט (Backtest Dimension)', items: ['דימנשן באקטסט נפרד לחלוטין (ניקוי דליפת theme)','תיעוד פרמטרים — נכס, כיוון, כניסה, יציאה, SL','חישוב R-Multiple, Win Rate, Profit Factor','אנימציית כניסה סינמטית עם קנדלסטיקים','ניווט חלק בין באקטסט למערכת הראשית'] },
  { icon: '📅', title: 'Calendar Hub — מרכז ה-P&L', items: ['הקלנדר הוא ה-Hub המרכזי של המערכת','לוח שנה אינטראקטיבי עם צבעי רווח/הפסד','מספר עסקאות יומי + סיכום שבועי','הדגשת ימי חריגה מסיכון','יצירת תובנות AI מתוך הקלנדר','תג תזכורת אדום לימי שישי ו-1 לחודש'] },
  { icon: '🤖', title: 'מנוע AI ותובנות התנהגותיות', items: ['AI Insights Deep — ניתוח דפוסים מתקדם','גרפים ברמת Awwwards: Radar, Scatter, Bar, Area','תובנות התנהגותיות דינמיות מנתונים חיים','זיהוי חוזקות, חולשות ואנומליות','התראות חכמות על סטיות בניהול סיכון','מבוסס Lovable AI Gateway (Gemini / GPT-5)'] },
  { icon: '📆', title: 'AI Weekly Review', items: ['דה-בריף שבועי בימי שישי','סינתזה אוטומטית של AI על הביצועים','מחזור חיים נעול (Locked Lifecycle)','גשר ל-Themes (midnight/indigo→night, platinum→snow)','תזכורות חכמות בקלנדר'] },
  { icon: '⚡', title: 'הזנת טריידים (Trade Entry Engine)', items: ['תמיכה בנכסים אוניברסליים (קריפטו, מניות, פורקס)','חישוב סיכון אוטומטי + Auto-Sizing','חישוב $/% Risk, Leverage, Position Size','וולידציה מול חוקי הסיכון בזמן אמת','אינטגרציה ישירה עם ה-Journal'] },
  { icon: '🔊', title: 'APEX OS Sound Engine', items: ['סינתזה ב-Web Audio API באיכות גבוהה','מאסטר וולום + הפעלה/כיבוי גלובלי','צלילים נפרדים לפעולות (Add, Lock, Alert, Win, Loss)','Gating מרכזי דרך soundsAllowed()'] },
  { icon: '💾', title: 'נתונים, ייבוא וגיבויים', items: ['גיבוי ריאקטיבי ב-JSON ו-XLSX','זיהוי headers אוטומטי ביבוא','אחסון פר-משתמש ב-Lovable Cloud עם RLS','Backup/Restore חלק','מערכת איפוס נתונים High-Friction'] },
  { icon: '🚀', title: 'אונבורדינג, אימות ו-PWA', items: ['Onboarding Wizard בן 5 שלבים','אימות Email+Password + Google OAuth','RequireAuth שומר על כל המסלולים','PWA — התקנה כאפליקציית Desktop/Mobile','Reset Password מובנה'] },
  { icon: '🎓', title: 'מצבי הפעלה ולמידה', items: ['Beginner / Standard / Alpha modes','מודאלים חינוכיים למדדים מורכבים','הסברי גרפים אינטראקטיביים','הסברי סיכון מובנים','טרמינולוגיה מסטנדרטית עברית/אנגלית'] },
];

const SECTIONS_EN: Section[] = [
  { icon: '🎨', title: 'Interface & UX', items: ['Premium dark UI with glass, lighting and Liquid Sweep effects','Full Hebrew (RTL) and English with instant switching','Sidebar nav + dynamic mobile popover menu','3 themes: Midnight, Indigo Noir, Platinum White','PS5-grade cinematic transitions with dimensional isolation','Glass cards and subtle micro-interactions','Privacy Mask for instant masking of financial data','Enterprise-grade mobile optimization (safe-area, 100dvh)','44px touch targets, adaptive density, no iOS zoom'] },
  { icon: '🎛️', title: 'Advanced Settings', items: ['Theme Studio — pick a custom accent and auto-derive a full palette','7-day lock on custom theme for visual stability','Live theme preview before commit','Density control (Compact / Comfortable / Spacious)','Dynamic Font Scale 85%–120% across the UI','Reduce Motion — disable non-essential animations','Master volume for APEX sounds + on/off + test sound','Trading defaults: risk %, R target, currency','Command Palette and keyboard shortcuts'] },
  { icon: '🚀', title: 'Smart Onboarding (5 Steps)', items: ['Identity step — full name with validation','Community step — connect to Orca community via QR code','Profiling step — pick trader level (Beginner/Mid/Advanced)','Value-prop step — personalized explanation per level','Commitment step — pledge to trading discipline','localStorage memory — never repeats','Premium blue-black-gold design'] },
  { icon: '📊', title: 'Trading Performance Analytics', items: ['Cumulative P&L and advanced equity curve','Win rate, Profit Factor and expectancy in R-multiples','Professional R-multiple distribution','Max Drawdown and depth analysis','Performance by asset, side, day of week and hour','Weekly, monthly and yearly summaries','AnalyticsQuantLab — professional quantitative modules','Structured dashboard tables with 3-tier hierarchy'] },
  { icon: '🐋', title: 'Orca Indices', items: ['Unique Orca Score (0–100)','Edge Health index','Market Regime Fit','Decision Quality & Discipline index','Risk Consistency & Risk Drift','Sub-score breakdown','Performance comparison over time'] },
  { icon: '🧠', title: 'Psychology & Behavior', items: ['PsychologyLab — emotional tracking and daily questionnaire','Overtrading & Revenge Trading detection','Fear & Greed index','Decision confidence and behavioral context','Rule-adherence check and Tilt Detection','Behavioral Sentiment — realtime psychological signals','Advanced psychological diagnostics'] },
  { icon: '🛡️', title: '4-Tier Risk & Limits Engine', items: ['-1R per single trade limit','-2R daily loss limit','-5R weekly loss limit','-10R monthly loss limit','Realtime RiskLimitAlert notifications','Auto position sizing + leverage','Plan-vs-actual Risk Drift detection','Cool-off and recovery modes','Compact visual risk meter'] },
  { icon: '📝', title: 'Trade Journal', items: ['Orca↔Journal bridge for full sync','Morning analysis — mood, plan, BTC, macro','End-of-day analysis — trades, mistakes, lessons','Cinematic separate locks for morning and evening','Chart screenshots (morning + evening)','Full archive — search, sort, risk colors','Dynamic date picker + date sync','Phase Analytics'] },
  { icon: '🧪', title: 'Backtest Dimension', items: ['Fully isolated backtest dimension (theme leakage cleared)','Parameter logging — asset, side, entry, exit, SL','R-Multiple, Win Rate, Profit Factor compute','Cinematic candlestick entry animation','Smooth navigation between backtest and main system'] },
  { icon: '📅', title: 'Calendar Hub — P&L Center', items: ['The calendar is the central hub of the system','Interactive calendar with profit/loss colors','Daily trade count + weekly summary','Risk-breach day highlighting','Generate AI insights from the calendar','Red reminder badge on Fridays and the 1st of the month'] },
  { icon: '🤖', title: 'AI Engine & Behavioral Insights', items: ['AI Insights Deep — advanced pattern analysis','Awwwards-grade charts: Radar, Scatter, Bar, Area','Dynamic behavioral insights from live data','Strengths, weaknesses and anomaly detection','Smart alerts on risk-management drift','Powered by Lovable AI Gateway (Gemini / GPT-5)'] },
  { icon: '📆', title: 'AI Weekly Review', items: ['Friday weekly debrief','Automated AI synthesis of performance','Locked lifecycle','Theme bridge (midnight/indigo→night, platinum→snow)','Smart calendar reminders'] },
  { icon: '⚡', title: 'Trade Entry Engine', items: ['Universal asset support (crypto, equities, forex)','Auto risk calculation + Auto-Sizing','$/% Risk, Leverage, Position Size compute','Realtime validation against risk rules','Direct integration with the Journal'] },
  { icon: '🔊', title: 'APEX OS Sound Engine', items: ['High-quality Web Audio API synthesis','Master volume + global on/off','Distinct sounds for actions (Add, Lock, Alert, Win, Loss)','Central gating via soundsAllowed()'] },
  { icon: '💾', title: 'Data, Imports & Backups', items: ['Reactive JSON & XLSX backups','Automatic header detection on import','Per-user storage on Lovable Cloud with RLS','Smooth Backup/Restore','High-friction data reset system'] },
  { icon: '🚀', title: 'Onboarding, Auth & PWA', items: ['5-step Onboarding Wizard','Email+Password + Google OAuth','RequireAuth guards every route','PWA — install as a Desktop/Mobile app','Built-in Reset Password'] },
  { icon: '🎓', title: 'Operating Modes & Learning', items: ['Beginner / Standard / Alpha modes','Educational modals for complex metrics','Interactive chart explanations','Built-in risk explanations','Standardized Hebrew/English terminology'] },
];

const COPY = {
  he: {
    brandSub: 'Trading Intelligence System',
    title: 'מערכת Orca – סביבת עבודה לסוחר מקצועי',
    intro: ['מערכת זו נבנתה כדי לעזור לחברי קהילת Orca להפוך לסוחרים טובים יותר באמצעות משמעת, ניתוח נתונים וניהול סיכונים מתקדם.','הדאשבורד משלב יומן מסחר, יומן בק-טסט, ניתוח ביצועים, מעקב פסיכולוגי, ניהול סיכונים וכלי בינה מלאכותית לתמונה מלאה על תהליך המסחר.','המטרה של המערכת אינה לייצר איתותים, אלא לעזור לסוחר להבין את הביצועים שלו ולשפר את קבלת ההחלטות לאורך זמן.'],
    disclaimerTitle: '⚠️ הבהרה חשובה',
    disclaimer: 'המערכת אינה מערכת איתותים ואינה מספקת המלצות השקעה. הנתונים והניתוחים המוצגים מבוססים על פעילות המסחר האישית של המשתמש ונועדו לצרכי למידה, שיפור תהליך המסחר ופיתוח משמעת מקצועית. המסחר בשווקים פיננסיים כרוך בסיכון, ועל כל משתמש לפעול בהתאם לשיקול דעתו האישי.',
  },
  en: {
    brandSub: 'Trading Intelligence System',
    title: 'Orca System — A Professional Trader Workspace',
    intro: ['This system was built to help Orca community members become better traders through discipline, data analysis and advanced risk management.','The dashboard combines a trade journal, backtest journal, performance analytics, psychological tracking, risk management and AI tooling for a full picture of your trading process.','The goal of the system is not to generate signals, but to help the trader understand performance and improve decision-making over time.'],
    disclaimerTitle: '⚠️ Important Disclaimer',
    disclaimer: 'This is not a signals service and does not provide investment advice. All data and analytics shown are based on the user\'s own trading activity and are intended for learning, improving the trading process and developing professional discipline. Trading financial markets involves risk; each user must act according to their own judgment.',
  },
};


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
        className="orca-manifest-shell"
        style={{
          background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
          border: `1px solid ${T.border.medium}`,
          borderRadius: T.radius.xl,
          maxWidth: 780, width: '94%', maxHeight: '90dvh', overflow: 'hidden',
          boxShadow: `${T.shadow.elevated}, 0 0 80px rgba(0,0,0,0.4)`,
          animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <style>{`
          @media (max-width: 640px) {
            .orca-manifest-shell { width: 100% !important; max-width: 100% !important; max-height: 100dvh !important; height: 100dvh !important; border-radius: 0 !important; }
            .orca-manifest-shell .orca-manifest-header { padding: 18px 16px 14px !important; }
            .orca-manifest-shell .orca-manifest-body { padding: 14px 16px 24px !important; padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important; }
            .orca-manifest-shell .orca-manifest-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
            .orca-manifest-shell h2 { font-size: 13px !important; }
            .orca-manifest-shell .orca-manifest-intro { font-size: 11px !important; line-height: 1.6 !important; }
          }
        `}</style>
        {/* Header */}
        <div className="orca-manifest-header" style={{
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
                  <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                    Trading Intelligence System
                  </div>
                </div>
              </div>
              <h2 style={{
                fontSize: 15, fontWeight: 700, color: T.text.primary, margin: '0 0 10px',
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5,
                direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left',
              }}>
                {copy.title}
              </h2>
              <p className="orca-manifest-intro" style={{
                fontSize: 12, color: T.text.secondary, lineHeight: 1.8, margin: 0,
                direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left',
              }}>
                {copy.intro.map((line, i) => (
                  <span key={i}>{line}{i < copy.intro.length - 1 && <br />}</span>
                ))}
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
        <div className="orca-manifest-body" style={{ overflow: 'auto', padding: '20px 32px 28px', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          {/* Disclaimer */}
          <div style={{
            padding: 16, marginBottom: 20,
            background: `${T.accent.orange}06`, border: `1px solid ${T.accent.orange}18`,
            borderRadius: T.radius.md, direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left',
          }}>
            <div style={{ fontSize: 9, color: T.accent.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {copy.disclaimerTitle}
            </div>
            <p style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.8, margin: 0 }}>
              {copy.disclaimer}
            </p>
          </div>

          {/* Feature sections */}
          <div className="orca-manifest-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {sections.map((section, i) => (
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
                    fontFamily: "'JetBrains Mono', monospace", direction: isRTL ? 'rtl' : 'ltr',
                  }}>
                    {section.title}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, direction: isRTL ? 'rtl' : 'ltr' }}>
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
            <div style={{ fontSize: 10, color: T.text.muted, letterSpacing: '0.08em' }}>
              ORCA INVESTMENT — TRADING INTELLIGENCE SYSTEM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
