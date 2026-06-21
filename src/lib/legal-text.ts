// Full bilingual Terms of Service + Privacy Policy for OrcaInvestment.
// Single source of truth — used by /terms, /privacy, LegalGate modal, Settings.
// Version v2.0_orca_investment — 20 June 2026.
// Hebrew is the legally binding text. English is provided for accessibility.

export const LEGAL_VERSION = 'v2.0_orca_investment';
export const LEGAL_VERSION_DATE = '2026-06-20';

export const LEGAL_TITLE_HE = 'תקנון ותנאי שימוש – OrcaInvestment';
export const LEGAL_TITLE_EN = 'OrcaInvestment — Terms of Service';

export const PRIVACY_TITLE_HE = 'מדיניות פרטיות והגנת מידע – OrcaInvestment';
export const PRIVACY_TITLE_EN = 'OrcaInvestment — Privacy Policy';

export type LegalSection = { heading: string; body: string };

export const LEGAL_SECTIONS_HE: LegalSection[] = [
  {
    heading: 'מבוא והסכמה לתנאים',
    body:
      'ברוכים הבאים לפלטפורמת OrcaInvestment (להלן: "הפלטפורמה" או "המערכת"). הפלטפורמה מופעלת על ידי מפעיל המערכת (להלן: "המפעיל") ומעמידה לרשות סוחרים בשווקים הפיננסיים כלים מתקדמים לניהול סיכונים, תיעוד ומעקב אחר ביצועי מסחר באמצעות חיבורי ממשק (API), וניתוח מדדי משמעת עצמית ופסיכולוגיית מסחר.\n\n' +
      'תקנון ותנאי שימוש אלו (להלן: "התקנון") מהווים חוזה משפטי מחייב בין המפעיל לבין כל אדם הגולש, נרשם, מתחבר או עושה שימוש מכל סוג שהוא בפלטפורמה או בשירותיה (להלן: "המשתמש").\n\n' +
      'אנא קרא את התקנון בקפידה. הגלישה באתר, יצירת חשבון, או הזנת מפתחות גישה (API) למערכת, מהווים הסכמה מלאה, מוחלטת ובלתי חוזרת לכל התנאים, ההתניות והסעיפים המופיעים במסמך זה. במידה ואינך מסכים לתנאי כלשהו בתקנון זה, הנך נדרש להפסיק את השימוש בפלטפורמה באופן מיידי ואינך מורשה לעשות בה כל שימוש.',
  },
  {
    heading: '1. כשירות, הרשמה והגבלות גישה',
    body:
      '1.1. הגבלת גיל: השימוש בפלטפורמה מותר אך ורק למשתמשים מעל גיל 18 אשר כשירים משפטית לבצע פעולות מחייבות על פי דין. בעצם הרישום, המשתמש מצהיר ומאשר כי הוא עומד בתנאי גיל זה.\n\n' +
      '1.2. איסור תחרות (Anti-Compete): חל איסור מוחלט לעשות שימוש בפלטפורמה, בתכניה, בעיצובה או בלוגיקה שלה לצורך פיתוח, ייצור, שיווק או קידום של מערכת מתחרה, במישרין או בעקיפין. המפעיל שומר לעצמו את הזכות הבלעדית לחסום לאלתר וללא הודעה מוקדמת גישה של כל משתמש אשר יעלה לגביו חשד סביר כי הוא פועל מטעם מתחרה עסקי או מנסה להעתיק את שיטות העבודה של המערכת.\n\n' +
      '1.3. אמיתות פרטים: בעת ההרשמה, המשתמש מתחייב לספק פרטים נכונים, מלאים ומדויקים. מסירת פרטים שגויים או כוזבים במתכוון תהווה עילה לחסימה מיידית של החשבון ומחיקתו.',
  },
  {
    heading: '2. היעדר ייעוץ פיננסי (No Financial Advice) והגבלת אחריות מוחלטת',
    body:
      '2.1. כלי עזר טכנולוגי בלבד: המידע, המדדים, האנליטיקות ונתוני ניהול הסיכונים המוצגים בפלטפורמה מופקים למטרות סטטיסטיות, חינוכיות ושיפור המשמעת העצמית בלבד. אין לראות במערכת, בתכניה או בהתראותיה משום ייעוץ השקעות, המלצה לביצוע עסקאות, או תחליף לייעוץ פיננסי מקצועי המותאם לנסיבותיו האישיות של המשתמש.\n\n' +
      '2.2. אחריות בלעדית על פעולות המסחר: כל החלטת מסחר, קביעת רמות סיכון (כגון R Units), ניהול פוזיציות או הפעלת מנגנוני הגנה והשבתת מסחר (Kill Switch) מבוצעים על ידי המשתמש ובאחריותו הבלעדית והמלאה.\n\n' +
      '2.3. פטור מאחריות לנזקים כספיים: המפעיל, עובדיו או מי מטעמו לא יהיו אחראים בשום דרך ובשום מקרה לשום נזק, הפסד כספי, אובדן רווחים, או פגיעה (ישירה, עקיפה, תוצאתית או מיוחדת) שייגרמו למשתמש או לצד שלישי כתוצאה מהסתמכות על הנתונים המוצגים במערכת, שימוש במערכת או חוסר יכולת להשתמש בה.',
  },
  {
    heading: '3. קניין רוחני ואיסור סריקה אוטומטית (Anti-Scraping)',
    body:
      '3.1. בעלות מלאה על הקניין הרוחני: כל זכויות היוצרים, סימני המסחר, קוד המקור, הארכיטקטורה, האלגוריתמים, שיטות הניתוח, עיצוב ממשק המשתמש (UI/UX) והרעיונות העומדים בבסיס פלטפורמת OrcaInvestment הם קניינו הרוחני הבלעדי של המפעיל. אין להעתיק, להפיץ, להציג בפומבי, לשנות או לעשות שימוש מסחרי כלשהו בכל חלק מהפלטפורמה ללא אישור מפורש בכתב ומראש מהמפעיל.\n\n' +
      '3.2. איסור כריית נתונים והנדסה לאחור: חל איסור מוחלט להפעיל יישומי מחשב, בוטים, סורקים (Crawlers, Robots) או כל כלי אוטומטי אחר לשם חיפוש, סריקה, העתקה, כרייה או אחזור אוטומטי של נתונים ותכנים מתוך הפלטפורמה. כמו כן, חל איסור מוחלט לבצע הנדסה לאחור (Reverse Engineering), פירוק או שינוי של קוד המערכת.',
  },
  {
    heading: '4. זמינות השירות ותקלות (AS-IS)',
    body:
      '4.1. אספקת השירות כמות שהוא: הפלטפורמה ניתנת לשימוש כמות שהיא ("AS-IS") וככל שהיא זמינה ("AS-AVAILABLE"). המפעיל אינו מתחייב שהשירותים ינתנו כסדרם ללא הפסקות, יהיו חסינים מפני גישה בלתי מורשית, או יהיו חפים משגיאות, באגים או תקלות במערכות התקשורת, החומרה או התוכנה.\n\n' +
      '4.2. שינויים והשבתות זמניות: המפעיל שומר לעצמו את הזכות הבלעדית לשנות, לעדכן, להוסיף או להסיר פיצ\'רים, ממשקים וכלים מהמערכת בכל עת, וכן להשבית את המערכת באופן זמני לצורכי תחזוקה, וכל זאת ללא הודעה מוקדמת למשתמשים ולא תעמוד למשתמש כל טענה או דרישה בשל כך.',
  },
  {
    heading: '5. שיפוי משפטי (Indemnification)',
    body:
      '5.1. חובת המשתמש לשיפוי: המשתמש מתחייב לשפות, לפצות ולהגן על המפעיל, מנהליו, שותפיו העסקיים ועובדיו מפני כל תביעה, דרישה, נזק, הפסד, אובדן רווח או הוצאה (לרבות שכר טרחת עורכי דין והוצאות משפט) שינבעו מהפרת תנאי תקנון זה על ידי המשתמש, או משימוש בלתי חוקי, רשלני או בלתי מורשה שלו בפלטפורמה.',
  },
  {
    heading: '6. מודל שימוש, שינוי תמחור עתידי ומסגרת רכישות',
    body:
      '6.1. גישה חינמית בשלב הנוכחי (Early Adopters): נכון למועד כתיבת תקנון זה, המפעיל מעמיד את שירותי ופיצ\'רי הליבה של הפלטפורמה לשימוש ללא עלות כספית, לטובת צמיחת הקהילה. המשתמש מאשר ומסכים כי גישה חינמית זו מוענקת כחסד זמני, ואינה מהווה בשום אופן התחייבות, הבטחה או יצירת זכות מוקנית לקבלת המערכת בחינם לצמיתות.\n\n' +
      '6.2. הזכות לשינוי המודל העסקי וגביית תשלום: המפעיל שומר לעצמו את הזכות המלאה והבלעדית, בכל עת ועל פי שיקול דעתו המוחלט, לשנות את המודל העסקי של OrcaInvestment. במסגרת זו רשאי המפעיל, בין היתר: לגבות תשלום מנוי חודשי/שנתי עבור השימוש במערכת (כולה או חלקה); להעביר פיצ\'רים קיימים אל מאחורי חומת תשלום (Paywall); או להגביל את נפח הנתונים, הטריידים וסנכרוני ה-API במסלול החינמי.\n\n' +
      '6.3. הגנה על העברת בעלות, מיזוגים ואקזיטים: הזכות לשינוי המודל העסקי ואיפוס הגישה החינמית מוקנית במלואה גם לכל צד שלישי או ישות משפטית חדשה אשר ירכשו את הפלטפורמה, יתמזגו עמה או יקבלו את זכויות הניהול בה. במקרה של מעבר בעלות, הגוף הרוכש לא יהיה מחויב להעניק גישה חינמית למשתמשים היסטוריים ויהיה רשאי לדרוש תשלום באופן מיידי.\n\n' +
      '6.4. הודעה על מעבר לתשלום: במידה ויוחלט על גביית תשלום, תפורסם הודעה על כך בפלטפורמה או תישלח הודעה לכתובת הדוא"ל של המשתמש. משתמש שיבחר שלא להסדיר את התשלום הנדרש, גישתו למערכת או לחלקים ממנה תיחסם, והמפעיל יהיה רשאי למחוק את חיבורי ה-API שלו.\n\n' +
      '6.5. מסגרת משפטית לשירותים עתידיים בתשלום (מדיניות ביטולים): ככל שיופעלו בעתיד מסלולים בתשלום, הם יופעלו בכפוף להוראות חוק הגנת הצרכן, התשמ"א-1981 ותקנותיו. ביטול עסקה שנתית/חד-פעמית יתאפשר בתוך 14 ימים ממועד הרכישה, בניכוי דמי ביטול כחוק (5% מגובה העסקה או 100 ש"ח, לפי הנמוך מביניהם) ובניכוי החלק היחסי שסופק. ביטול מנוי חודשי מתחדש יתאפשר בכל עת דרך ממשק המשתמש, ייכנס לתוקף בסוף מחזור החיוב הנוכחי, ולא יקנה זכות להחזר כספי יחסי בגין ימים שלא נוצלו באותו החודש.',
  },
];

