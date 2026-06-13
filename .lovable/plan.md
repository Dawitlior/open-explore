# 🎯 UIE v1.2 — Phase 3 (in progress)

Phases 1 & 2 ✅ נמסרו (61 בדיקות גולדן עוברות).
Phase 3 = Archetype C (fills aggregation) + Link-files (trades.csv + fills.csv).

## Phase 2 — סיכום הושלם ✅
- Step 1 · Content Profiler (`content/profile.ts`) — 14 tests
- Step 2 · Value Normalizer (`content/normalize-values.ts`) — 17 tests
- Step 3 · Archetype A (`archetypes/archetype-a.ts`) — 8 tests
- Step 4 · Archetype B Open/Close pair (`archetypes/archetype-b.ts`) — 7 tests
- Step 5 · Detector + runner (`archetypes/detect.ts`) — 5 tests
- Step 6 · Zero-Destruction fallback ב-`xlsx-engine.ts` (parseBrokerCsvRaw)
- Step 7 · 61/61 גולדן ✅

## Phase 3 — שלבי בנייה

### Step 1 · Fill row classifier (`src/lib/uie/archetypes/fill-classify.ts`)
מזהה אם טבלה היא "fills" (הרבה שורות זעירות לכל orderId): סימנים = `fill id`/`exec id`, `order id` עם חזרות, `qty` קטן יחסית, ו-`price` משתנה בתוך אותו order.

### Step 2 · Archetype C (`archetypes/archetype-c.ts`)
Aggregation: קיבוץ לפי `orderId`/`externalId`. חישוב VWAP entry/exit, sum qty, sum fees, net realized PnL. תומך ב-partial fills בשני הכיוונים (build → unwind).

### Step 3 · Link-files (`src/lib/uie/link-files/link.ts`)
מחבר זוג קבצים: `trades.csv` (one row per trade) + `fills.csv` (many rows per order). מצמיד fills לעסקאות לפי tradeId/orderId. אם קיים רק fills.csv → derive trades דרך Archetype C.

### Step 4 · Derive (`src/lib/uie/link-files/derive.ts`)
מסיק שדות חסרים: `entry` ← VWAP מ-fills של פתיחה, `exit` ← VWAP סגירה, `positionSize` ← max signed cumulative qty, `pnl` ← Σ realized.

### Step 5 · Detector update + Integration
מרחיב `detectArchetype` עם זיהוי C. אינטגרציה נוספת ב-xlsx-engine: אם UIE זיהה C → להפעיל aggregation לפני המרה ל-Trade.

### Step 6 · Golden tests
- fills-only file → derive trades
- trades + fills → enriched VWAP
- partial fills (build → unwind) → נכון
- mixed currencies/symbols → segregation

## נדחה ל-Phase 4 / 4.5
- Archetype D (equity statements) + `equity-events.ts`
- delivery/ (gap-analysis, messages, fix-actions, dedup, notes-overflow)
- Adapter שלם ל-NormalizedTrade (D1)

## Definition of Done · Phase 3
- [ ] 5 קבצים חדשים תחת `src/lib/uie/archetypes/` ו-`src/lib/uie/link-files/`.
- [ ] אפס תלויות חדשות.
- [ ] Detector מחזיר 'C' כשמזהים fills.
- [ ] VWAP מדויק ב-6 ספרות.
- [ ] בנייה ירוקה.
