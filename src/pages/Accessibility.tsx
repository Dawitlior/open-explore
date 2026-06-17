import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';

type Section = { heading: string; body: string | string[] };

const Accessibility = () => {
  const { isRTL, t } = useLang();

  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = isRTL
      ? 'הצהרת נגישות — Orca'
      : 'Accessibility Statement — Orca';
    return () => { document.title = prevTitle; };
  }, [isRTL]);

  const lastUpdated = isRTL ? '17 ביוני 2026' : 'June 17, 2026';
  const title = isRTL
    ? 'הצהרת נגישות רשמית – פלטפורמת APEX OS (Orca Investment)'
    : 'Official Accessibility Statement – APEX OS Platform (Orca Investment)';

  const intro = isRTL
    ? 'מפעילי אתר ופלטפורמת APEX OS וקהילת Orca Investment (להלן: "הנהלת האתר") רואים בחשיבות עליונה את אספקת שירותיהם באופן שוויוני, מכבד ונגיש לכלל הציבור, לרבות אנשים עם מוגבלויות. אנו משקיעים משאבים ומאמצים על מנת להתאים את אתר האינטרנט והפלטפורמה הדיגיטלית לדרישות החוק, מתוך אמונה כי לכל אדם זכות שווה לשימוש עצמאי ויעיל במרחב הדיגיטלי.'
    : 'The operators of the APEX OS website and platform and the Orca Investment community (hereinafter: "the site administration") consider it of utmost importance to deliver their services equitably, respectfully and accessibly to the public at large, including people with disabilities. We invest resources and effort to adapt the website and the digital platform to the requirements of the law, believing that every person has an equal right to independent and effective use of the digital space.';

  const sections: Section[] = isRTL ? [
    {
      heading: '1. מעמד נגישות ותאימות לתקן (Compliance Status)',
      body: [
        'האתר והפלטפורמה נמצאים בשלבי פיתוח והרצה אקטיביים (Beta Deployment).',
        'התאמות הנגישות הדיגיטליות מבוצעות בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998 ולתקנות שהותקנו מכוחו, וכן על פי המלצות התקן הישראלי (ת"י 5568) לנגישות תכנים באינטרנט ברמת AA. תקן זה מאמץ את הנחיות מסמך Web Content Accessibility Guidelines (WCAG) 2.1 של ארגון ה-W3C הבינלאומי.',
        'הבהרה משפטית: נכון למועד עדכון הצהרה זו, טרם הוטמע בפלטפורמה רכיב (תוסף) נגישות ייעודי אוטומטי. עם זאת, תשתיות הליבה הטכנולוגיות של הפלטפורמה תוכננו ופותחו מראש באופן המטמיע אלמנטים מבניים התומכים בטכנולוגיות מסייעות.',
      ],
    },
    {
      heading: '2. התאמות נגישות מובנות הקיימות בפלטפורמה (Native Core Features)',
      body: [
        'על אף היעדר רכיב ההנגשה החיצוני, הוטמעו בקוד המערכת הרכיבים המבניים הבאים:',
        '• תמיכה מובנית בכיווניות (Semantic RTL): הפלטפורמה פותחה באופן נייטיבי לתמיכה מלאה בכיווניות ימין-שמאל. כל התכנים, התוויות (Labels) והפקדים מבוססים על קוד מקור מתורגם ומובנה (Author-curated) המונע שגיאות פענוח על ידי קוראי מסך.',
        '• מנגנון שינוי גודל תצוגה וגופן (UI Density & Font Scale): קוד המערכת כולל מנוע דינמי המאפשר למשתמש לבחור את רמת צפיפות הממשק וגודל הגופן בטווח של 80% עד 130% באמצעות ערכים יחסיים, באופן שמונע שבירת ממשק, חפיפת טקסט או עיוות ויזואלי.',
        '• תאימות לכלי זום של מערכות הפעלה (OS Zoom Compatibility): למרות שרכיב ה-Pinch-to-zoom נחסם זמנית בגרסת המובייל במטרה למנוע שגיאות מסחר והקלדה קריטיות (Trading Execution Errors), המערכת מאפשרת תאימות מלאה ועקיפה של כלי הזום המובנים במערכות ההפעלה ובדפדפנים השונים.',
      ],
    },
    {
      heading: '3. פערים קיימים בנגישות ותוכנית הנגשה (Roadmap)',
      body: [
        'הנהלת האתר מנהלת תהליך רציף של בקרה ושיפור הנגישות. להלן רכיבים אשר אינם נגישים באופן מלא בשלב הנוכחי:',
        '• ניווט מקלדת: חלק מרכיבי התפריטים הדינמיים אינם תומכים באופן מלא בניווט באמצעות מקלדת בלבד (Keyboard Focus Traps).',
        '• טקסט אלטרנטיבי (Alt Text): גרפים פיננסיים, אינדיקטורים של משטרי שוק (Market Regime Indicators) והדמיות ויזואליות דינמיות המוזנים בזמן אמת אינם כוללים תיאור קולי מלא עבור לקויי ראייה.',
        '• תוספת תפריט נגישות: שילוב סרגל כלים ייעודי לנגישות (הכולל התאמות ניגודיות, פלטת צבעים לעיוורי צבעים והקראת טקסט) מתוזמן ומתוכנן להטמעה מלאה במהלך הרבעון השלישי של שנת 2026.',
      ],
    },
    {
      heading: '4. נגישות פיזית / שירות לקוחות',
      body: 'השירות ניתן במלואו באופן דיגיטלי ואין קבלת קהל פרונטלית. ערוצי שירות הלקוחות והתמיכה פועלים באמצעים דיגיטליים כתובים (דואר אלקטרוני ופלטפורמות קהילה מבוססות טקסט), המאפשרים מענה מותאם גם למשתמשים עם מוגבלויות שמיעה או דיבור.',
    },
    {
      heading: '5. פרטי רכז הנגישות ודרכי פנייה לדיווח על תקלות',
      body: [
        'אם במהלך השימוש בפלטפורמה נתקלתם בקושי, במידע שאינו נגיש, או ברכיב שאינו עומד בדרישות התקן, אנא פנו אלינו על מנת שנוכל לתקן את הליקוי בהקדם.',
        'מחלקת תמיכה ונגישות – APEX OS',
        'דואר אלקטרוני: innovationai@mail.com',
        'ערוץ: פניות דיגיטליות בלבד.',
        'בעת פנייה בנושאי נגישות, נבקש לציין ככל הניתן את הפרטים הבאים על מנת שנוכל לטפל בפנייה ביעילות המרבית:',
        '• תיאור הבעיה בה נתקלתם.',
        '• באיזה דף או רכיב בפלטפורמה ניסיתם לבצע את הפעולה.',
        '• סוג הדפדפן ומערכת ההפעלה בהם השתמשתם.',
        '• סוג הטכנולוגיה המסייעת (אם נעשה בה שימוש, כגון: קורא מסך מסוג NVDA/JAWS).',
      ],
    },
  ] : [
    {
      heading: '1. Compliance Status',
      body: [
        'The website and platform are in active development and beta deployment.',
        'Digital accessibility adaptations are performed in accordance with the Israeli Equal Rights for People with Disabilities Law, 5758-1998 and the regulations enacted under it, as well as the recommendations of the Israeli Standard (IS 5568) for web content accessibility at Level AA. This standard adopts the W3C Web Content Accessibility Guidelines (WCAG) 2.1.',
        'Legal clarification: as of the date of this statement, a dedicated automated accessibility plug-in has not yet been integrated into the platform. However, the platform\'s core technological foundations were designed and developed from the outset to embed structural elements that support assistive technologies.',
      ],
    },
    {
      heading: '2. Native Core Accessibility Features',
      body: [
        'Despite the absence of an external accessibility plug-in, the following structural components are implemented in the system\'s source code:',
        '• Native Bidirectionality (Semantic RTL/LTR): the platform was built with first-class support for right-to-left and left-to-right reading directions. All content, labels and controls are based on author-curated, translated source code that prevents parsing errors by screen readers.',
        '• UI Density & Font Scale: the system includes a dynamic engine that lets users select interface density and font scale within an 80%–130% range using relative units, in a manner that prevents layout breakage, text overlap or visual distortion.',
        '• OS Zoom Compatibility: although pinch-to-zoom has been temporarily disabled in the mobile build in order to prevent critical trading execution errors, the system is fully compatible with the native zoom tools of operating systems and browsers.',
      ],
    },
    {
      heading: '3. Known Accessibility Gaps & Roadmap',
      body: [
        'The site administration runs a continuous process of accessibility monitoring and improvement. The following items are not yet fully accessible at this stage:',
        '• Keyboard navigation: some elements of the dynamic menus are not fully navigable by keyboard alone (keyboard focus traps).',
        '• Alternative text: real-time financial charts, market regime indicators and dynamic visualisations do not yet include full descriptive narration for users with visual impairments.',
        '• Accessibility toolbar: integration of a dedicated accessibility toolbar (contrast adjustments, color-blind palettes and text-to-speech) is scheduled for full deployment during the third quarter of 2026.',
      ],
    },
    {
      heading: '4. Physical Accessibility / Customer Service',
      body: 'The service is delivered entirely digitally; there is no walk-in office. Customer support channels operate exclusively through written digital means (email and text-based community platforms), which allow tailored responses for users with hearing or speech impairments.',
    },
    {
      heading: '5. Accessibility Coordinator & How to Report Issues',
      body: [
        'If, while using the platform, you encounter a difficulty, content that is not accessible, or a component that does not meet the standard, please contact us so we can address the issue as soon as possible.',
        'APEX OS — Support & Accessibility',
        'Email: innovationai@mail.com',
        'Channel: digital correspondence only.',
        'When contacting us about accessibility, please include the following information so we can handle your request as effectively as possible:',
        '• A description of the issue you encountered.',
        '• The page or component where you attempted the action.',
        '• The browser and operating system you were using.',
        '• The type of assistive technology in use, if any (e.g. screen readers such as NVDA / JAWS).',
      ],
    },
  ];

  const back = isRTL ? 'חזרה לאפליקציה' : 'Back to the app';
  const updatedLabel = isRTL ? 'עדכון אחרון:' : 'Last updated:';

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={isRTL ? 'he' : 'en'}
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(0,242,255,0.08), transparent 60%), #061326',
        color: '#e6f4ff',
        fontFamily: "'Poppins', sans-serif",
        padding: '48px 20px',
      }}
    >
      <article
        style={{
          maxWidth: 880,
          margin: '0 auto',
          background: 'rgba(8,22,46,0.85)',
          border: '1px solid rgba(0,242,255,0.18)',
          borderRadius: 16,
          padding: '36px clamp(20px, 4vw, 48px)',
          boxShadow: '0 0 0 1px rgba(0,242,255,0.05), 0 20px 80px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#7fe6ff', fontSize: 13, textDecoration: 'none',
            marginBottom: 24, opacity: 0.9,
          }}
        >
          {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
          {back}
        </Link>

        <h1
          style={{
            fontSize: 'clamp(20px, 2.6vw, 28px)',
            fontWeight: 800, lineHeight: 1.4, margin: '0 0 8px',
            background: 'linear-gradient(90deg, #00f2ff, #7fe6ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 20px' }}>
          {updatedLabel} {lastUpdated}
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(230,244,255,0.88)', margin: '0 0 28px' }}>
          {intro}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#00f2ff' }}>
                {s.heading}
              </h2>
              {Array.isArray(s.body) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {s.body.map((p, i) => (
                    <p key={i} style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(230,244,255,0.88)', margin: 0 }}>
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(230,244,255,0.88)', margin: 0 }}>
                  {s.body}
                </p>
              )}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
};

export default Accessibility;
