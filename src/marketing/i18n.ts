/**
 * All landing copy. Hebrew is the source of truth from the Build Spec.
 * English mirrors. No invented copy — only what the spec defines.
 */
import type { MktLang } from './UIContext';

export const STRINGS = {
  he: {
    nav: {
      features: 'פיצ׳רים',
      platforms: 'פלטפורמות',
      pricing: 'מחירים',
      faq: 'שאלות נפוצות',
      login: 'כניסה',
      cta: 'התחילו ניסיון חינם',
    },
    hero: {
      line1: 'שליטה מלאה',
      line2: 'על המסחר שלך',
      line3: 'מבוססת נתונים — לא תחושות',
      sub: 'ORCA הופך כל עסקה לנתון, כל נתון לתובנה, וכל תובנה להחלטה טובה יותר. יומן, ניהול סיכונים, פסיכולוגיה וניתוח כמותי — במקום אחד.',
      ctaPrimary: 'התחילו ניסיון חינם',
      ctaSecondary: 'צפו בדמו החי',
      // Technical proof cards (per user override — no social proof).
      proof1Title: '4 שכבות הגנה',
      proof1Desc: 'מנוע סיכונים −1R עד −10R',
      proof2Title: 'ORCA Score 0–100',
      proof2Desc: 'ציון אחד לכל הביצועים שלך',
      proof3Title: 'Monte Carlo · Sortino · Calmar',
      proof3Desc: 'ניתוח כמותי ברמה מוסדית',
      freeBanner: 'ההתחברות לממשק חינמית בתקופה הקרובה',
    },
    modules: {
      title: 'המודולים שמרכיבים את ORCA',
      sub: 'כל מסך נבנה לשאלה אחת: מה עליי לעשות אחרת בעסקה הבאה.',
      tabs: [
        { key: 'dash',  label: 'דף ראשי',          desc: 'מבט-על על כל הביצועים: רווח/הפסד, אחוז הצלחה, ו-ORCA Score — במסך אחד.' },
        { key: 'cal',   label: 'קלנדר P&L',        desc: 'כל יום מסחר כתא צבעוני. לחיצה פותחת את כל העסקאות של אותו יום.' },
        { key: 'risk',  label: 'ניהול סיכונים',     desc: 'מנוע 4 שכבות (−1R/−2R/−5R/−10R) שעוצר אותך לפני שאתה הורס חשבון.' },
        { key: 'psy',   label: 'מעבדת פסיכולוגיה',   desc: 'זיהוי Tilt, Revenge ו-Overtrading + מד Fear & Greed אישי.' },
        { key: 'quant', label: 'QuantLab',         desc: 'Monte Carlo, Sortino, Calmar — ניתוח כמותי ברמה מוסדית.' },
        { key: 'ai',    label: 'Oracle / AI',      desc: 'סיכום שבועי חכם שמזהה את הדפוסים שאתה לא רואה.' },
        { key: 'bt',    label: 'בקטסטינג',          desc: 'בדוק אסטרטגיה על היסטוריה לפני שאתה מסכן הון אמיתי.' },
      ],
    },
    demo: {
      title: 'הדמו החי',
      sub: 'הפלטפורמה האמיתית במצב נתוני דוגמה. כל פעולת כתיבה מושבתת.',
      comingSoon: 'מתחבר בקרוב',
      comingSoonDesc: 'הדמו החי יחובר למערכת הפעילה. בינתיים — צרו חשבון חינם וגלו בעצמכם.',
      openCta: 'צרו חשבון וגלו במסך מלא ↗',
      dataLabel: 'נתוני דוגמה',
    },
    brokers: {
      title: 'עובד עם הפלטפורמות שאתם כבר משתמשים בהן',
    },
    features: {
      title: 'מה שמייחד את ORCA',
      items: [
        { title: 'ORCA Score',                 desc: 'ציון 0–100 שמתרגם את כל הביצועים שלך למספר אחד שאפשר לעקוב אחריו.' },
        { title: 'מנוע סיכונים אמיתי',          desc: 'לא רק מציג סיכון — עוצר אותך. 4 שכבות הגנה אוטומטיות.' },
        { title: 'מראה פסיכולוגית',            desc: 'המערכת מצליבה מה שאמרת שתעשה מול מה שעשית בפועל.' },
        { title: 'ניתוח כמותי',                desc: 'Monte Carlo ו-Sortino — כלים שהיו שמורים לקרנות, אצלך בכיס.' },
        { title: 'הכול בענן',                  desc: 'מחשב, טאבלט, נייד — היומן שלך תמיד מסונכרן.' },
        { title: 'עברית מלאה, RTL אמיתי',       desc: 'נבנה מהיסוד לסוחר הישראלי. לא תרגום.' },
      ],
    },
    pricing: {
      title: 'מסלולים',
      sub: 'בחרו את הרמה שמתאימה לכם. שדרוג בכל עת.',
      toggleMonthly: 'חודשי',
      toggleYearly: 'שנתי',
      yearlyDiscount: '«X»% הנחה',
      currency: { ils: '₪', usd: '$' },
      plans: [
        { id: 'standard', name: 'Standard', desc: 'להתחלה — יומן, קלנדר, גרפים בסיסיים',                                       badge: '7 ימי ניסיון, בלי כרטיס' },
        { id: 'advanced', name: 'Advanced', desc: 'לסוחר הפעיל — ניהול סיכונים + Economic Radar + Deep Insights',              badge: 'הכי פופולרי' },
        { id: 'ultimate', name: 'Ultimate', desc: 'לרמה המוסדית — QuantLab + Oracle + Weekly Review + Backtest',                badge: '' },
      ],
      cta: 'התחילו עכשיו',
      disclaimer: 'ORCA הוא כלי ניתוח וניהול. לא מערכת איתותים ולא ייעוץ השקעות.',
    },
    faq: {
      title: 'שאלות נפוצות',
      items: [
        { q: 'איך הנתונים נכנסים למערכת?',                       a: 'ייבוא אוטומטי מהברוקר או העלאת CSV. בלי אקסלים ידניים.' },
        { q: 'זה מתאים לסוחר מתחיל?',                            a: 'כן. מתחילים מ-Standard ומתקדמים כשצריך.' },
        { q: 'ORCA נותן איתותים או אומר לי מה לקנות?',           a: 'לא. ORCA מנתח את מה שאתה עושה כדי שתשתפר. אין כאן ייעוץ או איתותים.' },
        { q: 'הנתונים שלי בטוחים?',                              a: 'הנתונים שלך שלך בלבד, מאוחסנים מאובטח, ללא שיתוף עם צד שלישי.' },
        { q: 'יש אפליקציה?',                                     a: 'המערכת רספונסיבית מלאה וניתנת להתקנה מהדפדפן כ-PWA.' },
      ],
    },
    footer: {
      colQuick: 'קישורים מהירים',
      colLegal: 'קישורים שימושיים',
      colContact: 'צור קשר',
      terms: 'תנאי שימוש',
      privacy: 'מדיניות פרטיות',
      risk: 'גילוי סיכונים',
      riskDisclosure:
        'מסחר בשווקים פיננסיים כרוך בסיכון מהותי להפסד הון. ביצועי עבר אינם מבטיחים תוצאות עתידיות. ORCA הוא כלי ניתוח וניהול בלבד — אינו מהווה ייעוץ השקעות, שיווק השקעות, או המלצה לרכישה/מכירה של נכס פיננסי כלשהו. השימוש במערכת הוא באחריות המשתמש בלבד.',
      rights: '© 2026 ORCA Investment — כל הזכויות שמורות',
    },
    ph: { // placeholders surfaced inline so they remain visible in dev
      brokers: '«BROKERS_LIST»',
      price: '«PRICE»',
      whatsapp: '«WHATSAPP»',
      email: '«SUPPORT_EMAIL»',
      domain: '«DOMAIN»',
      stripeId: '«STRIPE_PRICE_ID»',
    },
  },
  en: {
    nav: { features: 'Features', platforms: 'Platforms', pricing: 'Pricing', faq: 'FAQ', login: 'Log in', cta: 'Start free trial' },
    hero: {
      line1: 'Total control',
      line2: 'over your trading',
      line3: 'Data-driven — not feelings',
      sub: 'ORCA turns every trade into data, every data point into insight, and every insight into a better decision. Journal, risk, psychology and quant analytics — in one place.',
      ctaPrimary: 'Start free trial',
      ctaSecondary: 'See live demo',
      proof1Title: '4 protection layers',
      proof1Desc: 'Risk engine −1R to −10R',
      proof2Title: 'ORCA Score 0–100',
      proof2Desc: 'One number for all your performance',
      proof3Title: 'Monte Carlo · Sortino · Calmar',
      proof3Desc: 'Institutional-grade quant analytics',
      freeBanner: 'Free access during early launch',
    },
    modules: {
      title: 'The modules behind ORCA',
      sub: 'Every screen answers one question: what should I do differently on the next trade.',
      tabs: [
        { key: 'dash',  label: 'Dashboard',     desc: 'A bird\u2019s-eye view of all performance: P&L, win rate and ORCA Score — one screen.' },
        { key: 'cal',   label: 'P&L Calendar',  desc: 'Every trading day as a colored cell. Click to open all trades from that day.' },
        { key: 'risk',  label: 'Risk Engine',   desc: 'A 4-layer engine (−1R/−2R/−5R/−10R) that stops you before you blow an account.' },
        { key: 'psy',   label: 'Psychology Lab',desc: 'Detect Tilt, Revenge and Overtrading + personal Fear & Greed gauge.' },
        { key: 'quant', label: 'QuantLab',      desc: 'Monte Carlo, Sortino, Calmar — institutional-grade quant analytics.' },
        { key: 'ai',    label: 'Oracle / AI',   desc: 'A smart weekly debrief that surfaces patterns you don\u2019t see.' },
        { key: 'bt',    label: 'Backtesting',   desc: 'Test a strategy on history before risking real capital.' },
      ],
    },
    demo: {
      title: 'Live demo',
      sub: 'The real platform in sample-data mode. All writes are disabled.',
      comingSoon: 'Coming online',
      comingSoonDesc: 'The live demo will be wired to the running app. In the meantime — create a free account and explore it yourself.',
      openCta: 'Create an account and open full screen ↗',
      dataLabel: 'Sample data',
    },
    brokers: { title: 'Works with the platforms you already use' },
    features: {
      title: 'What sets ORCA apart',
      items: [
        { title: 'ORCA Score',          desc: 'A 0–100 score that translates all your performance into one number you can track.' },
        { title: 'Real risk engine',    desc: 'Doesn\u2019t just show risk — stops you. 4 automatic protection layers.' },
        { title: 'Psychological mirror',desc: 'The system cross-checks what you said you\u2019d do against what you actually did.' },
        { title: 'Quant analytics',     desc: 'Monte Carlo and Sortino — tools once reserved for funds, now in your pocket.' },
        { title: 'Everything in cloud', desc: 'Desktop, tablet, mobile — your journal is always in sync.' },
        { title: 'Full Hebrew, true RTL', desc: 'Built from the ground up for Israeli traders. Not a translation.' },
      ],
    },
    pricing: {
      title: 'Plans',
      sub: 'Pick the tier that fits you. Upgrade anytime.',
      toggleMonthly: 'Monthly',
      toggleYearly: 'Yearly',
      yearlyDiscount: '«X»% off',
      currency: { ils: '₪', usd: '$' },
      plans: [
        { id: 'standard', name: 'Standard', desc: 'To get started — journal, calendar, basic charts',                                badge: '7-day trial, no card' },
        { id: 'advanced', name: 'Advanced', desc: 'For active traders — risk engine + Economic Radar + Deep Insights',               badge: 'Most popular' },
        { id: 'ultimate', name: 'Ultimate', desc: 'Institutional grade — QuantLab + Oracle + Weekly Review + Backtest',              badge: '' },
      ],
      cta: 'Start now',
      disclaimer: 'ORCA is an analysis and management tool. Not a signal service and not investment advice.',
    },
    faq: {
      title: 'FAQ',
      items: [
        { q: 'How does data get into the system?',        a: 'Automatic broker import or CSV upload. No manual spreadsheets.' },
        { q: 'Is it suitable for beginners?',             a: 'Yes. Start on Standard and upgrade when you need more.' },
        { q: 'Does ORCA give signals or tell me what to buy?', a: 'No. ORCA analyzes what you do so you improve. No advice, no signals.' },
        { q: 'Is my data safe?',                          a: 'Your data is yours alone, stored securely, never shared with third parties.' },
        { q: 'Is there an app?',                          a: 'The system is fully responsive and installable from the browser as a PWA.' },
      ],
    },
    footer: {
      colQuick: 'Quick links',
      colLegal: 'Useful links',
      colContact: 'Contact',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      risk: 'Risk Disclosure',
      riskDisclosure:
        'Trading financial markets involves substantial risk of loss. Past performance does not guarantee future results. ORCA is an analysis and management tool only — it does not constitute investment advice, investment marketing, or a recommendation to buy/sell any financial asset. Use of the system is at the sole responsibility of the user.',
      rights: '© 2026 ORCA Investment — All rights reserved',
    },
    ph: {
      brokers: '«BROKERS_LIST»',
      price: '«PRICE»',
      whatsapp: '«WHATSAPP»',
      email: '«SUPPORT_EMAIL»',
      domain: '«DOMAIN»',
      stripeId: '«STRIPE_PRICE_ID»',
    },
  },
} as const;

export function useStrings(lang: MktLang) {
  return STRINGS[lang];
}
