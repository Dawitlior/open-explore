# 🎯 UIE v1.2 — פייזה 1 (מאושרת לבנייה)

מקפל את הערה #1 פנימה (כלל התאריך עם דגל קונפליקט). הערות #2 ו-#3 מסומנות כ-TODO לפייזה 4/4.5 ולא דורשות סבב נוסף.

## פייזה 1 — היקף הבנייה
1. **`src/lib/uie/dictionary/canonical-fields.ts`** — 19 שדות קנוניים חדשים + עדכוני aliases לקיימים (orderType, direction, positionSize, entryDate/exitDate). הסרת `#` מ-externalId → `rowIndex` עם פרופיל `sequential_integer`.
2. **`src/lib/uie/matching/normalize.ts`** — 8 שלבי נרמול:
   lower · trim · NFD · ניקוי RTL marks · פיצול camelCase `(?<=[a-z])(?=[A-Z])` · הסרת תוכן סוגריים · הסרת ה"א הידיעה לטוקנים עבריים >2 (משווים גם מקור גם מנורמל, לוקחים גבוה) · null-tokens מורחב (`ー`, `—`, `N/A`, `-`).
3. **`src/lib/uie/matching/fuzzy.ts`** — Damerau-Levenshtein פנימי (~30 שורות, אפס תלות; הערת `// zero-dependency by design — see master-plan §14.1`).
4. **`src/lib/uie/matching/tiers.ts`** — מנוע 4-שלבי: P1 exact · P2 containment (כיסוי ≥0.5) · P3 token-subset (כיסוי ≥0.5) · P4 fuzzy (סף 60). מחזיר `{ field | null, score, tier, evidenceLayers, status: 'mapped' | 'pending-content' }`.
5. **`src/lib/uie/matching/date-detect.ts`** — הכרעת פורמט תאריך **פר-עמודה, ראייתית**:
   - סורק את כל הערכים של העמודה.
   - `firstGt12` = קיים ערך עם רכיב ראשון > 12.
   - `secondGt12` = קיים ערך עם רכיב שני > 12.
   - `firstGt12 && !secondGt12` → DD/MM ירוק.
   - `secondGt12 && !firstGt12` → MM/DD ירוק.
   - **`firstGt12 && secondGt12` → דגל 🟡 `date_conflict`** (עמודה מעורבת — לא לבחור בשקט; #1).
   - `!firstGt12 && !secondGt12` → 🟡 `date_ambiguous` עם שתי הצעות.
   - שום ערך לא מנחש. **אסור דיפולט שפה.**
6. **`src/lib/uie/canonical-trade.ts`** — סכל הטיפוסים הפנימי (D1). שדה אופציונלי.
7. **שילוב ב-`xlsx-engine.ts`**: קריאה ל-`mapHeaderToField()` החדש לפני המפה הישנה; fallback מלא למפה הקיימת אם החדש מחזיר `null` (Zero-Destruction).
8. **`src/lib/uie/golden-tests/`** — fixtures מ-GF-1..5 (כותרות בלבד בשלב זה). Snapshot כולל את הסטטוס; עמודות שתלויות בכללי תוכן (R_VS_PERCENT, QTY_CROSS_PRODUCT, DUPLICATE_FEE, AMOUNT_RULE) מוחזרות כ-`pending-content` ולא נועלות `field` (D3).
9. **`vitest`** — בדיקה ש-≥95% מ-76 הכותרות מקבלות 🟢/pending-content נכון, ושאף עמודה לא קופצת לדגל לא-תואם.

## הערות שתלכנה לתוכנית פייזה 4/4.5 (לא משפיע על פייזה 1)
- **#2** — בתוך פייזה 4.5, סדר ריצה: `derive` רץ **לפני** `gap-analysis`, כדי שכמות נגזרת (סכום/מחיר בקובץ בלינק) לא תיספר כ-Tier-1 חסר.
- **#3** — `equity-events.ts` ייכתב **בפייזה 4** (לצד `archetype-c/d` שמייצרים אותו), לא ב-`delivery/`. תיקיית `delivery/` תכיל רק את gap-analysis/messages/fix-actions/dedup/derive/notes-overflow.

## Definition of Done לפייזה 1
- [ ] כל 5 הקבצים החדשים נכתבו תחת `src/lib/uie/` בלבד.
- [ ] אפס תלויות חיצוניות חדשות (`package.json` ללא שינוי).
- [ ] `xlsx-engine.ts` הישן ממשיך לעבוד 100% (fallback מאומת).
- [ ] golden-tests מציגים ≥95% התאמה ראשונית, 0 נעילות שגויות.
- [ ] בנייה ירוקה.

ברגע שאתה מאשר — מתחיל ביצוע מלא של פייזה 1, ועוצר לסקירה לפני פייזה 2.