export const LEGAL_SECTIONS_EN: LegalSection[] = [
  {
    heading: 'Introduction & Acceptance of Terms',
    body:
      'Welcome to the OrcaInvestment platform (the "Platform" or the "System"). The Platform is operated by the system operator (the "Operator") and provides traders in the financial markets with advanced tools for risk management, journaling and performance tracking via API connections, as well as analytics for self-discipline and trading psychology.\n\n' +
      'These Terms of Service (the "Terms") constitute a binding legal agreement between the Operator and any person who browses, registers, logs in or uses the Platform or its services in any way (the "User").\n\n' +
      'Please read these Terms carefully. Browsing the site, creating an account, or entering API keys into the System constitute full, absolute and irrevocable acceptance of every condition and clause set out in this document. If you do not agree to any term herein, you must immediately stop using the Platform; you are not permitted to use it in any manner.\n\n' +
      'Note: The Hebrew version of these Terms is the legally binding text. This English version is provided for accessibility only; in any inconsistency the Hebrew version prevails.',
  },
  {
    heading: '1. Eligibility, Registration & Access Restrictions',
    body:
      '1.1. Age restriction: Use of the Platform is permitted only to users aged 18 or above who are legally competent to enter into binding actions. By registering, the User declares and confirms that they meet this age requirement.\n\n' +
      '1.2. Anti-Compete: It is strictly prohibited to use the Platform, its content, design or logic in order to develop, produce, market or promote a competing system, directly or indirectly. The Operator reserves the sole right to block, immediately and without prior notice, any User reasonably suspected of acting on behalf of a business competitor or attempting to copy the System\'s methodology.\n\n' +
      '1.3. Accuracy of details: When registering, the User undertakes to provide accurate, complete and correct details. Knowingly providing false or inaccurate details will be grounds for immediate suspension and deletion of the account.',
  },
  {
    heading: '2. No Financial Advice & Limitation of Liability',
    body:
      '2.1. Technological tool only: The information, metrics, analytics and risk-management figures displayed in the Platform are produced for statistical, educational and self-discipline purposes only. The System, its content and alerts shall not be regarded as investment advice, a recommendation to execute trades, or a substitute for professional financial advice tailored to the User\'s personal circumstances.\n\n' +
      '2.2. Sole responsibility for trading: Every trading decision, definition of risk levels (such as R Units), management of positions or activation of protection and trading-halt mechanisms (Kill Switch) is performed by the User and is solely and fully their responsibility.\n\n' +
      '2.3. Liability exclusion for financial loss: The Operator, its employees and anyone acting on its behalf shall not be liable in any way and under any circumstances for any damage, financial loss, loss of profit, or harm (direct, indirect, consequential or special) caused to the User or any third party as a result of relying on data displayed in the System, using the System, or being unable to use it.',
  },
  {
    heading: '3. Intellectual Property & Anti-Scraping',
    body:
      '3.1. Full ownership of intellectual property: All copyrights, trademarks, source code, architecture, algorithms, analytical methods, UI/UX design and ideas underlying the OrcaInvestment platform are the exclusive intellectual property of the Operator. No part of the Platform may be copied, distributed, publicly displayed, modified or commercially exploited without the express prior written consent of the Operator.\n\n' +
      '3.2. No data mining or reverse engineering: It is strictly prohibited to operate applications, bots, crawlers, robots or any other automated tool for searching, scanning, copying, mining or automatically retrieving data and content from the Platform. Reverse engineering, decompiling or altering the System code is likewise strictly prohibited.',
  },
  {
    heading: '4. Service Availability & Faults (AS-IS)',
    body:
      '4.1. Service provided AS-IS: The Platform is provided on an "AS-IS" and "AS-AVAILABLE" basis. The Operator does not warrant that services will be uninterrupted, immune to unauthorised access, or free of errors, bugs or faults in communications, hardware or software systems.\n\n' +
      '4.2. Changes and temporary downtime: The Operator reserves the sole right to change, update, add or remove features, interfaces and tools at any time, and to temporarily take the System down for maintenance, all without prior notice and without giving rise to any claim or demand from the User.',
  },
  {
    heading: '5. Indemnification',
    body:
      '5.1. User\'s indemnification obligation: The User undertakes to indemnify, compensate and defend the Operator, its directors, business partners and employees against any claim, demand, damage, loss, loss of profit or expense (including attorneys\' fees and court costs) arising out of the User\'s breach of these Terms or out of the User\'s unlawful, negligent or unauthorised use of the Platform.',
  },
  {
    heading: '6. Usage Model, Future Pricing & Purchases Framework',
    body:
      '6.1. Free access at the current stage (Early Adopters): As of the date of these Terms, the Operator makes the Platform\'s core services and features available at no cost in order to grow the community. The User acknowledges and agrees that this free access is granted as a temporary courtesy and does not constitute any commitment, promise or vested right to receive the System free of charge in perpetuity.\n\n' +
      '6.2. Right to change the business model and charge fees: The Operator reserves the full and exclusive right, at any time and in its sole discretion, to change the OrcaInvestment business model. This includes, among other things: charging monthly/annual subscription fees for use of the System (in whole or in part); moving existing features behind a paywall; or limiting data volume, trade count and API syncs on the free tier.\n\n' +
      '6.3. Protection of ownership transfer, mergers and exits: The right to change the business model and reset free access is granted in full also to any third party or new legal entity that acquires the Platform, merges with it or assumes its management rights. In the event of a change of ownership, the acquiring entity is not obliged to grant free access to historical users and may demand payment immediately.\n\n' +
      '6.4. Notice of transition to paid access: If a decision is made to charge fees, notice will be published on the Platform or sent to the User\'s registered email address. A User who chooses not to pay the required fee will have their access (in whole or in part) blocked, and the Operator may disconnect their API connections.\n\n' +
      '6.5. Legal framework for future paid services (cancellation policy): To the extent that paid tiers are offered in the future, they will be subject to the Israeli Consumer Protection Law, 5741-1981 and its regulations. Cancellation of an annual/one-off transaction will be possible within 14 days of purchase, less statutory cancellation fees (5% of the transaction or NIS 100, whichever is lower) and less the pro-rata portion already supplied. Cancellation of a recurring monthly subscription will be possible at any time via the user interface, will take effect at the end of the current billing cycle, and will not entitle the User to a pro-rata refund for unused days within that month.',
  },
];

