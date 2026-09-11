# שתי חבילות בלבד: Free ו-Pro + חלוקת "ניתוח מתקדם" לתתי־ערוצים

## מה משתנה מבחינת המשתמש

היום יש שלוש רמות: Standard, Advanced, Ultimate. אחרי השינוי יש שתיים:

- **Free** — כולל את כל מה שהיה עד היום ב-Standard **וגם** את כל מה שהיה ב-Advanced.
- **Pro** — כל מה שהיה ב-Ultimate (השם "Ultimate" נעלם לגמרי מהמסכים והופך ל-Pro).

מי שכבר משלם על Advanced או Ultimate ממשיך לקבל Pro — אף אחד לא מאבד גישה.

## חלוקת "ניתוח מתקדם" לשלושה תתי־ערוצים

היום זה מקטע אחד ארוך שנפתח ונסגר. במקומו יהיו שלוש לשוניות בתוך המקטע, כל אחת עם אופי משלה:

| לשונית | תוכן | גישה |
|---|---|---|
| **התמונה הגדולה** (Overview) | עקומת הון, התפלגות P&L, ציון Orca, ביצועי מטבעות | פתוח לכולם |
| **פילוח וחלוקה** (Breakdown) | כיוון עסקאות, ביצועים חודשיים/רבעוניים, מטריצת שנים, תשואה לפי זמן | Pro |
| **מעבדת קוונט** (Quant Lab) | Kelly, אנטומיית רצפים, מטריצת רג'ים, גבול סיכון־תשואה | Pro |

הלשוניות הנעולות **נראות** למשתמש החינמי — עם תג נעילה ותצוגה מטושטשת מאחורי כרטיס שדרוג, כדי שיהיה ברור מה מקבלים ב-Pro. לחיצה עליהן פותחת את חלון השדרוג.

## פרטים טכניים

- `src/hooks/use-entitlement.ts` — `AppTier` הופך ל-`'free' | 'pro'`. תרגום מהשרת: `standard → free`, `advanced|ultimate → pro`. ה-RPC `current_entitlement` והטבלה `subscriptions` נשארים כמו שהם (בלי מיגרציית enum), המיפוי נעשה בצד הלקוח.
- `src/lib/chart-registry.ts` — `tierAccess` מקבל `'free' | 'pro'`: כל `advanced` הופך ל-`free`, כל `ultimate` הופך ל-`pro`. בנוסף נוסף שדה `channel: 'overview' | 'breakdown' | 'quant'` לגרפי הדאשבורד.
- `src/lib/billing-plans.ts` — נשארת תוכנית אחת בתשלום (`pro`) עם ה-price ה-39$ הקיים. תוכנית ה-14$ יורדת מהמסכים; מנויים קיימים עליה ממופים ל-Pro ב-`check-subscription`.
- `supabase/functions/check-subscription/index.ts` — מחזיר `tier: 'pro'` עבור שני המוצרים הקיימים.
- `src/components/dashboard/ReviewDashboard.tsx` — מקטע ה-Advanced מקבל שורת לשוניות; כל קבוצת גרפים עוברת ללשונית שלה. הדגלים `isAdvancedTier` / `isUltimateTier` מוחלפים ב-`isPro`.
- `src/components/billing/TierGate.tsx` + `UpgradeModal.tsx` + `ModeSwitch.tsx` — שתי אפשרויות בלבד (Free / Pro), טקסטים בעברית ובאנגלית.
- `src/lib/portfolio-limits.ts` — Free: 2 תיקים, Pro: 10.
- עדכון הבדיקות הקיימות ב-`src/lib/__tests__/portfolio-limits.test.ts`.

## סדר עבודה

1. שכבת ההרשאות (hook, registry, plans, edge function).
2. החלפת כל צרכני `advanced`/`ultimate` בקוד ל-`free`/`pro`.
3. בניית הלשוניות בדאשבורד + מצב נעול עם כרטיס שדרוג.
4. עדכון מסכי החיוב והבדיקות, והרצת typecheck ובדיקות.
