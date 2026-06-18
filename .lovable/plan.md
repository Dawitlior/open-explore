# 📱 ORCA Mobile Master Plan — גרסה מאושרת לביצוע

**מטרה:** PWA שמרגישה native על מכשיר אמיתי, בלי לגעת בדסקטופ.
**שיטה:** גל־גל. כל גל עובר קריטריון קבלה לפני שעוברים הלאה.
**כללי ברזל:** כל שינוי מאחורי `@media (max-width:768px)` או `useIsMobile()`. אסור לפבריק safe-area/גבהים — לקרוא מ־env/viewport. string-replace כירורגי, לא rewrite.

---

## גל 0 — תשתית גלובלית (`index.html`, `index.css`)

**0.1** השארת `interactive-widget=resizes-content` ב־viewport meta (החלטה: לתקן ב־4.1 במקום).
**0.2** הוספת `<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">` — מונע המרת מספרי PnL לקישורי טלפון ב־iOS.
**0.3** כלל גלובלי ב־`index.css`:
```css
@media (max-width:768px){
  input,textarea,select{ font-size:16px !important; }
}
```
מבטל iOS auto-zoom-on-focus בבת אחת — מנקה 300+ inline styles ב־Journal/Settings/WeeklyReview.

**0.4** טוקני safe-area ב־`:root`:
```css
--safe-top: env(safe-area-inset-top,0px);
--safe-bottom: env(safe-area-inset-bottom,0px);
--nav-h: 60px;
--nav-total: calc(var(--nav-h) + var(--safe-bottom));
```
**0.5** ⏭️ **מדלגים** (החלטה: לשמור על shell-scroll הקיים — DimensionController + MainPullToRefresh מסתמכים עליו).
**0.6** סוויפ `100vw` → `100%` ב־`JournalDimension.tsx:3841,3972` וב־`DimensionController` (מסיר ~17px דחיפה ימינה).
**0.7** היררכיית z-index רשמית (מחליפה 14 ערכים מפוזרים 9000–99997):
```css
--z-dropdown:100; --z-sticky:200; --z-bottom-nav:300;
--z-overlay:1000; --z-modal:1100; --z-toast:1200; --z-critical-alert:1300;
```
**0.8** במובייל: `backdrop-filter: blur(8px)` בלי `saturate` (מבטל drop ל־30fps ב־iPhone 12+).
**0.9** מצמצמים `transition: background-color 480ms` הגלובלי ל־selector ייעודי `[data-theme-transition]`.
**0.10** ניקוי פונטים ב־`index.html`: מסירים Syne, Playfair, Space Grotesk, DM Sans. **שומרים:** Poppins, IBM Plex Mono, IBM Plex Sans, Heebo (עברית — קריטי).
**0.11** `html{ scroll-padding-bottom:120px }` במובייל.
**0.12** (תוספת) `* { -webkit-tap-highlight-color: transparent; }` + `button,a{ -webkit-touch-callout:none }` — מסיר ריבוע אפור ו־context-menu לא־רצוי ב־iOS.

**✅ קבלה:** iPhone אמיתי — אין סקרולבר אופקי; הקלקה על שדה לא מזמזמת; טאפ על status-bar קופץ לראש; אין קפיצה ב־768px.

---

## גל 1 — Recharts × RTL (התלונה המרכזית של המשתמש)

קבצים: `AdvancedAnalyticsPage` שורות 456,501,680,704,734 + שאר דפי Advanced.

**1.1** עטיפת כל `<ResponsiveContainer>` ב־`<div dir="ltr" style={{width:'100%'}}>` — recharts לא תומך RTL טבעית, ה־SVG מיושר לפי dir של ההורה.
**1.2** במובייל: `border-inline-start:3px` → `border-top:3px` על `[data-accent-border]` (מסיר 3px אסימטריה שדוחפת ימינה ב־RTL).
**1.3** מחליפים `padding:'14px 16px'` קשיח ב־`padding-inline: clamp(10px,3vw,16px)`.

**✅ קבלה:** גרפים ב־Analytics ממורכזים, ציר X לא נחתך, דסקטופ זהה.

---

