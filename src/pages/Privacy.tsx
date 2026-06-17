import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. הצהרת יסוד ושליטה',
    body: 'Orca Investment מספקת כלי ניתוח טכנולוגי (Analytics) לניהול יומן מסחר. אנו דוגלים בפרטיות מוחלטת ובריבונות המשתמש. השימוש במערכת מהווה הסכמה מלאה לתנאים הבאים.',
  },
  {
    heading: '2. אבטחה וטכנולוגיית API (מנגנון הגנה אקטיבי)',
    body:
      'חסימת הרשאות מסחר: המערכת מתוכנתת לבצע ולידציה לכל מפתח API שמוזן אליה. במידה ומפתח כולל הרשאות מסחר (Trade) או משיכה (Withdrawal), המערכת תחסום את הוספת המפתח באופן אוטומטי.\n\n' +
      'Read-Only בלבד: המערכת פועלת אך ורק במצב "קריאה בלבד". המשתמש מאשר כי לא ניתן לבצע פעולות מסחר דרך הממשק שלנו, וכי המנגנון הטכני שלנו מונע זאת אקטיבית.\n\n' +
      'הסרת אחריות: המשתמש מצהיר כי הוא מבין שהמערכת מספקת תצוגה בלבד, וכי כל נזק שיגרם כתוצאה מפעולות מסחר שבוצעו בבורסות צד ג\' על סמך נתוני המערכת הינו באחריותו הבלעדית.',
  },
  {
    heading: '3. מחיקת נתונים וריבונות המשתמש',
    body:
      'מחיקה מלאה (Hard Delete): אנו מעניקים לך כפתור "מחיקת נתונים". בלחיצה עליו, כל המידע המשויך לחשבונך (נתוני מסחר, סטטיסטיקות, יומנים) נמחק פיזית מהשרתים שלנו.\n\n' +
      'אפס עקבות: לאחר המחיקה, לא נשמרים עותקים או גיבויים. הנתונים הופכים לבלתי ניתנים לשחזור.\n\n' +
      'סייג חוקי: למרות האמור, הפלטפורמה תפעל בהתאם להוראות הדין ולצווים שיפוטיים מחייבים, במקרים בהם נדרש שיתוף פעולה עם רשויות אכיפת החוק על פי חוק.',
  },
  {
    heading: '4. הגבלת אחריות ודיוק נתונים',
    body:
      'הערכות סטטיסטיות בלבד: כל המדדים המוצגים (תוחלת, שארפ, קריטריון קלי, Alpha Live) הם הערכות סטטיסטיות המבוססות על נתוני עבר. הם אינם מהווים ייעוץ השקעות, המלצה או תחזית לעתיד.\n\n' +
      'אימות נתונים: הפלטפורמה אינה אחראית לדיוק הנתונים המתקבלים משרתי צד שלישי (בורסות). על המשתמש לאמת נתונים קריטיים מול הבורסה עצמה לפני כל החלטה.\n\n' +
      'אין התחייבות: המערכת מסופקת "כפי שהיא" (As-Is). לא תהיה למשתמש כל תביעה בגין אי-דיוקים בנתונים, עיכובי רשת או תקלות בחישובי ה-Proxy.',
  },
  {
    heading: '5. שיתוף מידע ופרטיות',
    body:
      'איסור מכירה: אנו מתחייבים לא למכור, להשכיר או לשתף נתוני משתמשים עם גורמים חיצוניים.\n\n' +
      'עוגיות (Cookies): אנו משתמשים בעוגיות הכרחיות לצורך ניהול התחברות (Session) בלבד, ללא מעקב שיווקי.',
  },
  {
    heading: '6. סמכות שיפוט',
    body: 'סמכות השיפוט הבלעדית בכל הנוגע להסכם זה ותנאי השימוש תהיה לבתי המשפט המוסמכים במחוז תל אביב-יפו.',
  },
];

const Privacy = () => {
  const { isRTL, t } = useLang();
  useEffect(() => {
    window.scrollTo(0, 0);
    const prev = document.title;
    document.title = isRTL ? 'מדיניות פרטיות — Orca' : 'Privacy Policy — Orca';
    return () => { document.title = prev; };
  }, [isRTL]);

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={isRTL ? 'he' : 'en'}
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(1200px 600px at 50% -10%, rgba(0,242,255,0.08), transparent 60%), #061326',
        color: '#e6f4ff',
        fontFamily: "'Poppins', sans-serif",
        padding: '48px 20px',
      }}
    >
      <article
        style={{
          maxWidth: 880, margin: '0 auto',
          background: 'rgba(8,22,46,0.85)',
          border: '1px solid rgba(0,242,255,0.18)',
          borderRadius: 16,
          padding: '36px clamp(20px, 4vw, 48px)',
          boxShadow: '0 0 0 1px rgba(0,242,255,0.05), 0 20px 80px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7fe6ff', fontSize: 13, textDecoration: 'none', marginBottom: 24, opacity: 0.9 }}>
          {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />} {t('חזרה לאפליקציה', 'Back to the app')}
        </Link>

        <h1 style={{ fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 800, lineHeight: 1.4, margin: '0 0 8px', background: 'linear-gradient(90deg, #00f2ff, #7fe6ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('מדיניות פרטיות ותנאי שימוש — Orca Investment', 'Privacy Policy & Terms of Use — Orca Investment')}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 28px' }}>{t('עדכון אחרון:', 'Last updated:')} 16.6.2026</p>

        {!isRTL && (
          <div dir="ltr" style={{ marginBottom: 24, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,242,255,0.18)', background: 'rgba(0,242,255,0.06)', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(230,244,255,0.85)' }}>
            <strong style={{ color: '#7fe6ff' }}>Notice.</strong> The legally binding text of this policy is the Hebrew version below, in accordance with the exclusive jurisdiction of the courts of Tel Aviv-Yafo. An English summary is available on request at <a href="mailto:innovationai@mail.com" style={{ color: '#7fe6ff' }}>innovationai@mail.com</a>.
          </div>
        )}

        <div dir="rtl" lang="he" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#00f2ff' }}>{s.heading}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(230,244,255,0.88)', whiteSpace: 'pre-line', margin: 0 }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
};

export default Privacy;