export const PRIVACY_SECTIONS_HE: LegalSection[] = [
  {
    heading: 'כללי',
    body:
      'פלטפורמת OrcaInvestment (להלן: "המערכת" או "המפעיל") מייחסת חשיבות עליונה לשמירה על פרטיות המשתמשים. מדיניות פרטיות זו מפרטת את סוג המידע הנאסף על ידי המערכת בעת השימוש בה, אופן העיבוד שלו, השימוש החיוני הנעשה בו לטובת מחקר סטטיסטי אנונימי, והתנאים לשמירתו.\n\n' +
      'בעצם הרישום למערכת וחיבור חשבונות המסחר שלך, אתה מעניק למפעיל את הסכמתך המפורשת לאיסוף, עיבוד וניהול המידע בהתאם לעקרונות המפורטים להלן.',
  },
  {
    heading: '1. סוגי המידע הנאספים במערכת',
    body:
      'המערכת אוספת ומעבדת שלושה סוגי מידע מרכזיים:\n\n' +
      '1.1. מידע מזהה אישי (Active Identity Data): כתובת דואר אלקטרוני, שם פרטי ומשפחה, ומזהי התחברות דיגיטליים המסופקים על ידי המשתמש מרצונו בעת תהליך ההרשמה או התחברות באמצעות ספקי צד שלישי (כגון Google OAuth).\n\n' +
      '1.2. טלמטרייה דיגיטלית והתנהגותית (Usage Telemetry): כתובות IP, סוג דפדפן, סוג מכשיר קצה, מערכת הפעלה, זמני גלישה, דפים שנצפו, ונתוני הקלקות. מידע זה נאסף באופן אוטומטי באמצעות קבצי עוגיות (Cookies) וכלי אנליטיקה חיצוניים לצורך אבטחה, ניטור ביצועי שרתים ושיפור חוויית המשתמש.\n\n' +
      '1.3. נתוני מסחר וביצועים גולמיים (Trading Data): היסטוריית עסקאות, פוזיציות פתוחות וסגורות, מחזורי מסחר (Volume), מדדי רווח והפסד (PnL), שערי כניסה ויציאה, וזמני ביצוע מדויקים של עסקאות. נתונים אלו נמשכים באופן אוטומטי מחשבונות המסחר החיצוניים של המשתמש באמצעות מפתחות ה-API שהוא מזין למערכת.',
  },
  {
    heading: '2. חיבור מפתחות API – חובת המשתמש ופטור מאחריות',
    body:
      '2.1. חובת הגדרת Read-Only בלבד: חלה על המשתמש החובה הבלעדית והמוחלטת לוודא, טרם הזנת מפתח ה-API למערכת, כי המפתח מוגדר בצד הברוקר/הבורסה תחת הרשאת קריאה בלבד (Read-Only), ללא כל הרשאת משיכת כספים (Withdrawal) וללא הרשאת ביצוע פעולות מסחר אקטיביות (Trading/Execution).\n\n' +
      '2.2. הסרת אחריות מוחלטת מדלף או פריצה: המפעיל אינו בודק ואינו מפקח על רמת ההרשאות של המפתח בצד הברוקר. הזנת מפתח הכולל הרשאות רחבות מהמותר מבוצעת על אחריותו המלאה והבלעדית של המשתמש. המפעיל מסיר מעצמו כל אחריות, ישירה או עקיפה, לכל נזק, פעולת מסחר כפויה או משיכת כספים שתבוצע בחשבון הברוקר של המשתמש, לרבות במקרה של אירוע סייבר, דלף מידע או פריצה לשרתי OrcaInvestment.',
  },
  {
    heading: '3. אנונימיזציה, פסאודונימיזציה ומסחור דאטה',
    body:
      'מבנה המערכת נשען על עיבוד נתונים סטטיסטי רחב. בעצם אישור מסמך זה, המשתמש מעניק למפעיל זכות בלתי חוזרת לפעול בהתאם למנגנון הבא:\n\n' +
      '3.1. הפרדת זהות מוחלטת (Pseudonymization): המערכת מבצעת הפרדה טכנולוגית ומבנית מוחלטת בין פרטיו המזהים של המשתמש (שם ומייל) לבין נתוני המסחר, יומני הטריידים ומדדי המשמעת שלו. נתוני המסחר מקודדים תחת מזהה אנונימי אקראי (UUID) מנותק מזהות אישית.\n\n' +
      '3.2. אגרגציה סטטיסטית קבוצתית: כלל נתוני המסחר האנונימיים של משתמשי המערכת מותכים ומאוחדים יחד ליצירת מאגר נתונים סטטיסטי קבוצתי, המנתח מגמות שוק, מפות חום, סנטימנט קהילתי, ומדדי פסיכולוגיית מסחר רחבים.\n\n' +
      '3.3. זכות מסחור ושיתוף דאטה (Monetization Rights): המפעיל שומר לעצמו את הזכות המלאה, הבלעדית והקבועה לעבד, לנתח, למכור, להעניק רישיון שימוש או לשתף את מאגר הנתונים האגרגטיבי, האנונימי והקבוצתי הזה עם צדדים שלישיים – לרבות גופים מוסדיים, קרנות גידור, ברוקרים או עושי שוק (Market Makers) – וזאת לצרכים מסחריים, מחקריים או עסקיים, מבלי שיהיה עליו לפצות או לתגמל את המשתמשים בשום צורה. המפעיל מתחייב כי הנתונים שישותפו או ימוסחרו לא יאפשרו בשום מקרה זיהוי של סוחר בודד או חשיפה של פרטיו האישיים.',
  },
  {
    heading: '4. אבטחת מידע, אחסון וספקי מידע בינלאומיים',
    body:
      '4.1. סטנדרט אבטחה: המפעיל מפעיל אמצעי אבטחה טכנולוגיים מקובלים, לרבות הצפנת תעבורה (SSL) והצפנת מפתחות ה-API במנוחה (Encryption at Rest) בבסיס הנתונים. עם זאת, המשתמש מצהיר כי ידוע לו שאין פתרון אבטחה הרמטי לחלוטין ברשת האינטרנט והמערכת אינה חסינה לחלוטין מפני חדירות זדוניות.\n\n' +
      '4.2. העברת מידע מחוץ לגבולות המדינה: שרתי המערכת ובסיסי הנתונים שלה מופעלים ומאוחסנים באמצעות ספקי ענן בינלאומיים מובילים (כגון שרתי AWS/Google Cloud) וספקי שירותי תוכנה חיצוניים, אשר עשויים להימצא מחוץ לגבולות מדינת ישראל. המשתמש מסכים באופן מפורש להעברת המידע ואחסונו בחו"ל.',
  },
  {
    heading: '5. זכויות המשתמש, מחיקת חשבון והחרגת דאטה אנונימי',
    body:
      '5.1. הזכות למחיקת זהות: המשתמש זכאי בכל עת לבקש את סגירת חשבונו ומחיקת פרטיו האישיים ממאגרי המערכת. עם קבלת בקשה כזו בכתב, המפעיל ימחק לצמיתות את שם המשתמש, כתובת הדוא"ל וחשבון ה-OAuth שלו, וינתק את חיבורי ה-API שלו.\n\n' +
      '5.2. החרגת נתונים אנונימיים ממחיקה: מובהר ומודגש בזאת כי דרישת המחיקה אינה חלה על יומני המסחר, רשומות הטריידים, הנתונים הסטטיסטיים ומדדי המשמעת אשר כבר עברו הליך אנונימיזציה והוטמעו במאגר הנתונים הסטטיסטי והאגרגטיבי של המערכת. נתונים אלו מנותקים מזהות המשתמש, אינם ניתנים לשליפה לאחור, ויישארו בבעלותו המלאה והקבועה של המפעיל לצרכיו המסחריים גם לאחר סגירת החשבון.',
  },
  {
    heading: '6. דיוור, ניוזלטרים ותוכן שיווקי',
    body:
      '6.1. הסכמה לקבלת דיוור (חוק התקשורת): בעת הרישום למערכת או השארת פרטים במסגרת פעילות קהילת OrcaInvestment, המשתמש מעניק את הסכמתו המפורשת והמודעת לקבלת הודעות, ניוזלטרים מקצועיים, עדכוני שוק, הזמנות לאירועים ותוכן שיווקי מהמפעיל או משותפיו העסקיים, לכתובת הדואר האלקטרוני שמסר, בהתאם לסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ"ב-1982.\n\n' +
      '6.2. זכות הסרה פשוטה (Opt-Out): המשתמש רשאי לחזור בו מהסכמתו זו בכל עת ולהסיר את עצמו מרשימת התפוצה השיווקית באמצעות לחיצה על קישור ההסרה המופיע בתחתית כל מייל שיווקי ("Unsubscribe") או שליחת הודעה לשירות הלקוחות. הסרה זו לא תחול על הודעות מערכת תפעוליות והכרחיות (כגון שינויי תקנון, איפוס סיסמאות או התראות מערכת קריטיות).',
  },
  {
    heading: '7. הדין החל וסמכות שיפוט בלעדית',
    body:
      '7.1. הדין החל: על תנאי שימוש אלו ומדיניות הפרטיות, פרשנותם, אכיפתם וכל עניין הנובע מהם, יחולו אך ורק דיני מדינת ישראל, ללא תחולה לכללי ברירת הדין הבינלאומי.\n\n' +
      '7.2. סמכות שיפוט ייחודית: לבתי המשפט המוסמכים במחוז תל אביב-יפו תהיה סמכות השיפוט הבלעדית, הייחודית והסופית בכל מחלוקת, תביעה או עניין משפטי הקשור או נובע מהשימוש בפלטפורמת OrcaInvestment או ממדיניות פרטיות זו.',
  },
];

