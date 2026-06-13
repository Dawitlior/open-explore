# 🎯 UIE v1.2 — Phase 2 (in progress)

Phase 1 ✅ נמסרה. Phase 2 = זיהוי תוכן + archetypes + link-files. בונים שלב-שלב, עוצרים לסקירה אחרי כל שלב.

## Phase 2 — שלבי בנייה

### Step 1 · Content Profiler (`src/lib/uie/content/profile.ts`)
פרופיל סטטיסטי לכל עמודה: `numeric | date | enum | currency | percent | r-multiple | string | mixed`.
- דגימה עד 200 ערכים לא-ריקים.
- זיהוי currency (סימנים $€₪¥/ISO 3 אותיות), percent (`%` בסיומת או טווח 0..1 עם header רמז), r-multiple (`R`/`x` בסיומת או טווח קטן ±10).
- מחזיר `{ type, confidence, sampleValues, flags[] }`.
- נועל `pending-content` שדות מ-Phase 1: r/risk/return/riskPct.

### Step 2 · Value Normalizer (`src/lib/uie/content/normalize-values.ts`)
המרת ערך גולמי → ערך קנוני: מספרים (פסיק/נקודה אירופית), תאריכים (לפי `date-detect`), enums (Long/Short, Buy/Sell, ל/ש בעברית), null-tokens.

### Step 3 · Archetype A (Single-row trade) (`src/lib/uie/archetypes/archetype-a.ts`)
כל שורה = עסקה סגורה. הזיהוי הפשוט והנפוץ ביותר.

### Step 4 · Archetype B (Open/Close pair) (`src/lib/uie/archetypes/archetype-b.ts`)
שתי שורות לעסקה (Action=Open/Close). מצמד לפי externalId/symbol+time.

### Step 5 · Archetype Detector (`src/lib/uie/archetypes/detect.ts`)
בוחר archetype לפי headers + תוכן.

### Step 6 · Integration ב-`xlsx-engine.ts`
תזרים: detect → profile → normalize-values → archetype → CanonicalTrade[].
Fallback מלא לישן אם UIE לא בטוח (Zero-Destruction).

### Step 7 · Golden tests תוכן
הרחבת `headers.test.ts` עם בדיקות פרופיל ו-archetype A.

## נדחה ל-Phase 3/4
- Archetype C (fills aggregation) — Phase 3.
- Archetype D (equity statements) + `equity-events.ts` — Phase 4.
- Link-files (trades.csv + fills.csv) + derive — Phase 3.
- delivery/ (gap-analysis, messages, fix-actions, dedup, notes-overflow) — Phase 4.5.

## Definition of Done · Phase 2
- [ ] 5 קבצים חדשים תחת `src/lib/uie/content/` ו-`src/lib/uie/archetypes/`.
- [ ] אפס תלויות חדשות.
- [ ] `xlsx-engine.ts` ממשיך לעבוד 100% עם fallback.
- [ ] Archetype A מזהה ≥90% מ-GF-1/GF-2.
- [ ] בנייה ירוקה.
