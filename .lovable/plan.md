## מאסטר פלאן — Light Theme "Indigo SaaS" לכל הפלטפורמה

### מה גיליתי בסריקה (מצב קיים, מאומת)

סרקתי את הקוד. הבעיה אינה "עוד עוד כמה תיקונים" — היא ארכיטקטונית:

| ממצא | מספר | משמעות |
|---|---|---|
| קבצי `.tsx` בפרויקט | 202 | היקף הביקורת |
| מופעי צבע HEX קשיח בקוד | **1,214** ב-70 קבצים | לא מגיבים לשינוי ערכה כלל |
| `rgba(255,255,255,…)` (זכוכית בהירה על כהה) | 227 | נעלמים לגמרי על רקע לבן |
| `rgba(0,0,0,…)` (צללים כבדים) | 148 | נראים כמו כתמים על לבן |
| `text-white` / `bg-black` וכו' | 80 | טקסט לבן על רקע לבן = בלתי קריא |
| קומפוננטות שקוראות תמה מ-JS (`getTheme`) | 47 | אלו כן ניתנות לתיקון מרכזי |

**שורש הבעיה:** יש שתי מערכות צבע מקבילות שלא מדברות זו עם זו — (א) טוקני CSS ב-`index.css` שנדרסים בזמן ריצה ע"י `applyThemeToDOM`, ו-(ב) אובייקט JS `TradingTheme` ב-`src/lib/trading-theme.ts` שנצרך כ-inline styles. בנוסף יש שכבה שלישית: מאות צבעים שכתובים ידנית ולא שייכים לאף מערכת. `JournalDimension.tsx` לבדו מכיל 282 צבעים קשיחים (133 מופעים של `#00FFA3` נאון ירוק, 98 של `#FF4D4D`) — צבעי נאון שנועדו לזהור על שחור ונמחקים לחלוטין על לבן.

ה-Platinum הקיים הוא "טלאי": 30 שורות `[data-theme="platinum"] … !important` ב-`index.css` שמכסות רק recharts וגלאס. כל השאר לא מכוסה. זו הסיבה שהכל התפרק.

---

### עקרון-על: אפס צבעים קשיחים

לא נוסיף עוד overrides. נעבור לשכבת טוקנים אחת שכל דבר בפלטפורמה קורא ממנה, ואז מצב לבן = החלפת ערכי הטוקנים בלבד.

---

## שלב 0 — תשתית טוקנים (הבסיס לכל השאר)

1. הרחבת `trading-theme.ts` ב-**סמנטיקה חדשה**: `surface.raised / sunken / overlay / glass`, `chart.grid / axis / tooltipBg / series[1..8]`, `state.profit / loss / neutral / warn / info`, `elevation.sm/md/lg`.
2. הגדרת כל אחת מהן כטוקן CSS (`--orca-*`) שנדחף ע"י `applyThemeToDOM` — כך שגם CSS וגם JS יונקים ממקור אחד.
3. יצירת hook `useOrcaTheme()` שמחזיר את הפלטה הפעילה + `isLight`, להחלפת כל שימוש ישיר ב-`T`.
4. הוספת lint-guard בבדיקות שנכשלת אם נוסף HEX קשיח חדש ב-`src/components` (מונע נסיגה עתידית).

## שלב 1 — הגדרת פלטת Light (מחליפה את Platinum)

- רקע אפליקציה `#F7F8FC`, כרטיסים `#FFFFFF`, גבולות `#E9EDF5`, טקסט ראשי `#111827`, משני `#475569`, עמום `#94A3B8`, אקסנט `#6366F1` (Indigo), אקסנט-רך `#EEF0FF`.
- **גרפים:** רווח `#0F9D8C` (טיל), הפסד `#E11D48` (ורוד), סדרות: `#6366F1`, `#0F9D8C`, `#F59E0B`, `#8B5CF6`, `#E11D48`, `#0EA5E9`, `#84CC16`, `#64748B`. גריד `#EDF1F7`, צירים `#64748B`.
- **צללים במקום זוהר:** במצב לבן `glow()` מוחלף בצל עדין (`0 1px 2px / 0 8px 24px rgba(15,23,42,.06)`) — אין neon על לבן.
- שם התצוגה בהגדרות משתנה ל-"Light".

## שלב 2 — Shell גלובלי (מה שהמשתמש ציין כשבור)

`HeaderBar`, `NavAvatar`, `MobileBottomNav`, `DimensionController`, `PortfolioSwitcher`, `OrcaUXLayer`, `ui/sidebar`, `CommandPalette` — כולם עוברים לטוקנים. הנאב-בר יקבל במצב לבן משטח לבן + גבול תחתון עדין + צל, במקום זכוכית כהה.
בנוסף: Aurora/גריין/spotlight/cursor-halo מכובים או מוחלפים בגרדיאנט פסטלי עדין; פס גלילה, `::selection`, focus-ring, ו-`theme-color` של ה-PWA.