export const PRIVACY_SECTIONS_EN: LegalSection[] = [
  {
    heading: 'General',
    body:
      'The OrcaInvestment platform (the "System" or the "Operator") attaches the utmost importance to protecting users\' privacy. This Privacy Policy describes the types of information collected by the System during use, how it is processed, the essential use made of it for anonymous statistical research, and the terms under which it is stored.\n\n' +
      'By registering with the System and connecting your trading accounts, you grant the Operator your express consent to the collection, processing and management of the information in accordance with the principles set out below.\n\n' +
      'Note: The Hebrew version of this Privacy Policy is the legally binding text. This English version is provided for accessibility only; in any inconsistency the Hebrew version prevails.',
  },
  {
    heading: '1. Types of Information Collected',
    body:
      'The System collects and processes three principal types of information:\n\n' +
      '1.1. Active Identity Data: email address, first and last name, and digital login identifiers voluntarily provided by the User during registration or login via third-party providers (such as Google OAuth).\n\n' +
      '1.2. Usage Telemetry: IP addresses, browser type, device type, operating system, browsing times, pages viewed and click data. This information is collected automatically using cookies and external analytics tools for security, server performance monitoring and improvement of the user experience.\n\n' +
      '1.3. Raw Trading & Performance Data: trade history, open and closed positions, traded volume, profit and loss (PnL) metrics, entry and exit prices, and precise execution times. This data is automatically pulled from the User\'s external trading accounts using the API keys they enter into the System.',
  },
  {
    heading: '2. API Key Connection — User Duties & Liability Exclusion',
    body:
      '2.1. Read-Only obligation: It is the User\'s sole and absolute obligation to verify, before entering an API key into the System, that the key is configured on the broker/exchange side with read-only permission, with no withdrawal permission and no active trading/execution permission.\n\n' +
      '2.2. Full liability exclusion for leakage or breach: The Operator does not check or supervise the permission level of the key on the broker side. Entering a key with permissions broader than allowed is performed at the User\'s sole and full responsibility. The Operator excludes any liability, direct or indirect, for any damage, forced trading action or withdrawal of funds carried out in the User\'s broker account, including in the event of a cyber incident, data leak or breach of OrcaInvestment servers.',
  },
  {
    heading: '3. Anonymisation, Pseudonymisation & Data Monetisation',
    body:
      'The System\'s architecture relies on broad statistical data processing. By accepting this document, the User grants the Operator an irrevocable right to act in accordance with the following mechanism:\n\n' +
      '3.1. Strict pseudonymisation: The System maintains a complete technological and structural separation between the User\'s identifying details (name and email) and their trading data, trade journal and discipline metrics. Trading data is encoded under a random anonymous identifier (UUID) detached from personal identity.\n\n' +
      '3.2. Aggregated statistical pool: All anonymous trading data from the System\'s users is fused and aggregated into a collective statistical dataset, which analyses market trends, heatmaps, community sentiment and broad trading-psychology metrics.\n\n' +
      '3.3. Monetisation rights: The Operator reserves the full, exclusive and permanent right to process, analyse, sell, license or share this aggregated, anonymous, collective dataset with third parties — including institutional bodies, hedge funds, brokers or market makers — for commercial, research or business purposes, without owing the users any compensation. The Operator undertakes that any data shared or monetised will not, under any circumstances, enable the identification of a single trader or the exposure of their personal details.',
  },
  {
    heading: '4. Information Security, Storage & International Vendors',
    body:
      '4.1. Security standard: The Operator implements accepted technological security measures, including transport encryption (SSL) and encryption of API keys at rest in the database. However, the User acknowledges that there is no fully hermetic security solution on the internet and that the System is not fully immune to malicious intrusions.\n\n' +
      '4.2. Transfer of information outside the country: The System\'s servers and databases are operated and stored using leading international cloud providers (such as AWS / Google Cloud servers) and external software vendors, which may be located outside the State of Israel. The User expressly consents to the transfer and storage of information abroad.',
  },
  {
    heading: '5. User Rights, Account Deletion & Anonymous Data Carve-Out',
    body:
      '5.1. Right to delete identity: The User is entitled at any time to request the closure of their account and the deletion of their personal details from the System\'s databases. Upon receipt of such a written request, the Operator will permanently delete the User\'s name, email address and OAuth account, and disconnect their API connections.\n\n' +
      '5.2. Carve-out for anonymous data: It is hereby clarified and emphasised that the deletion request does not apply to the trading journals, trade records, statistical data and discipline metrics that have already undergone anonymisation and been embedded in the System\'s aggregated statistical dataset. This data is detached from the User\'s identity, cannot be retrieved retroactively, and will remain the full and permanent property of the Operator for its commercial purposes even after account closure.',
  },
  {
    heading: '6. Marketing Communications & Newsletters',
    body:
      '6.1. Marketing consent (Israeli Communications Law): When registering with the System or providing details as part of the OrcaInvestment community, the User grants their express and informed consent to receive notices, professional newsletters, market updates, event invitations and marketing content from the Operator or its business partners, to the email address they provided, in accordance with section 30A of the Israeli Communications Law (Telecommunications and Broadcasts), 5742-1982.\n\n' +
      '6.2. Easy opt-out: The User may withdraw this consent at any time and remove themselves from the marketing list by clicking the unsubscribe link at the bottom of every marketing email or by contacting customer support. This opt-out does not apply to operational and essential system messages (such as changes to the Terms, password resets or critical system alerts).',
  },
  {
    heading: '7. Governing Law & Exclusive Jurisdiction',
    body:
      '7.1. Governing law: These Terms and this Privacy Policy, their interpretation, enforcement and any matter arising from them, shall be governed exclusively by the laws of the State of Israel, without application of international conflict-of-laws rules.\n\n' +
      '7.2. Exclusive jurisdiction: The competent courts of the Tel Aviv-Yafo district shall have sole, exclusive and final jurisdiction over any dispute, claim or legal matter connected with or arising from the use of the OrcaInvestment platform or this Privacy Policy.',
  },
];

