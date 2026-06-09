# ORCA Landing v2 — תוכנית ביצוע (גרסה 2)

מטרה: להחליף את `src/pages/Landing.tsx` הקיים (1046 שורות, single-file) במבנה מודולרי לפי ה-Build Spec, תוך כיבוד §0.0 (אל תמציא) והעדכונים שלך: **אפס הוכחה חברתית, אפס Testimonials, אפס פונטים חדשים, דמו אמיתי מוקדם, אפס fallback שקט**.

תשתית האפליקציה נשמרת. שינויים מבודדים ל-`/welcome` בלבד.

---

## כללי-עולם לתוכנית הזו

1. **אפס פונטים חדשים.** הדף משתמש ב-Poppins (כותרות) + IBM Plex Mono (מספרים) + מה שכבר רץ בפרויקט לגוף. לא טוענים Heebo, לא Assistant, לא JetBrains Mono — לא globally ולא scoped. הסקשן "פונטים" במסמך המקור מבוטל.
2. **דמו אמיתי או עצירה.** אם הטמעת `TradingUI` עם `demoMode={true}` נתקלת בבעיה — **עוצרים ומדווחים**. אסור ליפול ל-`LandingDemo` הישן או לכל חיקוי בלי אישור מפורש ממך.
3. **אפס הוכחה חברתית.** אין testimonials, אין "X+ סוחרים", אין מספרי שימוש.

---

## עיקרי השינוי

- מבנה תיקיות חדש: `src/marketing/sections/*` + `src/marketing/LandingPage.tsx` + `src/marketing/i18n.ts` + `src/marketing/UIContext.tsx`.
- `src/pages/Landing.tsx` יהפוך ל-shell דק שמרנדר את `<LandingPage/>` (הקובץ הישן נמחק; היסטוריה ב-git).
- טיפוגרפיה: `.marketing-root` יורש את הפונטים הגלובליים של האפליקציה. אם דרושה שליטה ספציפית — דרך `--font-display: var(--font-poppins)` ו-`--font-mono: var(--font-ibm-plex)` שכבר מוגדרים ב-`index.css`.
- 3 ערכות נושא (Midnight / Indigo / Platinum) כ-CSS variables על `.marketing-root.theme-*` — לא נוגעות ב-tokens הגלובליים.
- `UIContext` מקומי לדף: lang (HE/EN) + theme. ברירת מחדל HE/RTL.

---

## סדר ביצוע (דמו מוקדם)

```text
1. תשתית: marketing/ tree, UIContext, i18n.ts, .marketing-root + 3 ערכות נושא
   (ללא פונטים חדשים)

2. ★ LiveDemo POC (Option B) — לפני כל סקשן ויזואלי
   • DemoModeContext: seed data + no-op writes + טוסט
   • הטמעת TradingUI אמיתי בתוך container עם chrome
   • אם נכשל → עוצרים, מדווחים, מחכים להחלטה. אין fallback.

3. Skeleton: Nav + Hero + Footer דק (דף עולה end-to-end)

4. Modules (Tabs) + Features (6) + Pricing + FAQ

5. ליטוש: reveal-on-scroll, prefers-reduced-motion, logical
   properties (ms/me), SEO meta+OG, mobile QA, Lighthouse

6. החלפה סופית: Landing.tsx → shell דק שמייבא LandingPage
```

כל שלב נבדק על `/welcome` לפני המעבר הבא.

---

## פירוט הסקשנים (קופי מילה-במילה מ-§המסמך)

- **Nav דביק** — לוגו ימין; ניווט+טוגלים+CTA שמאל; backdrop-blur; drawer במובייל.
- **Hero** — כותרת 3-שורות בסטאגר, תת-כותרת, 2 CTA, ו-**3 כרטיסי הוכחה טכניים**:
  - "4 שכבות הגנה — מנוע סיכונים −1R עד −10R"
  - "ORCA Score 0–100 — ציון אחד לכל הביצועים שלך"
  - "Monte Carlo · Sortino · Calmar — ניתוח כמותי ברמה מוסדית"
  - ללא count-up של "X+ סוחרים".
- **LiveDemo (Option B)** — TradingUI אמיתי, demoMode, תווית "נתוני דוגמה", כפתור "מסך מלא ↗".
- **טיזר מודולים** — Tabs של shadcn, 7 טאבים בדיוק: דף ראשי · קלנדר P&L · ניהול סיכונים · מעבדת פסיכולוגיה · QuantLab · Oracle/AI · בקטסטינג. מובייל → אקורדיון.
- **רצועת פלטפורמות** — `«BROKERS_LIST»` placeholder. אם ריק → הסקשן מוסתר.
- **רשת יתרונות (6)** — הקופי המדויק מ-§7.
- **תמחור** — 3 מסלולים, טוגל חודשי/שנתי, טוגל ₪/$, מחירים כ-placeholders גלויים, דיסקליימר "לא איתותים/לא ייעוץ".
- **(מבוטל)** — אין סקשן Testimonials.
- **FAQ + Footer** — אקורדיון shadcn, Risk Disclosure מלא, פרטי קשר כ-placeholders.

---

## פרטים טכניים

- **Routing**: `/welcome` נשאר. `RequireAuth` ב-`/` ממשיך לעבוד. `/demo` ציבורי **לא** נוסף — Option B מרנדר את הדמו inline.
- **Backend (פאזה 11 של המסמך)**: מחוץ לטווח התוכנית הזו. Stripe/iCount/edge functions בפאזה נפרדת. Auth כבר קיים; CTAs יחווטו ל-`/auth?mode=register` ו-`/auth?mode=login`.
- **Cookie banner, ErrorBoundary, LegalGate** — לא נוגעים, ממשיכים לעטוף את הדף דרך `App.tsx`.
- **גלילה במובייל** — תיקוני `overflow-x: clip; max-width: 100vw` שהוספנו יישמרו.
- **באנר "התחברות חינמית בתקופה הקרובה"** שהוספנו לפני שני סבבים — יועבר ל-Hero החדש.

---

## Placeholders שיישארו גלויים (לפי §0.0)

`«BROKERS_LIST»` (סקשן יוסתר אם ריק) · `«PRICE_STANDARD/ADVANCED/ULTIMATE»` · `«STRIPE_PRICE_ID_*»` · `«WHATSAPP»` · `«SUPPORT_EMAIL»` · `«DOMAIN»`.

כל אחד ייכתב במפורש בקוד עם `data-placeholder="true"` והדגשה ויזואלית בפיתוח (outline צהוב + tooltip), כך שלא יישכח לפני השקה.

---

## DoD סופי

- /welcome עולה ב-RTL, 3 ערכות נושא עובדות, HE↔EN מתחלף, כל הסקשנים בסדר הנכון.
- **LiveDemo מציג את TradingUI האמיתי** עם תווית "נתוני דוגמה" וטוסט "פעולה מושבתת בדמו" על כל כתיבה. **אם נכשל — עוצרים, לא חיקוי.**
- אפס פונטים חדשים נטענ