## גל 2 — דפי Advanced (Analytics / Risk / Psychology / AI)

**2.1** Search & replace ל־`minWidth` שגדולים מ־320px:
- `minWidth:280` → `minWidth:'min(100%,280px)'`
- `minWidth:320` (ImportPreflightModal:313) → `min(100%,320px)`
- `minWidth:240/220/160` → אותו דפוס
- מוקדים: `AdvancedPsychologyPage:455,469`, `AdvancedRiskPage:424`, `HourOfDayStrip:133`, `ImportPreflightModal:282,313`.

**2.2** הוספת `useIsMobile()` לכל ארבעת הדפים + `gridTemplateColumns:'1fr'` במובייל.

**2.3** טבלות אופקיות — utility class:
```css
.scroll-x{ overflow-x:auto; -webkit-overflow-scrolling:touch; scroll-snap-type:x proximity; }
.scroll-x-wrap{ position:relative; }
.scroll-x-wrap::after{
  content:''; position:absolute; top:0; inset-inline-end:0;
  width:24px; height:100%; pointer-events:none;
  background:linear-gradient(to left, var(--background), transparent);
}
```
החלה: Analytics 583/824, Risk 550, TimeSeriesPerfMatrix (להסיר `minWidth:360` קשיח), CorrelationMatrix (להסיר `direction:ltr` הקשיח — לעטוף רק את ה־SVG כמו 1.1), Journal ×3.

**2.4** עטיפת Analytics/Risk/Psychology/AI ב־`MainPullToRefresh` (כרגע רק Dashboard).

**✅ קבלה:** ב־320px וב־390px אפס גלילה אופקית בגוף; טבלאות עם fade indicator ומומנטום; pull-to-refresh עובד בכל ארבעת הדפים.

---

## גל 3 — JournalDimension (4,773 שורות, הכי שבור)

**3.1** הוספת `useIsMobile()`; החלפת `repeat(3,1fr)` ו־`minWidth:160` (שורות 3054,3064) ב־`1fr` במובייל.
**3.2** גלריית תמונות: `width:140;height:100` קשיח (שורה 868) → `width: min(140px,40vw)` + `aspect-ratio:3/2`.
**3.3** מעטפת הדף: `padding-bottom: var(--nav-total)` במובייל.
**3.4** כפתורים ≥44×44: חיצי חודש (2521-2523), טוגלים (3054,3064), "X" של מודאלים (4314). הסרת width/height inline שדורסים את כלל ה־44px ב־`index.css:637`.
**3.5** ודא שאין override inline על fontSize ב־Journal (777,783) — אחרי שגל 0.3 פעיל.
**3.6** הוספת "Trader Journey / חזרה" כקיצור ב־MobileBottomNav More-sheet.

**✅ קבלה:** Journal עמודה אחת, אפס גלילה אופקית, כל כפתור באגודל, אין zoom, תוכן תחתון לא מוסתר.

---

## גל 4 — ניווט ומודלים (חוויית native)

**4.1** `MobileBottomNav.tsx`: כש־`kbOffset>0` (מקלדת פתוחה) → `transform:translateY(100%); pointer-events:none` (לא `display:none` שיגרום layout shift ויקטוע fade).
**4.2** ביטול sidebar במובייל — להשאיר רק MobileBottomNav + More-sheet (היום שניהם חופפים).
**4.3** מודאלים מרכזיים → bottom-sheet במובייל (Settings, CommandPalette, FeatureManifestModal, ChartExplanationModal). TradeForm כבר עושה את זה — להעתיק דפוס.
**4.4** `.modal-body{ overscroll-behavior:contain; touch-action:pan-y; }` — מונע גרירת רקע.
**4.5** מצמצמים את `[role="dialog"]{ touch-action:pan-y }` ב־`index.css:779` — selector ספציפי בלבד, כדי לא לחסום drag אופקי בגלריות/carousel/TraderMind.

**✅ קבלה:** מקלדת לא מסתירה כפתורי שמירה; ניווט יחיד; מודאלים מלמטה; גרירה אופקית בגלריות עובדת.

---

## גל 5 — PWA & פוליש סופי

