
# תוכנית עבודה — 11 משימות

## 🚨 שלב 1 — תיקוני אבטחה ויציבות (קריטי, ראשון)

### 1. Bug קריטי: איפוס נתונים מוחק לכל המשתמשים
- **חקירה**: ב-`src/lib/storage.ts` המחיקה מוגנת ע"י `user_id` + RLS ולכן בענן זה כן per-user. החשד שלי הוא שה-Reset מוחק גם `localStorage` משותף לדפדפן (למשל ה-iframes של ה-Journal/Backtest שמאחסנים ב-`localStorage` גלובלי ולא מבדילים בין משתמשים על אותו דפדפן).
- **תיקון**: 
  - לסרוק כל קריאה ל-`localStorage.clear()` / מפתחות `orca_*` / `weekly-review` ולוודא שהן נמסטרות עם `userId` כתחילית.
  - ב-Journal/Backtest iframes — כל מפתח localStorage יקבל prefix של `auth.uid()` כך שכל משתמש רואה רק את שלו.
  - `clearAllData()` תמחק רק את המפתחות של המשתמש הנוכחי.
- **בדיקת אישור**: הוספת לוג מובהק שמראה איזה user_id מוחק מה.

### 2. אנימציית מעבר בין Orca ↔ Journal ↔ Backtest (אסור מסך לבן)
- כיום המעבר ל-iframe (`public/weekly-review/index.html`, `BacktestDimension`) חושף מסך לבן בזמן טעינה.
- הוספת **overlay של LiquidSweep** מעל ה-iframe עד שמתקבל `iframe.onload` + handshake postMessage `{ type: 'orca:ready' }`.
- חזרה ל-Orca: כשה-iframe שולח `{ type: 'orca:exit' }` נציג overlay מלא לפני unmount.

## 📱 שלב 2 — רספונסיביות נייד (סריקה מלאה)

### 3. SettingsHub רספונסיבי
- נכון לעכשיו זה desktop-first עם grids רחבים. נשכתב ל:
  - mobile: עמודה אחת, tabs בתחתית בסטיקי, sliders באורך מלא, modals במקום dialogs.
  - safe-area-inset-bottom + 100dvh.

### 4. WeeklyReviewPage רספונסיבי
- ה-iframe יקבל `width: 100%; height: 100dvh` וגם ה-HTML הפנימי (`public/weekly-review/index.html`) יקבל media queries לנייד (כפתורים גדולים, פונט קריא, גלילה אופקית בטבלאות).

### 5. FeatureManifestModal (אודות המערכת) רספונסיבי
- max-h-[90dvh], scroll פנימי, כותרות בגודל responsive.

### 6. סריקה כללית של כל הדפים
- Trade form, Calendar Hub, Analytics, AI Insights, Risk page, Psychology Lab — כל דף יקבל בדיקת breakpoint ב-375/414/768.
- שימוש ב-`useIsMobile()` לפצל layouts כשצריך.

## 👤 שלב 3 — פרופיל משתמש

### 7. תמונת פרופיל
- יצירת bucket `avatars` (public read, owner-only write) במיגרציה.
- ב-SettingsHub: כפתור העלאה (קרופ ל-256x256, webp, max 500KB).
- שמירה ב-`profiles.avatar_url`.
- הצגה בנאב-בר ליד סכום התיק עם fallback של אות ראשונה.

## 🎨 שלב 4 — Theme Studio ברמה עולמית

### 8. צבעים פר-משתמש (כבר מאוחסן ב-`user_settings` שזה per-user) — לוודא שאין שום cache גלובלי.

### 9. כפתור "החל מיד" באולפן
- אחרי שמירת צבע — ירוץ `applyDerivedPalette()` + dispatch `orca:theme-changed` שיגרום ל-Index.tsx לבצע re-render של הvar bindings ללא reload.

### 10. בניית ערכת theme שלמה (לא רק accent)
- במקום צבע אחד, המשתמש יבחר:
  - **Base mood**: dark/light/auto
  - **Background hue** (שולט ב-`--bg-deep`)
  - **Surface elevation** (שולט ב-`--bg-card`)
  - **Accent primary**
  - **Accent secondary** (אופציונלי)
  - **Border intensity** (slider)
  - **Glow intensity** (slider)
- preview חי בתוך מודל עם דוגמת כרטיס + כפתור + טבלה.
- שמירה כ-`customTheme` object שלם, נטען אוטומטית עם applyCustomTheme().
- נעילת 24h נשמרת אבל עם אפשרות "ביטול נעילה" אחרי הסכמה כפולה (במקרה של טעות).

## 🌐 שלב 5 — תרגום מלא לאנגלית

### 11. סריקה מלאה של i18n
- מעבר על `src/lib/trading-i18n.ts` והוספת כל המחרוזות החסרות.
- סריקת כל קומפוננטה ב-`src/components/trading/` ל-strings קשיחים בעברית — והעברתם לקובץ ה-i18n.
- קומפוננטות חשודות: `WeeklyReviewPage`, `AIInsightsPage`, `AnalyticsQuantLab`, `PsychologyLab`, `BacktestDimension`, ה-iframes.
- ה-iframes (`public/weekly-review/index.html`) יקבלו postMessage עם השפה הנוכחית ויחליפו טקסטים.

---

## סדר ביצוע מומלץ
1. ✅ תיקון bug האיפוס (קריטי)
2. ✅ אנימציות מעבר (UX מעצבן עכשיו)
3. ✅ רספונסיביות Settings + WeeklyReview + About
4. ✅ סריקת רספונסיביות לכל הדפים
5. ✅ תמונת פרופיל
6. ✅ Theme Studio מתקדם + כפתור "החל"
7. ✅ סריקת i18n מלאה

## הערות טכניות
- מיגרציה דרושה ל-bucket avatars + storage policies.
- אין שינויי schema אחרים.
- כל הצבעים יישארו כ-HSL בעיצוב tokens.
- אסטרטגיית ה-localStorage prefix: `orca:${uid}:${key}` — נבנה עוטף קטן ב-`src/lib/local-scoped.ts`.

זה עומס גדול — סביר להניח שאצטרך להריץ את זה בכמה פעימות. אאשר איתך אחרי שלב 1+2, ואז אמשיך הלאה.