## שלב 3 — ביקורת פיצ'ר-אחר-פיצ'ר

כל מודול נסרק, כל צבע קשיח מוחלף, ואז מצולם ב-Playwright בשני מצבים (Light/Dark) בדסקטופ+מובייל להשוואה חזותית:

1. **דאשבורד** — `ReviewDashboard`, `AdaptiveKpiCards`, `SimpleExtraCharts`, `PnLDistributionHistogram`, `BestWorstWindowChart`, `RiskAdjustedRatiosSection`, `DashboardCalendarStrip`, `OpenPositionsPanel`, `DashboardAdvancedLab`, `dashboard.css`
2. **יומן מסחר** — `JournalDimension` (282 צבעים, המשימה הכבדה ביותר), `TradeDetailModal`, `MobileTradeCard`, `SwipeableRow`
3. **הזנת עסקה** — `TradeForm`, `ImportDock`, `ImportPreflightModal`, `ImportLoadingOverlay`, `EmptyStateImportCTA`
4. **ביצועים** — `AdvancedAnalyticsPage`, `AnalyticsQuantLab`, `UltimateDeckCharts`, `TimeSeriesPerfMatrix`, `QuarterlyPerformanceCard`
5. **סיכון** — `AdvancedRiskPage`, `CorrelationMatrix` (מפת חום זקוקה לסקאלה בהירה נפרדת), `KillSwitchPanel`, `NetExposurePanel`, `HourOfDayStrip`, `QualityOfReturnsStrip`, `RiskLimitAlert`
6. **פסיכולוגיה** — `AdvancedPsychologyPage`, `PsychologyLab`, `FrogAvatar`, `trader-mind`
7. **סקירה שבועית** — כל `weekly-review` כולל `theme/tokens.ts` ו-`chart-ui.tsx` (יש שם מיפוי תמות משלו שיסונכרן)
8. **יומן/מאקרו** — `CalendarHubPage`, `calendar/views`, `EconomicCalendarPage`, `EconomicAlertBanner`, `MacroEventStrip`
9. **בקטסט** — `BacktestDimension`, `BacktestChartPanel`, `CommitBacktestModal`
10. **הגדרות ומודלים** — `SettingsHub`, `ExchangesPanel`, `ShareStatsModal` (כולל תמונת השיתוף המיוצאת), `UpgradeModal`, `ResetModal`, `FeatureManifestModal`, `CookiePreferencesModal`, כל האשפים
11. **Bug Arena** — `BugArenaComponents`, `bugCaptureEngine`
12. **נגישות** — `A11yPanel` + `a11y-engine.css`, כולל בדיקת מצב ניגודיות גבוהה על לבן
13. **מסכי מערכת** — `Landing`, `Auth`, `OrcaBootLoader`, `Privacy`, `Terms`, `NotFound`, `ErrorBoundary`, `LegalGate`, `DeploymentToast`, `EntryGate`

## שלב 4 — שכבת הגרפים

מודול `chart-theme.ts` יחיד: טולטיפ (רקע לבן, גבול אפור, צל, בלי blur), גריד/צירים, לג'נד, גרדיאנטים של `Area` (opacity נמוך יותר בלבן), `ReferenceLine`, סקאלות מפות-חום, ומצבי ריק/שלד. כל 30+ הגרפים נקשרים אליו.

## שלב 5 — אימות

- בדיקת ניגודיות WCAG AA אוטומטית על כל צמד טקסט/רקע.
- מעבר Playwright בכל מסלול בשני מצבים × 2 viewports, עם דוח צילומי מסך.
- בדיקת רגרסיה: Midnight / Blue / Graphite חייבים להיראות בדיוק כמו היום.
- בדיקת אקסנט מותאם אישית מעל מצב לבן (`applyCustomAccent`).

---

### הערות טכניות
- הכל שינוי תצוגה בלבד — אין נגיעה בלוגיקה עסקית, בנתונים או בבקאנד.
- `data-theme="platinum"` נשאר כמזהה טכני (תאימות ל-localStorage של משתמשים קיימים), אך התוכן והשם מוחלפים ל-Light.
- העבודה מבוצעת במודולים; אחרי כל מודול יש בדיקת טיפוסים + צילום השוואה, כך שאין "התפרקות" כמו בניסיון הקודם.

### היקף
זהו שינוי גדול המשתרע על ~70 קבצים עם צבעים קשיחים ועוד ~40 קבצי CSS/תמה. אבצע אותו לפי הסדר לעיל, מודול-מודול, ואדווח על ההתקדמות.