**5.1** Landing & Auth — `paddingTop:'var(--safe-top)'` על ה־header (לוגו מתחת ל־Dynamic Island).
**5.2** `manifest.json` — להוסיף splash icons מותאמים. ServiceWorker כבר קיים (`public/sw.js`) ומקושר ב־`main.tsx` עם guard מול Lovable preview — לאמת cache strategy, לא להוסיף חדש.
**5.3** haptics על swipe בלוח השנה ובטבלאות + מעבר טאבים.
**5.4** `prefers-color-scheme` listener — תגובה להחלפת dark/light מערכתי.
**5.5** ניקיון:
- `#orca-cursor-halo{ display:none }` במובייל.
- `will-change:transform` על MobileBottomNav.
- חיווט `onLongPressCenter` של כפתור + ב־`Index.tsx` (כרגע רדום).
- בדיקת `window.navigator.standalone` — סטיילים שונים ב־PWA מותקן.

**✅ קבלה:** מותקן כ־PWA — לוגו מתחת ל־notch; פתיחה מהירה; haptics על gestures; תגובה ל־theme מערכתי.

---

## 🧪 הארנס בדיקות אוטומטי

יצירת `tests/mobile-audit.spec.ts` (Playwright) שרץ אחרי כל גל. סורק 10 routes ב־320px ו־390px ומאמת 3 כללי ברזל:
1. אפס גלילה אופקית (`scrollWidth - clientWidth ≤ 1`)
2. כל `input/textarea/select` ≥ 16px
3. כל `button/a/[role=button]` ≥ 44×44

מה שלא נתפס אוטומטית (חייב מכשיר אמיתי 🔧REAL): מקלדת, notch, home-indicator, rubber-band, momentum, PWA-installed mode.

---

## 🎯 סדר ביצוע

| גל | למה ראשון | זמן גס |
|----|----------|--------|
| **0** | תשתית — מסיר ~70% מהבעיות גלובלית | 1–2ש׳ |
| **1** | Recharts RTL — התלונה המוצהרת, win מהיר | 30–60ד׳ |
| **2** | דפי Advanced — רוב המסכים הכבדים | 3–4ש׳ |
| **3** | Journal — הכי שבור והכי גדול | 2–3ש׳ |
| **4** | ניווט + מודלים — חוויית native | 2ש׳ |
| **5** | PWA + פוליש | 2ש׳ |

**פרוטוקול:** מבצעים גל במלואו → רצים `mobile-audit.spec.ts` → מדווחים → ממתינים לאישור → גל הבא. דסקטופ לא נוגעים בשום שלב.

---

## 🔧 התאמות שביצעתי מול המאסטר־פלאן המקורי

1. **דילוג על 0.5** (body-scroll) — DimensionController + MainPullToRefresh מסתמכים על shell-scroll הקיים; שינוי המודל ישבור את האנימציות הקולנועיות.
2. **השארת `interactive-widget=resizes-content`** — ה־`visualViewport` listener ב־MobileBottomNav כבר מסתמך עליו; 4.1 לבד מספיק.
3. **4.1: `translateY(100%)` במקום `display:none`** — מונע layout shift וקטיעת fade transition.
4. **0.10: שמירה על Heebo** — קריטי לעברית (לא בפלאן המקורי במפורש).
5. **תוספת 0.12** — `-webkit-tap-highlight-color` + `touch-callout` (חסר במקור, גורם לריבוע אפור ב־iOS).
6. **5.2: ServiceWorker כבר קיים** — רק לאמת cache strategy, לא לבנות מחדש.

## Wave 2.2 — DashboardAdvancedLab mobile fix (hotfix on user feedback)
- Removed global `.recharts-responsive-container { max-height: 180px !important }` from `src/index.css` mobile block — it was clipping legends/axes site-wide and made charts feel "missing" inside the Lab.
- `DashboardAdvancedLab.tsx` now consumes `useIsMobile()`:
  - `minCard` grid threshold: 320 → 260 on mobile (better fit on 360–390px screens).
  - Chart height: 220 → 200 on mobile (denser, full content visible).
  - Heatmap cell: 16 → 14 on mobile.
- Verified: smoke test green, sw=cw=390 on all routes.