export const LEGAL_FOOTER_HE =
  `גרסה ${LEGAL_VERSION} · עודכן לאחרונה: ${LEGAL_VERSION_DATE}. סימון תיבת האישור ולחיצה על לחצן ההמשך מהווים חתימה אלקטרונית מחייבת.`;

export const LEGAL_FOOTER_EN =
  `Version ${LEGAL_VERSION} · Last updated: ${LEGAL_VERSION_DATE}. Ticking the acceptance checkbox and clicking the continue button constitute a binding electronic signature.`;

export const LEGAL_ACCEPT_LABEL_HE =
  'אני מאשר/ת ומצהיר/ה שקראתי את תנאי השימוש של OrcaInvestment, הבנתי אותם ומסכים/ה להם באופן מלא — לרבות סעיף העדר הייעוץ הפיננסי, איסור התחרות, והעברת זכויות עתידית במקרה של אקזיט.';

export const LEGAL_ACCEPT_LABEL_EN =
  'I confirm and declare that I have read the OrcaInvestment Terms of Service, understand them and fully agree to them — including the no-financial-advice clause, the anti-compete clause, and the future transfer of rights in the event of an exit.';

export const PRIVACY_ACCEPT_LABEL_HE =
  'אני מאשר/ת ומצהיר/ה שקראתי את מדיניות הפרטיות של OrcaInvestment, הבנתי את אופן איסוף הנתונים, הפסאודונימיזציה, השיתוף/מסחור האגרגטיבי והעברת בסיס הנתונים במקרה של אקזיט, ומסכים/ה לכך באופן מלא.';

export const PRIVACY_ACCEPT_LABEL_EN =
  'I confirm and declare that I have read the OrcaInvestment Privacy Policy, understand how data is collected, pseudonymised, aggregated/monetised and how the database may be transferred in the event of an exit, and I fully agree to it.';
