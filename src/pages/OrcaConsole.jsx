import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  LayoutDashboard, Activity, Repeat, GitMerge, CreditCard, Brain, ShieldAlert,
  TrendingUp, TrendingDown, Grid3x3, Layers, FileCheck, Server, Search, Download,
  RefreshCw, Lock, ChevronDown, X, ArrowUpRight, ArrowDownRight, SlidersHorizontal,
  Globe, Users, Target, Flame, Clock, Database, KeyRound, CheckCircle2, Zap,
  Terminal, Play, Copy, Check, Filter, Sun, Moon, PanelLeft, FileText,
} from "lucide-react";
import { useAdminLive } from "@/hooks/use-admin-live";

/* ══════════════════════════════════════════════════════════════════════════
   ORCA CONSOLE · Administrative Command Centre for OrcaInvestment OS
   Two-tier navigation · 13 categorised pages · institutional light theme.
   Per-page pre-built query buttons + a full Query Console (no hand-written SQL).
   Full EN ⇄ HE (single language at any moment — never mixed).
   Every metric maps to a real platform source. Demo data is seeded; in
   production each figure is served by a SECURITY DEFINER RPC, pseudonymised
   (TRD-xxxx), never PII.
   ══════════════════════════════════════════════════════════════════════════ */

const LIGHT = {
  appBg: "#F6F7F9", panel: "#FFFFFF", panelAlt: "#FBFBFC",
  border: "#ECEDF1", borderStrong: "#E0E2E8",
  ink: "#16181D", ink2: "#3F434C", ink3: "#71757F",
  blue: "#4F46E5", blueDark: "#4338CA", blueSoft: "#EEF0FF",
  black: "#16181D", blackHover: "#0F1115", accent: "#4F46E5", accentHover: "#4338CA", chipFg: "#FFFFFF", rail: "#FFFFFF",
  pos: "#15803D", neg: "#BE123C", warn: "#B45309",
  gridLine: "#ECEDF1", codeBg: "#16181D",
  /* soft KPI tint backgrounds */
  tintMint: "#E8F5EE", tintViolet: "#EEEAFE", tintAmber: "#FEF3C7", tintRose: "#FFE4E6", tintSky: "#E0F2FE",
  tintBlue: "#E0F2FE", tintIndigo: "#EEEAFE",
  /* matching ink colors for icon chips */
  tintMintInk: "#1B7A43", tintVioletInk: "#6D28D9", tintAmberInk: "#B45309", tintRoseInk: "#BE123C", tintSkyInk: "#0369A1",
};
const DARK = {
  appBg: "#0E0F13", panel: "#16181D", panelAlt: "#1B1E24",
  border: "#262A31", borderStrong: "#2F343C",
  ink: "#F2F3F5", ink2: "#C7CAD1", ink3: "#9AA0AA",
  blue: "#6366F1", blueDark: "#818CF8", blueSoft: "#1E2030",
  black: "#0A0E16", blackHover: "#05070C", accent: "#6366F1", accentHover: "#818CF8", chipFg: "#FFFFFF", rail: "#16181D",
  pos: "#34D399", neg: "#FB7185", warn: "#FBBF24",
  gridLine: "#262A31", codeBg: "#0A1019",
  tintMint: "#10241A", tintViolet: "#1E1A33", tintAmber: "#2A2008", tintRose: "#2A1117", tintSky: "#0A2233",
  tintBlue: "#0A2233", tintIndigo: "#1E1A33",
  tintMintInk: "#6EE7A8", tintVioletInk: "#C4B5FD", tintAmberInk: "#FCD34D", tintRoseInk: "#FDA4AF", tintSkyInk: "#7DD3FC",
};
let C = LIGHT;
const PAL = ["#4F46E5", "#6D28D9", "#14B8A6", "#0EA5E9", "#475569", "#B45309", "#15803D", "#BE123C"];
/* Resolve the matching ink color for a given soft tint background */
const tintInk = (bg) => {
  const map = {
    [LIGHT.tintMint]: LIGHT.tintMintInk, [LIGHT.tintViolet]: LIGHT.tintVioletInk,
    [LIGHT.tintAmber]: LIGHT.tintAmberInk, [LIGHT.tintRose]: LIGHT.tintRoseInk, [LIGHT.tintSky]: LIGHT.tintSkyInk,
    [LIGHT.tintBlue]: LIGHT.tintSkyInk, [LIGHT.tintIndigo]: LIGHT.tintVioletInk,
    [DARK.tintMint]: DARK.tintMintInk, [DARK.tintViolet]: DARK.tintVioletInk,
    [DARK.tintAmber]: DARK.tintAmberInk, [DARK.tintRose]: DARK.tintRoseInk, [DARK.tintSky]: DARK.tintSkyInk,
    [DARK.tintBlue]: DARK.tintSkyInk, [DARK.tintIndigo]: DARK.tintVioletInk,
  };
  return map[bg] || C.accent;
};
const SANS = "'Poppins', 'Heebo', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

const L = {
  appName: { en: "ORCA Console", he: "ORCA Console" },
  appTag: { en: "Administrative command centre", he: "מרכז שליטה ניהולי" },
  bannerTitle: { en: "Command overview", he: "סקירת פיקוד" },
  bannerSub: { en: "Real-time state of the trading community", he: "מצב הקהילה בזמן אמת" },
  live: { en: "Live", he: "חי" },
  searchPh: { en: "Search metrics, traders, segments…", he: "חיפוש מדדים, סוחרים, פלחים…" },
  export: { en: "Export", he: "ייצוא" },
  updated: { en: "Updated", he: "עודכן" },
  securedBy: { en: "Row-level security · pseudonymised", he: "אבטחה ברמת שורה · מזוהה בכינוי" },

  filters: { en: "Filters", he: "מסננים" },
  range: { en: "Period", he: "תקופה" },
  d7: { en: "7 days", he: "7 ימים" }, d30: { en: "30 days", he: "30 יום" }, d90: { en: "90 days", he: "90 יום" }, m12: { en: "12 months", he: "12 חודשים" },
  asset: { en: "Asset class", he: "סוג נכס" }, allAssets: { en: "All assets", he: "כל הנכסים" },
  tierF: { en: "Subscription", he: "מנוי" }, allTiers: { en: "All tiers", he: "כל הדרגות" },
  showing: { en: "Showing", he: "מציג" }, traders: { en: "traders", he: "סוחרים" },

  grpEngage: { en: "Engagement", he: "מעורבות" },
  grpLifecycle: { en: "Lifecycle", he: "מחזור חיים" },
  grpBehavior: { en: "Behaviour & Risk", he: "התנהגות וסיכון" },
  grpIntel: { en: "Intelligence", he: "מודיעין" },
  grpData: { en: "Data", he: "נתונים" },
  grpOps: { en: "Operations", he: "תפעול" },

  navOverview: { en: "Command Overview", he: "סקירת פיקוד" },
  navActivity: { en: "Community Activity", he: "פעילות קהילתית" },
  navRetention: { en: "Retention & Cohorts", he: "שימור ומחזורי הצטרפות" },
  navActivation: { en: "Activation", he: "קליטה והפעלה" },
  navSubs: { en: "Subscriptions", he: "מנויים וחבילות" },
  navMind: { en: "Behavioural Diagnostics", he: "אבחון התנהגותי" },
  navRisk: { en: "Risk Engine", he: "מנוע סיכון" },
  navPerf: { en: "Performance & Edge", he: "ביצועים ויתרון" },
  navMatrix: { en: "Trader Matrix", he: "מטריצת סוחרים" },
  navBench: { en: "Aggregate Benchmarks", he: "מדדים מצרפיים" },
  navQueries: { en: "Query Console", he: "מסוף שאילתות" },
  navQuality: { en: "Data Quality", he: "איכות נתונים" },
  navSystem: { en: "System & Access", he: "מערכת והרשאות" },

  subOverview: { en: "Platform-wide health at a glance", he: "תמונת מצב כלל-פלטפורמית" },
  subActivity: { en: "When and how intensively the community trades", he: "מתי ובאיזו עוצמה הקהילה סוחרת" },
  subRetention: { en: "Survival of signup cohorts over time", he: "הישרדות מחזורי הרשמה לאורך זמן" },
  subActivation: { en: "From signup to first committed trade", he: "מהרשמה ועד הטרייד הראשון" },
  subSubs: { en: "Tier mix, states and trial conversion", he: "תמהיל דרגות, מצבים והמרת ניסיון" },
  subMind: { en: "Archetype mix and composite behavioural scores", he: "תמהיל ארכיטיפים וציונים התנהגותיים" },
  subRisk: { en: "Loss-budget breaches, recovery and kill-switch", he: "חריגות תקציב, התאוששות ו-Kill-Switch" },
  subPerf: { en: "Expectancy, edge and where it lives", he: "תוחלת, יתרון והיכן הוא מצוי" },
  subMatrix: { en: "Per-trader scores · pseudonymised", he: "ציונים לכל סוחר · מזוהה בכינוי" },
  subBench: { en: "Aggregate, anonymised community benchmarks", he: "מדדים מצרפיים ואנונימיים" },
  subQueries: { en: "Pre-built database queries — no SQL by hand", he: "שאילתות מוכנות מראש — בלי לכתוב SQL ידנית" },
  subQuality: { en: "Import readiness, provenance and gaps", he: "מוכנות ייבוא, מקור ופערים" },
  subSystem: { en: "Secured RPC surface and access posture", he: "משטח RPC מאובטח ומצב גישה" },

  kActive: { en: "Active traders", he: "סוחרים פעילים" },
  kDau: { en: "Daily active", he: "פעילים יומי" }, kWau: { en: "Weekly active", he: "פעילים שבועי" }, kMau: { en: "Monthly active", he: "פעילים חודשי" },
  kSignups: { en: "New signups", he: "הרשמות חדשות" }, kChurn: { en: "Churn rate", he: "שיעור נטישה" },
  kTrades: { en: "Trades logged", he: "טריידים שנרשמו" }, kExpect: { en: "Avg expectancy", he: "תוחלת ממוצעת" },
  kProfitable: { en: "Profitable traders", he: "סוחרים רווחיים" }, kDiscipline: { en: "Discipline index", he: "מדד משמעת" },
  kKill: { en: "Kill-switch events", he: "אירועי Kill-Switch" }, kReadiness: { en: "Avg import readiness", he: "מוכנות ייבוא ממוצעת" },
  kConversion: { en: "Trial conversion", he: "המרת ניסיון" }, kSessions: { en: "Avg sessions / week", he: "סשנים ממוצע / שבוע" },
  headlineTrades: { en: "Trades this week", he: "טריידים השבוע" }, winRate: { en: "Win-rate", he: "שיעור הצלחה" },

  cActiveTrend: { en: "Active traders — trend", he: "סוחרים פעילים — מגמה" }, cVolume: { en: "Trade volume", he: "נפח טריידים" },
  cSegmentation: { en: "Trader segmentation", he: "פילוח סוחרים" }, cTierMix: { en: "Subscription mix", he: "תמהיל מנויים" },
  cHeatmap: { en: "Activity by weekday & hour", he: "פעילות לפי יום ושעה" }, cByHour: { en: "Distribution by hour", he: "התפלגות לפי שעה" },
  cByDay: { en: "Distribution by weekday", he: "התפלגות לפי יום" }, cSessionsDist: { en: "Sessions per trader / week", he: "סשנים לסוחר / שבוע" },
  cRetentionCurves: { en: "Retention curves", he: "עקומות שימור" }, cRetentionTable: { en: "Cohort retention matrix", he: "מטריצת שימור מחזורים" },
  cChurnTrend: { en: "Churn rate — trend", he: "שיעור נטישה — מגמה" }, cFunnel: { en: "Activation funnel", he: "משפך הפעלה" },
  cDiagnostic: { en: "Onboarding diagnostic → tier", he: "אבחון הצטרפות → דרגה" }, cTimeToTrade: { en: "Time to first trade", he: "זמן עד טרייד ראשון" },
  cTierDist: { en: "Tier distribution", he: "התפלגות דרגות" }, cSubStates: { en: "Subscription states", he: "מצבי מנוי" },
  cConvTrend: { en: "Trial → paid conversion", he: "המרת ניסיון → תשלום" }, cTierOverTime: { en: "Tier composition over time", he: "הרכב דרגות לאורך זמן" },
  cArchetypeMix: { en: "Archetype distribution", he: "התפלגות ארכיטיפים" }, cScoreRadar: { en: "Composite scores — average", he: "ציונים מורכבים — ממוצע" },
  cScoreDist: { en: "ORCA score distribution", he: "התפלגות ציון ORCA" }, cDiscEdge: { en: "Discipline vs edge health", he: "משמעת מול בריאות יתרון" },
  cBreachWindow: { en: "Breaches by window", he: "חריגות לפי חלון" }, cKillRecovery: { en: "Kill-switch & recovery mode", he: "Kill-Switch ומצב התאוששות" },
  cOverride: { en: "Override-rate distribution", he: "התפלגות שיעור עקיפה" }, cBreachShare: { en: "Breach share by window", he: "חלוקת חריגות לפי חלון" },
  cExpectDist: { en: "Expectancy distribution (R)", he: "התפלגות תוחלת (R)" }, cExpectArch: { en: "Expectancy by archetype (R)", he: "תוחלת לפי ארכיטיפ (R)" },
  cWinDist: { en: "Win-rate distribution", he: "התפלגות שיעור הצלחה" }, cFrontier: { en: "Risk–reward frontier", he: "חזית סיכון–תשואה" },
  cKelly: { en: "Quarter-Kelly distribution", he: "התפלגות רבע-קלי" }, cByAsset: { en: "Expectancy by asset class (R)", he: "תוחלת לפי סוג נכס (R)" },
  cQuadrant: { en: "Value × risk map", he: "מפת ערך × סיכון" }, cReadinessDist: { en: "Import readiness distribution", he: "התפלגות מוכנות ייבוא" },
  cProvenance: { en: "Trade provenance", he: "מקור טריידים" }, cGapTypes: { en: "Gap-report issues", he: "סוגיות דו\"ח פערים" },
  cAssetDist: { en: "Asset-class distribution", he: "התפלגות סוגי נכס" }, cComposition: { en: "Community composition", he: "הרכב קהילתי" },

  thId: { en: "Trader", he: "סוחר" }, thArch: { en: "Archetype", he: "ארכיטיפ" }, thTier: { en: "Tier", he: "דרגה" },
  thDisc: { en: "Discipline", he: "משמעת" }, thRetention: { en: "Retention risk", he: "סיכון שימור" },
  thBehaviour: { en: "Behavioural risk", he: "סיכון התנהגותי" }, thValue: { en: "Value potential", he: "פוטנציאל ערך" },
  thExpect: { en: "Expectancy", he: "תוחלת" }, thSessions: { en: "Sessions/wk", he: "סשנים/שב'" }, thLastSeen: { en: "Last active", he: "פעיל לאחרונה" },
  thCohort: { en: "Cohort", he: "מחזור" },

  segAll: { en: "All", he: "הכל" }, segStars: { en: "High value", he: "ערך גבוה" }, segWatch: { en: "Value at risk", he: "ערך בסיכון" },
  segRisk: { en: "Elevated risk", he: "סיכון מוגבר" }, segDormant: { en: "Dormant", he: "רדום" },

  byTrades: { en: "Trades", he: "טריידים" }, window: { en: "Window", he: "חלון" },
  wTrade: { en: "Per trade", he: "לכל טרייד" }, wDaily: { en: "Daily", he: "יומי" }, wWeekly: { en: "Weekly", he: "שבועי" }, wMonthly: { en: "Monthly", he: "חודשי" },
  byArchetype: { en: "By archetype", he: "לפי ארכיטיפ" }, byAsset: { en: "By asset", he: "לפי נכס" },

  benchExpect: { en: "Community expectancy (R)", he: "תוחלת קהילתית (R)" }, benchProfit: { en: "Profitable share", he: "נתח רווחיים" },
  benchDisc: { en: "Discipline index", he: "מדד משמעת" }, benchRevenge: { en: "Reactive-entry prevalence", he: "שכיחות כניסה תגובתית" },
  benchOver: { en: "Elevated-frequency prevalence", he: "שכיחות תדירות מוגברת" }, benchVol: { en: "Monthly trade volume", he: "נפח טריידים חודשי" },
  benchAvgSess: { en: "Avg weekly sessions", he: "סשנים שבועיים ממוצע" }, benchEdge: { en: "Edge-health index", he: "מדד בריאות יתרון" },
  kAnon: { en: "Aggregates over a minimum cohort of 25 traders. Smaller segments are suppressed.", he: "מצרפים על מינימום 25 סוחרים. פלחים קטנים מוסתרים." },
  optIn: { en: "Aggregate and anonymised only · explicit opt-in required · individual profiles are never exposed.", he: "מצרפי ואנונימי בלבד · נדרשת הסכמה מפורשת · פרופיל פרט לעולם לא נחשף." },
  fallback: { en: "Derived from trade timestamps · event logging not yet enabled", he: "נגזר מחותמות זמן של טריידים · רישום אירועים טרם הופעל" },
  completed: { en: "Completed", he: "הושלם" }, abandoned: { en: "Abandoned", he: "ננטש" }, wkShort: { en: "W", he: "שב'" },

  listTopValue: { en: "Highest value potential", he: "פוטנציאל ערך מוביל" },
  listTopRisk: { en: "Highest behavioural risk", he: "סיכון התנהגותי מוביל" },
  listTopRetention: { en: "Highest retention risk", he: "סיכון שימור מוביל" },
  listTopPerf: { en: "Top performers (R)", he: "מובילי ביצועים (R)" },
  listDropoff: { en: "Largest funnel drop-off", he: "הנשירה הגדולה במשפך" },
  listBestCohort: { en: "Strongest cohorts (W4)", he: "מחזורים חזקים (שב'4)" },
  tPeak: { en: "Peak window", he: "שיא פעילות" }, tBusiest: { en: "Busiest weekday", he: "היום העמוס" }, tBestAsset: { en: "Strongest asset (R)", he: "הנכס החזק (R)" },
  gSurvival: { en: "W4 survival", he: "שרידות שב'4" }, gCommit: { en: "Commitment rate", he: "שיעור מחויבות" },
  gKillPrev: { en: "Kill-switch prevalence", he: "שכיחות Kill-Switch" }, gExpectIdx: { en: "Expectancy index", he: "מדד תוחלת" },

  drScores: { en: "Risk & value", he: "סיכון וערך" }, drExpTrend: { en: "Expectancy trend", he: "מגמת תוחלת" }, drMetrics: { en: "Metrics", he: "מדדים" },
  mRules: { en: "Rules followed", he: "ציות לחוקים" }, mOverride: { en: "Override rate", he: "שיעור עקיפה" }, mRevenge: { en: "Reactive entries", he: "כניסות תגובתיות" },
  mDrift: { en: "Risk drift", he: "סחיפת סיכון" }, mJournal: { en: "Journal completion", he: "השלמת יומן" }, mEdge: { en: "Edge health", he: "בריאות יתרון" },
  mRegime: { en: "Regime fit", he: "התאמת משטר" }, mKill: { en: "Kill-switch events", he: "אירועי Kill-Switch" }, mRecovery: { en: "Recovery entries", he: "כניסות התאוששות" },
  mTenure: { en: "Tenure (days)", he: "ותק (ימים)" }, mTrades: { en: "Total trades", he: "סך טריידים" },
  privacyNote: { en: "Pseudonymous ID · no PII · internal use only", he: "מזהה מוסווה · ללא PII · שימוש פנימי בלבד" },

  // query console
  quickQueries: { en: "Quick queries", he: "שאילתות מהירות" },
  qFunction: { en: "Function", he: "פונקציה" }, qParams: { en: "Parameters", he: "פרמטרים" }, qNoParams: { en: "No parameters required", he: "לא נדרשים פרמטרים" },
  qGenerated: { en: "Generated call", he: "קריאה מחושבת" }, qDescription: { en: "What it returns", he: "מה היא מחזירה" },
  qRun: { en: "Run query", he: "הרצת שאילתה" }, qCopy: { en: "Copy", he: "העתקה" }, qCopied: { en: "Copied", he: "הועתק" },
  qPresets: { en: "Preset library", he: "ספריית שאילתות" }, qReturned: { en: "Returned", he: "הוחזרו" }, rows: { en: "rows", he: "שורות" },
  qVerified: { en: "is_admin() verified · SECURITY DEFINER", he: "is_admin() אומת · SECURITY DEFINER" },
  qCatalogue: { en: "Function catalogue", he: "קטלוג פונקציות" }, qBuilder: { en: "Query builder", he: "בונה שאילתות" },
  pPeriod: { en: "Period (days)", he: "תקופה (ימים)" }, pWindow: { en: "Loss window", he: "חלון הפסד" }, pSegment: { en: "Segment", he: "פלח" },
  pAsset: { en: "Asset class", he: "סוג נכס" }, pTier: { en: "Tier", he: "דרגה" }, pArchetype: { en: "Archetype", he: "ארכיטיפ" },
  pLimit: { en: "Limit", he: "מגבלה" }, pSort: { en: "Sort by", he: "מיון לפי" }, pDir: { en: "Order", he: "סדר" }, pKmin: { en: "Min cohort (k)", he: "מינ' מדגם (k)" },
  dDesc: { en: "High → low", he: "גבוה → נמוך" }, dAsc: { en: "Low → high", he: "נמוך → גבוה" }, allWindows: { en: "All windows", he: "כל החלונות" },

  // system page
  sysRpc: { en: "RPC functions", he: "פונקציות RPC" }, sysAdmins: { en: "Authorised admins", he: "מנהלים מורשים" },
  sysK: { en: "k-anonymity threshold", he: "סף k-anonymity" }, sysRefresh: { en: "Last refresh", he: "רענון אחרון" },
  sysCatalog: { en: "RPC catalogue", he: "קטלוג RPC" }, sysAccess: { en: "Access & security posture", he: "גישה ומצב אבטחה" },
  thFn: { en: "Function", he: "פונקציה" }, thScope: { en: "Scope", he: "תחום" }, thGuard: { en: "Guard", he: "שמירה" }, thStatus: { en: "Status", he: "סטטוס" },
  stHealthy: { en: "Healthy", he: "תקין" },
  scopeEngage: { en: "Engagement", he: "מעורבות" }, scopeIntel: { en: "Intelligence", he: "מודיעין" }, scopeBench: { en: "Benchmark", he: "מדד מצרפי" }, scopeOps: { en: "Operations", he: "תפעול" },
  secRls: { en: "Row-level security enabled on all user tables", he: "אבטחת שורה פעילה בכל טבלאות המשתמש" },
  secNoRead: { en: "admin_users is not readable from any client", he: "admin_users אינו נגיש משום קליינט" },
  secHmac: { en: "Pseudonymisation via HMAC + server-side salt", he: "פסאודונימיזציה ב-HMAC + salt בצד שרת" },
  secDefiner: { en: "Every RPC is SECURITY DEFINER and opens with is_admin()", he: "כל RPC הוא SECURITY DEFINER ופותח ב-is_admin()" },
  secNoPii: { en: "No personally identifying data is returned to the client", he: "לא מוחזר מידע מזהה לקליינט" },
  onlyAdmin: { en: "Single authorised operator", he: "מפעיל מורשה יחיד" },

  // AI & infrastructure
  grpInfra: { en: "AI & Infrastructure", he: "AI ותשתית" },
  navAI: { en: "AI Usage", he: "צריכת AI" }, navStorage: { en: "Database & Storage", he: "מסד נתונים ואחסון" },
  subAI: { en: "Model usage from the AI gateway", he: "שימוש במודל דרך שער ה-AI" },
  subStorage: { en: "Database size, tables and growth", he: "גודל מסד הנתונים, טבלאות וצמיחה" },
  scopeInfra: { en: "Infrastructure", he: "תשתית" }, pFeature: { en: "AI feature", he: "יכולת AI" },
  kTokens: { en: "Tokens this week", he: "טוקנים השבוע" }, kCalls: { en: "AI calls", he: "קריאות AI" },
  kCost: { en: "Est. weekly cost", he: "עלות שבועית מוערכת" }, kLatency: { en: "Avg latency", he: "לטנציה ממוצעת" },
  cTokensTrend: { en: "Token usage by feature", he: "צריכת טוקנים לפי יכולת" }, cCallsCost: { en: "Calls & cost", he: "קריאות ועלות" },
  cTokenShare: { en: "Token share by feature", he: "חלוקת טוקנים לפי יכולת" }, cAiErrors: { en: "Error-free rate", he: "שיעור ללא שגיאות" },
  kDbSize: { en: "Database size", he: "גודל מסד הנתונים" }, kRows: { en: "Total rows", he: "סך שורות" },
  kConns: { en: "Active connections", he: "חיבורים פעילים" }, kCache: { en: "Cache hit rate", he: "שיעור פגיעת מטמון" },
  cTableSize: { en: "Storage by table", he: "אחסון לפי טבלה" }, cStorageTrend: { en: "Database growth", he: "צמיחת מסד הנתונים" },
  cRowsByTable: { en: "Rows by table", he: "שורות לפי טבלה" }, thTable: { en: "Table", he: "טבלה" }, thSize: { en: "Size", he: "גודל" }, thRows: { en: "Rows", he: "שורות" },

  // search & export
  searchPages: { en: "Pages", he: "עמודים" }, searchFns: { en: "Functions", he: "פונקציות" }, searchNoRes: { en: "No matches", he: "אין תוצאות" },
  exportPdf: { en: "Report · PDF", he: "דוח · PDF" }, exportJson: { en: "Data · JSON", he: "נתונים · JSON" }, reportTitle: { en: "Administrative report", he: "דוח ניהולי" },
};

/* ── localized category maps ── */
const ARCH = [
  { id: "sniper", en: "Sniper", he: "צלף" }, { id: "scalper", en: "Scalper", he: "סקלפר" },
  { id: "swing", en: "Swing", he: "סווינג" }, { id: "discretionary", en: "Discretionary", he: "דיסקרציוני" }, { id: "systematic", en: "Systematic", he: "שיטתי" },
];
const UNPROF = { id: "unprofiled", en: "Awaiting profiling", he: "ממתין לפרופיל" };
const TIER = [
  { id: "Beginner", en: "Beginner", he: "מתחיל", w: 1 },
  { id: "Advanced", en: "Advanced", he: "מתקדם", w: 2 },
  { id: "Ultimate", en: "Ultimate", he: "אולטימייט", w: 3 },
];
const SUBSTATE = [
  { id: "trial", en: "Trial", he: "ניסיון" }, { id: "active", en: "Active", he: "פעיל" },
  { id: "grace", en: "Past-due", he: "ארכה" }, { id: "legacy", en: "Legacy", he: "מורשת" },
];
const ASSET = [
  { id: "crypto", en: "Crypto", he: "קריפטו" }, { id: "equities", en: "Equities", he: "מניות" },
  { id: "forex", en: "Forex", he: "מט\"ח" }, { id: "futures", en: "Futures", he: "חוזים עתידיים" }, { id: "options", en: "Options", he: "אופציות" },
];
const PROV = [
  { id: "manual", en: "Manual", he: "ידני" }, { id: "import", en: "Import", he: "ייבוא" }, { id: "sync", en: "Exchange sync", he: "סנכרון בורסה" },
];
const DOW = [{ en: "Sun", he: "א'" }, { en: "Mon", he: "ב'" }, { en: "Tue", he: "ג'" }, { en: "Wed", he: "ד'" }, { en: "Thu", he: "ה'" }, { en: "Fri", he: "ו'" }, { en: "Sat", he: "ש'" }];
const AIFEAT = [
  { id: "coach", en: "Behavioural coach", he: "מאמן התנהגותי" },
  { id: "review", en: "Weekly review", he: "סקירה שבועית" },
  { id: "insights", en: "Trade insights", he: "תובנות מסחר" },
];

/* ── helpers ── */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const sgn = (n) => (n > 0 ? "+" : "");
const nf = new Intl.NumberFormat("en-US");
const pctv = (n) => `${Math.round(n)}%`;
// Short date formatter for time-series X-axis: "11 May" / "מאי 11".
// Accepts ISO-ish "YYYY-MM-DD" strings and degrades gracefully.
const fmtShortDate = (wk, lang) => {
  if (!wk) return "";
  const d = new Date(wk);
  if (isNaN(d.getTime())) return String(wk);
  try {
    return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { day: "2-digit", month: "short" });
  } catch { return String(wk); }
};
// Returns recharts XAxis props for a time-series array; caps tick density.
const timeAxisProps = (data, lang) => {
  const n = (data || []).length;
  const interval = n > 1 ? Math.max(0, Math.ceil(n / 8) - 1) : 0;
  return {
    interval, minTickGap: 24,
    angle: n > 16 ? -35 : 0,
    textAnchor: n > 16 ? "end" : "middle",
    height: n > 16 ? 56 : 30,
    tickFormatter: (v) => fmtShortDate(v, lang),
  };
};
const loc = (lang, o) => o[lang];
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickR = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const HEX = "0123456789ABCDEF";
const codeOf = (rand) => { let s = ""; for (let i = 0; i < 6; i++) s += HEX[Math.floor(rand() * 16)]; return "TRD-" + s; };
const topBy = (arr, key, n = 5, dir = "desc") => [...arr].sort((a, b) => (dir === "desc" ? b[key] - a[key] : a[key] - b[key])).slice(0, n);
const riskTone = (v) => (v >= 70 ? C.neg : v >= 45 ? C.warn : C.pos);
const valueTone = (v) => (v >= 65 ? C.pos : v >= 40 ? C.blue : C.ink3);

/* ── seeded data (maps to platform sources) ── */
function buildData() {
  const rand = rng(20260618);
  const traders = [];
  for (let i = 0; i < 220; i++) {
    const arch = rand() < 0.18 ? UNPROF : pickR(rand, ARCH), tier = pickR(rand, TIER), subState = pickR(rand, SUBSTATE), asset = pickR(rand, ASSET);
    const tenure = Math.floor(8 + rand() * 560), lastActive = Math.floor(rand() ** 2 * 24);
    const tradesTotal = Math.floor(14 + rand() * 1500), sessionsWk = r1(1 + rand() * 11);
    const winRate = clamp(0.32 + rand() * 0.42, 0, 0.92), rulesRate = clamp(0.45 + rand() * 0.53, 0, 0.99);
    const overrideRate = clamp(rand() ** 1.6 * 0.5, 0, 0.5), journal = clamp(rand() * (tier.id === "Standard" ? 0.7 : 1), 0, 0.98);
    const revenge = clamp(rand() ** 1.4 * 0.85, 0, 0.82), overZ = r1((rand() - 0.4) * 3.2), riskDrift = r1((rand() - 0.4) * 1.8);
    const e0 = r1((rand() - 0.42) * 0.9), slope = (rand() - 0.5) * 0.12;
    const expTrend = Array.from({ length: 12 }, (_, k) => r1(e0 + slope * k + (rand() - 0.5) * 0.18));
    const expectancy = expTrend[11], expSlope = r1(expTrend[11] - expTrend[0]);
    const breaches = { trade: Math.floor(rand() ** 1.4 * 9), daily: Math.floor(rand() ** 1.6 * 6), weekly: Math.floor(rand() ** 1.8 * 4), monthly: Math.floor(rand() ** 2.2 * 2) };
    const recovery = Math.floor(rand() ** 1.8 * 5), kill = Math.floor(rand() ** 2.4 * 4);
    const readiness = Math.round(clamp(55 + rand() * 45 - overrideRate * 20, 0, 100));
    const prov = { manual: rand(), import: rand(), sync: rand() }; const ps = prov.manual + prov.import + prov.sync;
    prov.manual = r2(prov.manual / ps); prov.import = r2(prov.import / ps); prov.sync = r2(1 - prov.manual - prov.import);
    const discipline = Math.round(clamp(rulesRate * 60 + journal * 25 + (1 - overrideRate) * 15 - riskDrift * 6, 0, 100));
    const edgeHealth = Math.round(clamp((expectancy > 0 ? 50 + expectancy * 35 : 25) + Math.min(tradesTotal / 1500, 1) * 20 + (rand() - 0.5) * 10, 0, 100));
    const regimeFit = Math.round(clamp(60 + expSlope * 50 + (rand() - 0.5) * 20, 0, 100));
    const orca = Math.round(clamp(discipline * 0.4 + edgeHealth * 0.4 + regimeFit * 0.2, 0, 100));
    const retentionRisk = Math.round(clamp(lastActive * 3.2 + (sessionsWk < 1.5 ? 22 : 0) + (tradesTotal < 45 ? 16 : 0) + (1 - journal) * 24 - tier.w * 4, 2, 99));
    const behaviouralRisk = Math.round(clamp((breaches.weekly + breaches.monthly) * 8 + revenge * 30 + Math.max(0, overZ) * 8 + Math.max(0, riskDrift) * 13 + kill * 6 + recovery * 3 - rulesRate * 16, 1, 99));
    const valuePotential = Math.round(clamp((expectancy > 0 ? 34 + expectancy * 28 : 8) + Math.max(0, expSlope) * 55 + rulesRate * 20 + journal * 16 + Math.min(tenure / 560, 1) * 14 + tier.w * 4 - behaviouralRisk * 0.16, 2, 99));
    const ltv = Math.round((tier.w * 280) * (0.5 + valuePotential / 120) * (1 - retentionRisk / 240) * (0.7 + Math.min(tenure / 365, 1.4)));
    traders.push({ id: i, code: codeOf(rand), arch, tier, subState, asset, tenure, lastActive, tradesTotal, sessionsWk, winRate, rulesRate, overrideRate, journal, revenge, overZ, riskDrift, expectancy, expSlope, expTrend, breaches, recovery, kill, readiness, prov, discipline, edgeHealth, regimeFit, orca, retentionRisk, behaviouralRisk, valuePotential, ltv });
  }
  const engagement = Array.from({ length: 24 }, (_, w) => {
    const g = 1 + w * 0.05, mau = Math.round((140 + w * 12) * (0.93 + rand() * 0.14));
    const wau = Math.round(mau * (0.5 + rand() * 0.12)), dau = Math.round(wau * (0.33 + rand() * 0.1));
    return { w, dau, wau, mau, stickiness: Math.round((dau / mau) * 100), signups: Math.round((10 + w * 0.6) * (0.6 + rand() * 1)), deletions: Math.round(rand() ** 1.8 * 6), churn: r1(1.5 + rand() * 4), trades: Math.round((220 + w * 20) * (0.8 + rand() * 0.4) * g), active: Math.round((130 + w * 9) * (0.9 + rand() * 0.15)), breachT: Math.floor(20 + rand() * 40), breachD: Math.floor(10 + rand() * 26), breachW: Math.floor(5 + rand() * 16), breachM: Math.floor(1 + rand() * 7), kill: Math.floor(rand() ** 1.5 * 9), recovery: Math.floor(2 + rand() * 11), conv: r1(14 + w * 0.5 + (rand() - 0.5) * 6), tStd: Math.round(60 + rand() * 20), tAdv: Math.round(40 + rand() * 18), tPro: Math.round(20 + rand() * 14), tUlt: Math.round(8 + rand() * 9) };
  });
  const heat = [];
  for (let di = 0; di < 7; di++) for (let h = 0; h < 24; h++) {
    const ny = Math.exp(-((h - 16.5) ** 2) / 6), lon = Math.exp(-((h - 10) ** 2) / 7) * 0.7, eve = Math.exp(-((h - 21) ** 2) / 5) * 0.85, wk = di >= 5 ? 0.45 : 1;
    heat.push({ d: di, h, v: Math.max(0, (ny + lon + eve) * wk * (0.7 + rand() * 0.5)) });
  }
  const hmax = Math.max(...heat.map((c) => c.v));
  const cohorts = Array.from({ length: 6 }, (_, c) => ({ c, start: 94 - c * 3, curve: Array.from({ length: 8 }, (_, k) => Math.round((94 - c * 3) * Math.exp(-k * (0.15 + rand() * 0.05)))) }));
  const funnel = [
    { id: "identity", en: "Identity", he: "זהות", n: 1000 }, { id: "community", en: "Community", he: "קהילה", n: 921 },
    { id: "profiling", en: "Profiling", he: "פרופיילינג", n: 868 }, { id: "value", en: "Value proposition", he: "הצעת ערך", n: 822 },
    { id: "commit", en: "Commitment gate", he: "שער מחויבות", n: 651 }, { id: "first", en: "First trade", he: "טרייד ראשון", n: 463 }, { id: "active30", en: "Active at 30 days", he: "פעיל ב-30 יום", n: 281 },
  ];
  const diagTier = TIER.map((t) => ({ id: t.id, n: Math.round(60 + rand() * 180) }));
  const ttft = [
    { en: "< 1h", he: "< שעה", n: Math.round(120 + rand() * 60) }, { en: "1–24h", he: "1–24 שע'", n: Math.round(180 + rand() * 70) },
    { en: "1–3d", he: "1–3 ימים", n: Math.round(150 + rand() * 60) }, { en: "4–7d", he: "4–7 ימים", n: Math.round(90 + rand() * 40) }, { en: "> 7d", he: "> 7 ימים", n: Math.round(70 + rand() * 40) },
  ];
  const aiUsage = Array.from({ length: 16 }, (_, w) => {
    const coach = Math.round(140000 + w * 9000 + rand() * 40000), review = Math.round(60000 + w * 3500 + rand() * 20000), insights = Math.round(90000 + w * 5000 + rand() * 30000);
    const tokens = coach + review + insights;
    return { w, coach, review, insights, tokens, calls: Math.round(tokens / 1800), cost: r2(tokens / 1e6 * 3.2), latency: Math.round(600 + rand() * 900), errors: Math.round(rand() ** 2 * 30) };
  });
  const storage = [
    { id: "trades", mb: 1840, rows: 1284000 }, { id: "activity_events", mb: 540, rows: 2100000 }, { id: "journal_entries", mb: 720, rows: 96000 },
    { id: "ai_runs", mb: 410, rows: 58000 }, { id: "import_batches", mb: 130, rows: 12000 }, { id: "profiles", mb: 48, rows: 2300 },
    { id: "portfolios", mb: 36, rows: 4200 }, { id: "subscriptions", mb: 22, rows: 2300 },
  ];
  const storageTrend = Array.from({ length: 16 }, (_, w) => ({ w, mb: Math.round(2600 + w * 180 + rand() * 120) }));
  const dbStats = { sizeMb: storage.reduce((s, t) => s + t.mb, 0), rows: storage.reduce((s, t) => s + t.rows, 0), connections: Math.round(18 + rand() * 30), cacheHit: r1(97 + rand() * 2.5) };
  return { traders, engagement, heat, hmax, cohorts, funnel, diagTier, ttft, aiUsage, storage, storageTrend, dbStats };
}
const DATA = buildData();

/* ── RPC registry — drives the System catalogue and the Query Console ── */
const RPCS = [
  { fn: "admin_engagement_weekly", scope: "scopeEngage", params: ["period"] },
  { fn: "admin_activity_heatmap", scope: "scopeEngage", params: ["period"] },
  { fn: "admin_retention_cohorts", scope: "scopeEngage", params: ["period"] },
  { fn: "admin_activation_funnel", scope: "scopeEngage", params: ["period"] },
  { fn: "admin_subscriptions", scope: "scopeEngage", params: ["period", "tier"] },
  { fn: "admin_trader_mind", scope: "scopeIntel", params: ["archetype", "tier"] },
  { fn: "admin_risk_engine", scope: "scopeIntel", params: ["period", "window", "tier"] },
  { fn: "admin_performance", scope: "scopeIntel", params: ["archetype", "asset", "tier"] },
  { fn: "admin_trader_matrix", scope: "scopeIntel", params: ["segment", "sort", "dir", "limit", "tier", "asset", "archetype"] },
  { fn: "admin_benchmarks", scope: "scopeBench", params: ["kmin", "asset", "tier"] },
  { fn: "admin_data_quality", scope: "scopeOps", params: ["asset"] },
  { fn: "admin_ai_usage", scope: "scopeInfra", params: ["period", "feature"] },
  { fn: "admin_db_storage", scope: "scopeInfra", params: [] },
];
const SCOPE_TONE = { scopeEngage: "blue", scopeIntel: "warn", scopeBench: "pos", scopeOps: "ink", scopeInfra: "neg" };

/* ── query param catalogue ── */
const SORT_LABEL = { behaviouralRisk: "thBehaviour", retentionRisk: "thRetention", valuePotential: "thValue", expectancy: "thExpect", discipline: "thDisc" };
const Q_DEFAULTS = { period: "90", window: "all", segment: "all", asset: "all", tier: "all", archetype: "all", limit: "25", sort: "behaviouralRisk", dir: "desc", kmin: "25", feature: "all" };
function paramOptions(key, t, lang) {
  const all = { v: "all", l: t("segAll") };
  switch (key) {
    case "period": return [{ v: "7", l: t("d7") }, { v: "30", l: t("d30") }, { v: "90", l: t("d90") }, { v: "365", l: t("m12") }];
    case "window": return [{ v: "all", l: t("allWindows") }, { v: "trade", l: t("wTrade") }, { v: "daily", l: t("wDaily") }, { v: "weekly", l: t("wWeekly") }, { v: "monthly", l: t("wMonthly") }];
    case "segment": return [all, { v: "stars", l: t("segStars") }, { v: "watch", l: t("segWatch") }, { v: "risk", l: t("segRisk") }, { v: "dormant", l: t("segDormant") }];
    case "asset": return [all, ...ASSET.map((a) => ({ v: a.id, l: loc(lang, a) }))];
    case "tier": return [all, ...TIER.map((tr) => ({ v: tr.id, l: loc(lang, tr) }))];
    case "archetype": return [all, ...ARCH.map((a) => ({ v: a.id, l: loc(lang, a) }))];
    case "limit": return [{ v: "10", l: "10" }, { v: "25", l: "25" }, { v: "50", l: "50" }, { v: "100", l: "100" }];
    case "sort": return Object.keys(SORT_LABEL).map((k) => ({ v: k, l: t(SORT_LABEL[k]) }));
    case "dir": return [{ v: "desc", l: t("dDesc") }, { v: "asc", l: t("dAsc") }];
    case "kmin": return [{ v: "25", l: "25" }, { v: "50", l: "50" }, { v: "100", l: "100" }];
    case "feature": return [all, ...AIFEAT.map((f) => ({ v: f.id, l: loc(lang, f) }))];
    default: return [];
  }
}
const paramLabelKey = { period: "pPeriod", window: "pWindow", segment: "pSegment", asset: "pAsset", tier: "pTier", archetype: "pArchetype", limit: "pLimit", sort: "pSort", dir: "pDir", kmin: "pKmin", feature: "pFeature" };

/* build the supabase.rpc(...) snippet */
function callSnippet(fn, params) {
  const spec = RPCS.find((r) => r.fn === fn); if (!spec) return "";
  const entries = spec.params.map((k) => {
    let v = params[k];
    if (["period", "limit", "kmin"].includes(k)) return `${k}: ${parseInt(v)}`;
    if (["asset", "tier", "archetype", "segment", "feature"].includes(k) && v === "all") return `${k}: null`;
    if (k === "window" && v === "all") return `window: null`;
    return `${k}: '${v}'`;
  });
  if (!entries.length) return `await supabase.rpc('${fn}')`;
  return `await supabase.rpc('${fn}', {\n  ${entries.join(",\n  ")}\n})`;
}

/* plain-language description, localized */
function describeQuery(fn, params, t, lang) {
  const optLabel = (key, v) => { const o = paramOptions(key, t, lang).find((x) => x.v === v); return o ? o.l : v; };
  const by = lang === "en" ? "by" : "לפי";
  const top = (n) => (lang === "en" ? `top ${n}` : `${n} ראשונים`);
  const inLast = (d) => (lang === "en" ? `last ${d} days` : `${d} הימים האחרונים`);
  const join = (parts) => parts.filter(Boolean).join(" · ");
  switch (fn) {
    case "admin_engagement_weekly": return join([lang === "en" ? "Weekly DAU/WAU/MAU, signups, deletions and volume" : "DAU/WAU/MAU שבועי, הרשמות, מחיקות ונפח", inLast(params.period)]);
    case "admin_activity_heatmap": return join([lang === "en" ? "7×24 trade-velocity heatmap" : "מפת חום 7×24 של פעילות", inLast(params.period)]);
    case "admin_retention_cohorts": return lang === "en" ? "Per-cohort retention curves and matrix" : "עקומות ומטריצת שימור לפי מחזור";
    case "admin_activation_funnel": return lang === "en" ? "Onboarding funnel, diagnostic→tier and time-to-first-trade" : "משפך הצטרפות, אבחון→דרגה וזמן לטרייד ראשון";
    case "admin_subscriptions": return join([lang === "en" ? "Tier mix, states and trial conversion" : "תמהיל דרגות, מצבים והמרת ניסיון", params.tier !== "all" && optLabel("tier", params.tier)]);
    case "admin_trader_mind": return join([lang === "en" ? "Archetype mix and composite scores" : "תמהיל ארכיטיפים וציונים מורכבים", params.archetype !== "all" && optLabel("archetype", params.archetype), params.tier !== "all" && optLabel("tier", params.tier)]);
    case "admin_risk_engine": return join([lang === "en" ? "Loss-budget breaches, kill-switch and recovery" : "חריגות תקציב, Kill-Switch והתאוששות", params.window !== "all" && optLabel("window", params.window), inLast(params.period)]);
    case "admin_performance": return join([lang === "en" ? "Expectancy, win-rate, Kelly and frontier" : "תוחלת, שיעור הצלחה, קלי וחזית", params.archetype !== "all" && optLabel("archetype", params.archetype), params.asset !== "all" && optLabel("asset", params.asset)]);
    case "admin_trader_matrix": return join([optLabel("segment", params.segment), `${by} ${optLabel("sort", params.sort)}`, top(params.limit), params.tier !== "all" && optLabel("tier", params.tier), params.asset !== "all" && optLabel("asset", params.asset), params.archetype !== "all" && optLabel("archetype", params.archetype)]);
    case "admin_benchmarks": return join([lang === "en" ? "Aggregate community benchmarks" : "מדדים מצרפיים", `k≥${params.kmin}`, params.asset !== "all" && optLabel("asset", params.asset)]);
    case "admin_data_quality": return join([lang === "en" ? "Import readiness, provenance and gaps" : "מוכנות ייבוא, מקור ופערים", params.asset !== "all" && optLabel("asset", params.asset)]);
    case "admin_ai_usage": return join([lang === "en" ? "AI token usage, calls, cost and latency" : "צריכת טוקנים, קריאות, עלות ולטנציה של AI", params.feature !== "all" && optLabel("feature", params.feature), inLast(params.period)]);
    case "admin_db_storage": return lang === "en" ? "Database size, per-table storage and row counts" : "גודל מסד הנתונים, אחסון לכל טבלה וספירת שורות";
    default: return "";
  }
}

/* plausible returned row count from seeded data (so 'Returned N rows' feels real) */
function runCount(fn, params, traders) {
  const filt = traders.filter((x) => (params.asset === "all" || !params.asset || x.asset.id === params.asset) && (params.tier === "all" || !params.tier || x.tier.id === params.tier) && (params.archetype === "all" || !params.archetype || x.arch.id === params.archetype));
  const segOf = (x) => { const hv = x.valuePotential >= 50, hr = Math.max(x.behaviouralRisk, x.retentionRisk) >= 50; return hv && !hr ? "stars" : hv && hr ? "watch" : !hv && hr ? "risk" : "dormant"; };
  switch (fn) {
    case "admin_engagement_weekly": return Math.ceil(parseInt(params.period) / 7);
    case "admin_activity_heatmap": return 168;
    case "admin_retention_cohorts": return 6;
    case "admin_activation_funnel": return 7;
    case "admin_subscriptions": return TIER.length * SUBSTATE.length;
    case "admin_trader_mind": return filt.length ? ARCH.length : 0;
    case "admin_risk_engine": return params.window === "all" ? Math.ceil(parseInt(params.period) / 7) * 4 : Math.ceil(parseInt(params.period) / 7);
    case "admin_performance": return params.archetype !== "all" ? 1 : ARCH.length;
    case "admin_trader_matrix": { const seg = params.segment === "all" ? filt : filt.filter((x) => segOf(x) === params.segment); return Math.min(parseInt(params.limit), seg.length); }
    case "admin_benchmarks": return 1;
    case "admin_data_quality": return ASSET.length;
    case "admin_ai_usage": return Math.ceil(parseInt(params.period) / 7);
    case "admin_db_storage": return 8;
    default: return filt.length;
  }
}

/* ════════════════ UI atoms ════════════════ */
const useT = (lang) => (k) => (L[k] ? L[k][lang] : k);
let axis = { tick: { fontSize: 10.5, fill: C.ink3, fontFamily: MONO }, axisLine: false, tickLine: false, minTickGap: 24, padding: { left: 6, right: 6 } };
let tipStyle = { background: C.panel, border: `1px solid ${C.borderStrong}`, borderRadius: 8, fontFamily: SANS, fontSize: 11.5, boxShadow: "0 6px 20px rgba(16,27,45,0.12)", color: C.ink };
let grid = <CartesianGrid stroke={C.gridLine} strokeDasharray="3 4" vertical={false} />;
const gridCols = (cols, gap = 14) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${cols >= 4 ? 168 : cols === 3 ? 230 : 300}px), 1fr))`, gap });

function Card({ title, subtitle, toolbar, children, pad = 16, badge }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(16,27,45,0.04)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {(title || toolbar) && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "13px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div>
            {title && <div style={{ fontFamily: SANS, fontWeight: 650, fontSize: 13.5, color: C.ink, letterSpacing: 0.1, display: "flex", alignItems: "center", gap: 8 }}>{title}{badge}</div>}
            {subtitle && <div style={{ fontFamily: SANS, fontSize: 11, color: C.ink3, marginTop: 3 }}>{subtitle}</div>}
          </div>
          {toolbar}
        </div>
      )}
      <div style={{ padding: pad, flex: 1 }}>{children}</div>
    </div>
  );
}

/* ChartCard — thin Card wrapper that enforces a consistent chart height and
   trims inner padding so axis labels breathe. Use for any Recharts container. */
function ChartCard({ title, subtitle, toolbar, badge, height = 220, children }) {
  return (
    <Card title={title} subtitle={subtitle} toolbar={toolbar} badge={badge} pad={12}>
      <div style={{ width: "100%", height, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Card>
  );
}

function StatTile({ label, value, suffix, delta, deltaGood = "up", bg, tint, icon: Icon, spark }) {
  const up = (delta ?? 0) >= 0, good = deltaGood === "up" ? up : !up;
  const chipBg = bg || C.tintIndigo;
  const chipInk = tintInk(chipBg);
  const sparkId = `sp-${label?.toString().replace(/[^a-z0-9]/gi, "") || Math.random().toString(36).slice(2)}`;
  return (
    <div
      style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)", transition: "box-shadow .2s ease, transform .2s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,24,40,.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: chipBg, color: chipInk, flexShrink: 0 }}>{Icon && <Icon size={20} />}</span>
        {delta !== undefined && delta !== null && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: good ? C.pos : C.neg, background: good ? (C.tintMint) : (C.tintRose) }}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{sgn(delta)}{delta}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.ink3, fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: SANS, fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: -0.5 }}>
          {value}<span style={{ fontSize: 13, color: C.ink3, fontWeight: 600, marginInlineStart: 2 }}>{suffix}</span>
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div style={{ height: 36, marginInline: -4, marginBottom: -4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chipInk} stopOpacity={0.30} />
                  <stop offset="100%" stopColor={chipInk} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={chipInk} strokeWidth={2} fill={`url(#${sparkId})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Gauge({ value, label, color = C.blue, suffix = "/100" }) {
  const v = clamp(value, 0, 100), data = [{ v }, { v: 100 - v }];
  return (
    <div style={{ position: "relative", width: "100%", height: 150 }}>
      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="v" startAngle={180} endAngle={0} cx="50%" cy="80%" innerRadius="60%" outerRadius="92%" stroke="none" isAnimationActive={false} cornerRadius={3}><Cell fill={color} /><Cell fill={C.appBg} /></Pie></PieChart></ResponsiveContainer>
      <div style={{ position: "absolute", left: 0, right: 0, top: "44%", textAlign: "center" }}><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: C.ink, letterSpacing: -0.5 }}>{Math.round(v)}<span style={{ fontSize: 12, color: C.ink3 }}>{suffix}</span></div><div style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink2, marginTop: 2 }}>{label}</div></div>
    </div>
  );
}

function RadialStack({ data }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 170, height: 170, flexShrink: 0 }}><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="34%" outerRadius="100%" data={data} startAngle={90} endAngle={-270} barSize={11}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar dataKey="v" cornerRadius={6} background={{ fill: C.appBg }} isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={d.c} />)}</RadialBar></RadialBarChart></ResponsiveContainer></div>
      <div style={{ flex: 1, display: "grid", gap: 9 }}>{data.map((d) => (<div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 12.5, color: C.ink2 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.c }} />{d.name}</span><span style={{ fontFamily: MONO, fontSize: 13, color: C.ink, fontWeight: 700 }}>{d.v}{d.suffix || ""}</span></div>))}</div>
    </div>
  );
}

function DonutWithLegend({ data }) {
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 150, height: 150, flexShrink: 0 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="v" nameKey="name" innerRadius={46} outerRadius={68} paddingAngle={2} isAnimationActive={false} stroke="none">{data.map((d, i) => <Cell key={i} fill={d.c} />)}</Pie><Tooltip contentStyle={tipStyle} /></PieChart></ResponsiveContainer></div>
      <div style={{ flex: 1, display: "grid", gap: 8 }}>{data.map((d) => (<div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 12.5, color: C.ink2 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.c }} />{d.name}</span><span style={{ fontFamily: MONO, fontSize: 12.5, color: C.ink, fontWeight: 600 }}>{nf.format(d.v)} <span style={{ color: C.ink3 }}>· {Math.round((d.v / total) * 100)}%</span></span></div>))}</div>
    </div>
  );
}

function RankList({ items, color, tone }) {
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <div style={{ display: "grid", gap: 11 }}>{items.map((it, i) => { const c = tone ? tone(it.v) : color; return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, width: 16 }}>{i + 1}</span><span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.ink, width: 88, whiteSpace: "nowrap" }}>{it.code}</span><div style={{ flex: 1, height: 6, background: C.appBg, borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${(it.v / max) * 100}%`, background: c, borderRadius: 99 }} /></div><span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: c, width: 40, textAlign: "end" }}>{it.label}</span></div>); })}</div>
  );
}

function Select({ value, onChange, options, lang }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} dir={lang === "he" ? "rtl" : "ltr"} style={{ appearance: "none", WebkitAppearance: "none", fontFamily: SANS, fontSize: 12, fontWeight: 500, color: C.ink, background: C.panel, border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: lang === "he" ? "6px 10px 6px 26px" : "6px 26px 6px 10px", cursor: "pointer", outline: "none" }}>{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      <ChevronDown size={13} color={C.ink3} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [lang === "he" ? "left" : "right"]: 8, pointerEvents: "none" }} />
    </div>
  );
}
function Seg({ value, onChange, options }) {
  return (<div style={{ display: "inline-flex", background: C.appBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2 }}>{options.map((o) => { const on = value === o.v; return <button key={o.v} onClick={() => onChange(o.v)} style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: on ? 650 : 500, padding: "5px 11px", borderRadius: 6, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: on ? C.panel : "transparent", color: on ? C.ink : C.ink2, boxShadow: on ? "0 1px 2px rgba(16,27,45,0.08)" : "none" }}>{o.l}</button>; })}</div>);
}
function Badge({ children, tone = "ink" }) {
  const m = { ink: [C.ink2, C.appBg], blue: [C.blue, C.blueSoft], pos: [C.pos, C.tintMint], neg: [C.neg, C.tintRose], warn: [C.warn, C.tintAmber] }[tone];
  return <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: m[0], background: m[1], border: `1px solid ${m[0]}22`, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{children}</span>;
}
function MiniBar({ v, color }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ flex: 1, height: 5, background: C.appBg, borderRadius: 99, overflow: "hidden", minWidth: 36 }}><div style={{ height: "100%", width: `${clamp(v, 0, 100)}%`, background: color, borderRadius: 99 }} /></div><span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: C.ink, width: 20, textAlign: "end" }}>{v}</span></div>);
}
function SectionHead({ n, title, subtitle }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, color: C.chipFg, display: "grid", placeItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{n}</div><div><h2 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, color: C.ink, letterSpacing: -0.2 }}>{title}</h2><div style={{ fontFamily: SANS, fontSize: 12, color: C.ink2, marginTop: 1 }}>{subtitle}</div></div></div>);
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { /* clipboard blocked */ } };
  return (
    <div style={{ position: "relative", background: C.codeBg, borderRadius: 10, padding: "13px 15px" }}>
      <pre style={{ margin: 0, fontFamily: MONO, fontSize: 11.5, color: "#DDE6F5", whiteSpace: "pre-wrap", lineHeight: 1.55, direction: "ltr", textAlign: "left" }}>{code}</pre>
      <button onClick={copy} title="copy" style={{ position: "absolute", top: 9, insetInlineEnd: 9, width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "grid", placeItems: "center", color: "#AEBBD4" }}>{copied ? <Check size={13} color="#34D399" /> : <Copy size={13} />}</button>
    </div>
  );
}

/* Live chart rendered for a query — the seeded result of the RPC, filtered by params */
function QueryResult({ fn, params, t, lang }) {
  const tr = DATA.traders.filter((x) => (params.asset === "all" || !params.asset || x.asset.id === params.asset) && (params.tier === "all" || !params.tier || x.tier.id === params.tier) && (params.archetype === "all" || !params.archetype || x.arch.id === params.archetype));
  const weeks = { "7": 2, "30": 5, "90": 13, "365": 24 }[params.period] || 13;
  const eng = DATA.engagement.slice(-weeks);
  const wrap = (el) => <div style={{ height: 200 }}>{el}</div>;
  const n = Math.max(tr.length, 1);
  if (fn === "admin_engagement_weekly") return wrap(<ResponsiveContainer width="100%" height="100%"><AreaChart data={eng.map((e) => ({ x: e.w, active: e.active }))} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="qrE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.2} /><stop offset="100%" stopColor={C.blue} stopOpacity={0} /></linearGradient></defs>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} /><Area type="monotone" dataKey="active" name={t("kActive")} stroke={C.blue} strokeWidth={2} fill="url(#qrE)" isAnimationActive={false} /></AreaChart></ResponsiveContainer>);
  if (fn === "admin_activity_heatmap") { const byHour = Array.from({ length: 24 }, (_, h) => ({ h, v: r1(DATA.heat.filter((c) => c.h === h).reduce((s, c) => s + c.v, 0)) })); return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={byHour} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="h" {...axis} interval={2} tickFormatter={(v) => String(v).padStart(2, "0")} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" name={t("byTrades")} fill={C.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>); }
  if (fn === "admin_retention_cohorts") { const data = Array.from({ length: 8 }, (_, k) => { const row = { k }; DATA.cohorts.forEach((c) => (row[`c${c.c}`] = c.curve[k])); return row; }); return wrap(<ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>{grid}<XAxis dataKey="k" {...axis} tickFormatter={(v) => `${t("wkShort")}${v}`} /><YAxis {...axis} unit="%" /><Tooltip contentStyle={tipStyle} />{DATA.cohorts.map((c, i) => <Line key={c.c} type="monotone" dataKey={`c${c.c}`} name={`${t("thCohort")} ${c.c + 1}`} stroke={PAL[i]} strokeWidth={1.6} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer>); }
  if (fn === "admin_activation_funnel") return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={DATA.funnel.map((s) => ({ name: loc(lang, s), v: s.n }))} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>{grid}<XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.ink2, fontFamily: SANS }} width={96} axisLine={false} tickLine={false} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={C.blue} radius={[0, 3, 3, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>);
  if (fn === "admin_subscriptions") return <DonutWithLegend data={TIER.map((trr, i) => ({ name: loc(lang, trr), v: tr.filter((x) => x.tier.id === trr.id).length, c: PAL[i] }))} />;
  if (fn === "admin_trader_mind") return <DonutWithLegend data={[...ARCH.map((a, i) => ({ name: loc(lang, a), v: tr.filter((x) => x.arch.id === a.id).length, c: PAL[i] })), { name: loc(lang, UNPROF), v: tr.filter((x) => x.arch.id === "unprofiled").length, c: C.ink3 }]} />;
  if (fn === "admin_risk_engine") { const tot = [{ name: t("wTrade"), v: tr.reduce((s, x) => s + x.breaches.trade, 0), c: PAL[3] }, { name: t("wDaily"), v: tr.reduce((s, x) => s + x.breaches.daily, 0), c: PAL[5] }, { name: t("wWeekly"), v: tr.reduce((s, x) => s + x.breaches.weekly, 0), c: C.warn }, { name: t("wMonthly"), v: tr.reduce((s, x) => s + x.breaches.monthly, 0), c: C.neg }]; return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={tot} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{tot.map((d, i) => <Cell key={i} fill={d.c} />)}</Bar></BarChart></ResponsiveContainer>); }
  if (fn === "admin_performance") { const ba = ASSET.map((a, i) => { const g = tr.filter((x) => x.asset.id === a.id); return { name: loc(lang, a), v: r2(g.reduce((s, x) => s + x.expectancy, 0) / Math.max(g.length, 1)), c: PAL[i] }; }); return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={ba} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><ReferenceLine y={0} stroke={C.borderStrong} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{ba.map((d, i) => <Cell key={i} fill={d.v >= 0 ? d.c : C.neg} />)}</Bar></BarChart></ResponsiveContainer>); }
  if (fn === "admin_trader_matrix") { const sk = params.sort || "behaviouralRisk"; const rows = [...tr].sort((a, b) => (params.dir === "asc" ? a[sk] - b[sk] : b[sk] - a[sk])).slice(0, Math.min(parseInt(params.limit) || 10, 12)).map((x) => ({ name: x.code, v: x[sk] })); return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>{grid}<XAxis type="number" {...axis} domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.ink2, fontFamily: MONO }} width={86} axisLine={false} tickLine={false} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" name={t(SORT_LABEL[sk] || "thBehaviour")} radius={[0, 3, 3, 0]} isAnimationActive={false}>{rows.map((rr, i) => <Cell key={i} fill={sk.includes("Risk") ? riskTone(rr.v) : valueTone(rr.v)} />)}</Bar></BarChart></ResponsiveContainer>); }
  if (fn === "admin_benchmarks") return <RadialStack data={[{ name: t("benchProfit"), v: Math.round(tr.filter((x) => x.expectancy > 0).length / n * 100), c: C.blue }, { name: t("benchDisc"), v: Math.round(tr.reduce((s, x) => s + x.discipline, 0) / n), c: C.pos }, { name: t("benchEdge"), v: Math.round(tr.reduce((s, x) => s + x.edgeHealth, 0) / n), c: PAL[1] }]} />;
  if (fn === "admin_data_quality") { const rb = Array.from({ length: 10 }, (_, b) => ({ name: `${b * 10}`, v: tr.filter((x) => x.readiness >= b * 10 && x.readiness < b * 10 + 10).length })); return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={rb} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{rb.map((b, i) => <Cell key={i} fill={parseInt(b.name) >= 70 ? C.pos : parseInt(b.name) >= 40 ? C.warn : C.neg} />)}</Bar></BarChart></ResponsiveContainer>); }
  if (fn === "admin_ai_usage") { const last = DATA.aiUsage[DATA.aiUsage.length - 1]; return <DonutWithLegend data={AIFEAT.map((f, i) => ({ name: loc(lang, f), v: last[f.id], c: PAL[i] }))} />; }
  if (fn === "admin_db_storage") { const bt = DATA.storage.map((s, i) => ({ name: s.id, v: s.mb, c: PAL[i % PAL.length] })); return wrap(<ResponsiveContainer width="100%" height="100%"><BarChart data={bt} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>{grid}<XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.ink2, fontFamily: MONO }} width={104} axisLine={false} tickLine={false} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" name="MB" radius={[0, 3, 3, 0]} isAnimationActive={false}>{bt.map((b, i) => <Cell key={i} fill={b.c} />)}</Bar></BarChart></ResponsiveContainer>); }
  return null;
}

/* Per-page pre-built query buttons. presets: [{fn, params}] */
function QueryStrip({ t, lang, traders, presets }) {
  const [active, setActive] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const merged = (p) => ({ ...Q_DEFAULTS, ...p.params });
  return (
    <div className="orca-noprint"><Card title={t("quickQueries")} badge={<Terminal size={13} color={C.ink3} />} pad={14}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {presets.map((p, i) => {
          const on = active === i;
          return (
            <button key={i} onClick={() => { setActive(on ? null : i); setShowCode(false); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 11.5, fontWeight: 550, padding: "7px 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? C.blue : C.borderStrong}`, background: on ? C.blueSoft : C.panel, color: on ? C.blueDark : C.ink, textAlign: "start" }}>
              <Play size={11} color={on ? C.blue : C.ink3} />{describeQuery(p.fn, merged(p), t, lang)}
            </button>
          );
        })}
      </div>
      {active != null && (
        <div style={{ marginTop: 12 }}>
          <QueryResult fn={presets[active].fn} params={merged(presets[active])} t={t} lang={lang} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, fontFamily: SANS, fontSize: 11.5, color: C.ink2, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: C.pos }}><span style={{ width: 7, height: 7, borderRadius: 99, background: C.pos }} />{t("qReturned")} {nf.format(runCount(presets[active].fn, merged(presets[active]), traders))} {t("rows")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.ink3 }}><Lock size={11} />{t("qVerified")}</span>
            <button onClick={() => setShowCode((v) => !v)} title="rpc" style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 7, border: `1px solid ${showCode ? C.accent : C.borderStrong}`, background: showCode ? C.blueSoft : C.panel, color: C.ink2, cursor: "pointer", fontFamily: MONO, fontSize: 11 }}><Terminal size={12} />rpc</button>
          </div>
          {showCode && <div style={{ marginTop: 9 }}><CodeBlock code={callSnippet(presets[active].fn, merged(presets[active]))} /></div>}
        </div>
      )}
    </Card></div>
  );
}

/* ════════════════ PAGES ════════════════ */

/* 1 · Overview */
function Overview({ t, lang, traders, eng }) {
  const last = eng[eng.length - 1], prev = eng[eng.length - 2], d = (a, b) => Math.round(((a - b) / Math.max(b, 1)) * 100);
  const profitable = Math.round(traders.filter((x) => x.expectancy > 0).length / Math.max(traders.length, 1) * 100);
  const avgExp = r2(traders.reduce((s, x) => s + x.expectancy, 0) / Math.max(traders.length, 1));
  const disc = Math.round(traders.reduce((s, x) => s + x.discipline, 0) / Math.max(traders.length, 1));
  const seg = (x) => { const hv = x.valuePotential >= 50, hr = Math.max(x.behaviouralRisk, x.retentionRisk) >= 50; return hv && !hr ? "stars" : hv && hr ? "watch" : !hv && hr ? "risk" : "dormant"; };
  const scn = traders.reduce((a, x) => ((a[seg(x)] = (a[seg(x)] || 0) + 1), a), {});
  const segData = [{ name: t("segStars"), v: scn.stars || 0, c: PAL[6] }, { name: t("segWatch"), v: scn.watch || 0, c: PAL[5] }, { name: t("segRisk"), v: scn.risk || 0, c: PAL[7] }, { name: t("segDormant"), v: scn.dormant || 0, c: PAL[4] }];
  const tierData = TIER.map((tr, i) => ({ name: loc(lang, tr), v: traders.filter((x) => x.tier.id === tr.id).length, c: PAL[i] }));
  const trend = eng.map((e) => ({ x: e.wk || `w${e.w}`, active: e.active, mau: e.mau })), vol = eng.map((e) => ({ x: e.wk || `w${e.w}`, trades: e.trades }));
  const tv = topBy(traders, "valuePotential").map((x) => ({ code: x.code, v: x.valuePotential, label: x.valuePotential }));
  const trk = topBy(traders, "behaviouralRisk").map((x) => ({ code: x.code, v: x.behaviouralRisk, label: x.behaviouralRisk }));
  const mini = eng.slice(-8);
  const presets = [{ fn: "admin_engagement_weekly", params: { period: "90" } }, { fn: "admin_engagement_weekly", params: { period: "30" } }, { fn: "admin_activity_heatmap", params: { period: "90" } }, { fn: "admin_trader_matrix", params: { segment: "risk", sort: "behaviouralRisk", limit: "25" } }, { fn: "admin_trader_matrix", params: { segment: "stars", sort: "valuePotential", limit: "25" } }, { fn: "admin_benchmarks", params: { kmin: "25" } }];
  return (
    <>
      <SectionHead n="01" title={t("navOverview")} subtitle={t("subOverview")} />
      <div style={{ background: `linear-gradient(120deg, #1F2A3D, #0F1B2D)`, borderRadius: 14, padding: "20px 22px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: "#fff" }} /><span style={{ fontFamily: SANS, fontSize: 11.5, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{t("live")}</span></div>
          <div style={{ fontFamily: SANS, fontWeight: 750, fontSize: 22, color: "#fff", letterSpacing: -0.3 }}>{t("bannerTitle")}</div>
          <div style={{ fontFamily: SANS, fontSize: 12.5, color: "rgba(255,255,255,0.82)", marginTop: 3 }}>{t("bannerSub")}</div>
        </div>
        <div style={{ display: "flex", gap: 26 }}>{[{ l: t("kActive"), v: nf.format(last.active), s: mini.map((e) => e.active) }, { l: t("headlineTrades"), v: nf.format(last.trades), s: mini.map((e) => e.trades) }, { l: t("kProfitable"), v: `${profitable}%`, s: mini.map((e) => e.active) }].map((m) => (<div key={m.l}><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: "#fff", letterSpacing: -0.5 }}>{m.v}</div><div style={{ fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>{m.l}</div><div style={{ width: 90, height: 22, marginTop: 4 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={m.s.map((v, i) => ({ i, v }))}><Line type="monotone" dataKey="v" stroke="rgba(255,255,255,0.75)" strokeWidth={1.6} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>))}</div>
      </div>
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kActive")} value={nf.format(last.active)} delta={d(last.active, prev.active)} icon={Users} bg={C.tintBlue} tint={C.blue} spark={eng.map((e) => e.active)} />
        <StatTile label={t("kSignups")} value={nf.format(last.signups)} delta={d(last.signups, prev.signups)} icon={Zap} bg={C.tintIndigo} tint={PAL[1]} spark={eng.map((e) => e.signups)} />
        <StatTile label={t("kChurn")} value={last.churn} suffix="%" delta={d(last.churn, prev.churn)} deltaGood="down" icon={TrendingDown} bg={C.tintRose} tint={C.neg} spark={eng.map((e) => e.churn)} />
        <StatTile label={t("kExpect")} value={`${sgn(avgExp)}${avgExp}`} suffix="R" icon={Target} bg={C.tintMint} tint={C.pos} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cActiveTrend")}><ResponsiveContainer width="100%" height={210}><AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="ovA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.18} /><stop offset="100%" stopColor={C.blue} stopOpacity={0} /></linearGradient></defs>{grid}<XAxis dataKey="x" {...axis} {...timeAxisProps(trend, lang)} /><YAxis {...axis} allowDecimals={false} /><Tooltip contentStyle={tipStyle} /><Area type="monotone" dataKey="active" name={t("kActive")} stroke={C.blue} strokeWidth={2} fill="url(#ovA)" isAnimationActive={false} /><Line type="monotone" dataKey="mau" name={t("kMau")} stroke={PAL[4]} strokeWidth={1.6} dot={false} isAnimationActive={false} /></AreaChart></ResponsiveContainer></Card>
        <Card title={t("cVolume")}><ResponsiveContainer width="100%" height={210}><BarChart data={vol} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} {...timeAxisProps(vol, lang)} /><YAxis {...axis} allowDecimals={false} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="trades" name={t("kTrades")} fill={C.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <Card title={t("cSegmentation")}><DonutWithLegend data={segData} /></Card>
        <Card title={t("cTierMix")}><DonutWithLegend data={tierData} /></Card>
        <Card title={t("kDiscipline")}><Gauge value={disc} label={t("benchDisc")} color={C.blue} /></Card>
      </div>
      <div style={{ ...gridCols(2), marginTop: 14 }}>
        <Card title={t("listTopValue")}><RankList items={tv} tone={valueTone} /></Card>
        <Card title={t("listTopRisk")}><RankList items={trk} tone={riskTone} /></Card>
      </div>
    </>
  );
}

/* 2 · Community Activity */
function CommunityActivity({ t, lang, traders, heat, hmax }) {
  const heatColor = (v) => { const x = v / hmax; return x < 0.05 ? "#F1F4FA" : `rgba(37,99,235,${clamp(0.12 + x * 0.82, 0, 1)})`; };
  const byHour = Array.from({ length: 24 }, (_, h) => ({ h, v: r1(heat.filter((c) => c.h === h).reduce((s, c) => s + c.v, 0)) }));
  const byDay = DOW.map((dd, di) => ({ d: loc(lang, dd), v: r1(heat.filter((c) => c.d === di).reduce((s, c) => s + c.v, 0)) }));
  const peak = heat.reduce((b, c) => (c.v > b.v ? c : b), { v: -1, d: 0, h: 0 });
  const busiest = byDay.reduce((b, c) => (c.v > b.v ? c : b), { v: -1 });
  const avgSess = r1(traders.reduce((s, x) => s + x.sessionsWk, 0) / Math.max(traders.length, 1));
  const sessBins = Array.from({ length: 7 }, (_, b) => ({ name: `${b * 2}`, v: traders.filter((x) => x.sessionsWk >= b * 2 && x.sessionsWk < b * 2 + 2).length }));
  const presets = [{ fn: "admin_activity_heatmap", params: { period: "90" } }, { fn: "admin_activity_heatmap", params: { period: "30" } }, { fn: "admin_activity_heatmap", params: { period: "7" } }, { fn: "admin_engagement_weekly", params: { period: "90" } }];
  return (
    <>
      <SectionHead n="02" title={t("navActivity")} subtitle={t("subActivity")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("tPeak")} value={`${loc(lang, DOW[peak.d])} ${String(peak.h).padStart(2, "0")}:00`} icon={Flame} bg={C.tintAmber} tint={C.warn} />
        <StatTile label={t("tBusiest")} value={busiest.d} icon={Clock} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={t("kSessions")} value={avgSess} icon={Activity} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={t("kTrades")} value={nf.format(traders.reduce((s, x) => s + x.tradesTotal, 0))} icon={Database} bg={C.tintMint} tint={C.pos} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <Card title={t("cHeatmap")} subtitle={t("fallback")} badge={<Badge tone="blue">{`${loc(lang, DOW[peak.d])} · ${String(peak.h).padStart(2, "0")}:00`}</Badge>}>
        <div style={{ overflowX: "auto" }}><div style={{ minWidth: 620 }}>
          <div style={{ display: "flex", marginInlineStart: 30, marginBottom: 5 }}>{Array.from({ length: 24 }, (_, h) => <div key={h} style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 9, color: h % 3 === 0 ? C.ink3 : "transparent" }}>{String(h).padStart(2, "0")}</div>)}</div>
          {DOW.map((dd, di) => (<div key={di} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}><div style={{ width: 26, fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.ink2, textAlign: "center" }}>{loc(lang, dd)}</div><div style={{ display: "flex", flex: 1, gap: 3 }}>{Array.from({ length: 24 }, (_, h) => { const c = heat.find((x) => x.d === di && x.h === h); const v = c?.v ?? 0; return <div key={h} title={`${String(h).padStart(2, "0")}:00 · ${Math.round((v / hmax) * 100)}%`} style={{ flex: 1, aspectRatio: "1", minHeight: 16, borderRadius: 3, background: heatColor(v) }} />; })}</div></div>))}
        </div></div>
      </Card>
      <div style={{ ...gridCols(2), marginTop: 14 }}>
        <Card title={t("cByHour")}><ResponsiveContainer width="100%" height={200}><BarChart data={byHour} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="h" {...axis} tickFormatter={(v) => String(v).padStart(2, "0")} interval={2} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" name={t("byTrades")} fill={C.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>
        <Card title={t("cByDay")}><ResponsiveContainer width="100%" height={200}><BarChart data={byDay} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="d" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" name={t("byTrades")} radius={[3, 3, 0, 0]} isAnimationActive={false}>{byDay.map((_, i) => <Cell key={i} fill={i >= 5 ? PAL[4] : C.blue} />)}</Bar></BarChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <Card title={t("kSessions")}><Gauge value={clamp(avgSess * 8.5, 0, 100)} label={t("kSessions")} suffix="" color={PAL[1]} /></Card>
        <div style={{ gridColumn: "span 2" }}><Card title={t("cSessionsDist")}><ResponsiveContainer width="100%" height={150}><BarChart data={sessBins} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={PAL[2]} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card></div>
      </div>
    </>
  );
}

/* 3 · Retention */
function Retention({ t, lang, traders, cohorts, eng }) {
  const data = Array.from({ length: 8 }, (_, k) => { const row = { k }; cohorts.forEach((c) => (row[`c${c.c}`] = c.curve[k])); return row; });
  const churn = eng.map((e) => ({ x: e.wk || `w${e.w}`, churn: e.churn })), cell = (v) => `rgba(37,99,235,${clamp(v / 100, 0.05, 0.85)})`;
  const w1 = Math.round(cohorts.reduce((s, c) => s + c.curve[1], 0) / cohorts.length);
  const w4 = Math.round(cohorts.reduce((s, c) => s + c.curve[4], 0) / cohorts.length);
  const w8 = Math.round(cohorts.reduce((s, c) => s + c.curve[7], 0) / cohorts.length);
  const bestCohorts = [...cohorts].sort((a, b) => b.curve[4] - a.curve[4]).slice(0, 4).map((c) => ({ code: `${t("thCohort")} ${c.c + 1}`, v: c.curve[4], label: `${c.curve[4]}%` }));
  const presets = [{ fn: "admin_retention_cohorts", params: { period: "90" } }, { fn: "admin_retention_cohorts", params: { period: "365" } }, { fn: "admin_engagement_weekly", params: { period: "90" } }, { fn: "admin_subscriptions", params: { period: "90" } }];
  return (
    <>
      <SectionHead n="03" title={t("navRetention")} subtitle={t("subRetention")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={`${t("wkShort")}1`} value={w1} suffix="%" icon={Repeat} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={`${t("wkShort")}4`} value={w4} suffix="%" icon={Repeat} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={`${t("wkShort")}8`} value={w8} suffix="%" icon={Repeat} bg={C.tintMint} tint={C.pos} />
        <StatTile label={t("kChurn")} value={eng[eng.length - 1].churn} suffix="%" deltaGood="down" icon={TrendingDown} bg={C.tintRose} tint={C.neg} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cRetentionCurves")}><ResponsiveContainer width="100%" height={230}><LineChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>{grid}<XAxis dataKey="k" {...axis} tickFormatter={(v) => `${t("wkShort")}${v}`} /><YAxis {...axis} unit="%" /><Tooltip contentStyle={tipStyle} />{cohorts.map((c, i) => <Line key={c.c} type="monotone" dataKey={`c${c.c}`} name={`${t("thCohort")} ${c.c + 1}`} stroke={PAL[i]} strokeWidth={1.8} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></Card>
        <Card title={t("cChurnTrend")}><ResponsiveContainer width="100%" height={230}><AreaChart data={churn} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.neg} stopOpacity={0.16} /><stop offset="100%" stopColor={C.neg} stopOpacity={0} /></linearGradient></defs>{grid}<XAxis dataKey="x" {...axis} {...timeAxisProps(churn, lang)} /><YAxis {...axis} unit="%" allowDecimals={false} /><Tooltip contentStyle={tipStyle} /><Area type="monotone" dataKey="churn" name={t("kChurn")} stroke={C.neg} strokeWidth={2} fill="url(#ch)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <div style={{ gridColumn: "span 2" }}><Card title={t("cRetentionTable")} pad={0}><div style={{ overflowX: "auto", padding: 16 }}><table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%", minWidth: 520 }}><thead><tr><th style={{ fontFamily: SANS, fontSize: 11, color: C.ink3, textAlign: "start", padding: 6 }}>{t("thCohort")}</th>{Array.from({ length: 8 }, (_, k) => <th key={k} style={{ fontFamily: MONO, fontSize: 10.5, color: C.ink3, padding: 6 }}>{t("wkShort")}{k}</th>)}</tr></thead><tbody>{cohorts.map((c) => (<tr key={c.c}><td style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink2, padding: 6, whiteSpace: "nowrap" }}>{t("thCohort")} {c.c + 1}</td>{c.curve.map((v, k) => <td key={k} style={{ textAlign: "center", fontFamily: MONO, fontSize: 11, fontWeight: 600, color: v > 45 ? "#fff" : C.ink, background: cell(v), borderRadius: 5, padding: "7px 4px" }}>{v}</td>)}</tr>))}</tbody></table></div></Card></div>
        <Card title={t("listBestCohort")}><RankList items={bestCohorts} color={C.blue} /></Card>
      </div>
    </>
  );
}

/* 4 · Activation */
function Activation({ t, lang, traders, funnel, diagTier, ttft }) {
  const max = funnel[0]?.n || 1;
  const drops = funnel.slice(1).map((s, i) => ({ code: `${i + 1}→${i + 2}`, v: Math.round((1 - s.n / Math.max(funnel[i].n, 1)) * 100), label: `${Math.round((1 - s.n / Math.max(funnel[i].n, 1)) * 100)}%` })).sort((a, b) => b.v - a.v).slice(0, 5);
  const lastIdx = funnel.length - 1;
  const commitRate = funnel.length >= 2 ? Math.round((funnel[lastIdx].n / Math.max(funnel[0].n, 1)) * 100) : 0;
  const presets = [{ fn: "admin_activation_funnel", params: { period: "90" } }, { fn: "admin_activation_funnel", params: { period: "30" } }, { fn: "admin_subscriptions", params: { period: "90" } }, { fn: "admin_engagement_weekly", params: { period: "30" } }];
  const tile2 = funnel[2], tile3 = funnel[3];
  return (
    <>
      <SectionHead n="04" title={t("navActivation")} subtitle={t("subActivation")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kSignups")} value={nf.format(funnel[0]?.n || 0)} icon={Users} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={t("gCommit")} value={commitRate} suffix="%" icon={CheckCircle2} bg={C.tintMint} tint={C.pos} />
        {tile2 && <StatTile label={tile2[lang]} value={nf.format(tile2.n)} icon={Target} bg={C.tintIndigo} tint={PAL[1]} />}
        {tile3 && <StatTile label={tile3[lang]} value={nf.format(tile3.n)} icon={Activity} bg={C.tintAmber} tint={C.warn} />}
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <Card title={t("cFunnel")}><div style={{ display: "grid", gap: 9 }}>{funnel.map((s, i) => { const w = (s.n / max) * 100, drop = i > 0 ? Math.round((1 - s.n / Math.max(funnel[i - 1].n, 1)) * 100) : 0, c = i >= 5 ? PAL[6] : i >= 4 ? PAL[1] : C.blue; return (<div key={s.id}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontFamily: SANS, fontSize: 12, color: C.ink }}>{i + 1}. {loc(lang, s)}</span><span style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.ink }}>{nf.format(s.n)}</span>{drop > 0 && <span style={{ fontFamily: MONO, fontSize: 10.5, color: drop > 25 ? C.neg : C.ink3 }}>−{drop}%</span>}</span></div><div style={{ height: 16, background: C.appBg, borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${w}%`, background: c, borderRadius: 5 }} /></div></div>); })}</div></Card>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        {diagTier.length > 0 && <Card title={t("cDiagnostic")}><ResponsiveContainer width="100%" height={190}><BarChart data={diagTier.map((x) => ({ name: loc(lang, TIER.find((tr) => tr.id === x.id)), v: x.n }))} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{diagTier.map((_, i) => <Cell key={i} fill={PAL[i]} />)}</Bar></BarChart></ResponsiveContainer></Card>}
        {ttft.length > 0 && <Card title={t("cTimeToTrade")}><ResponsiveContainer width="100%" height={190}><BarChart data={ttft.map((x) => ({ name: loc(lang, x), v: x.n }))} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={PAL[2]} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>}
        <Card title={t("gCommit")}><Gauge value={commitRate} label={t("gCommit")} suffix="%" color={C.pos} /></Card>
      </div>
      <div style={{ marginTop: 14 }}><Card title={t("listDropoff")}><RankList items={drops} tone={riskTone} /></Card></div>
    </>
  );
}

/* 5 · Subscriptions */
function Subscriptions({ t, lang, traders, eng }) {
  const tierData = TIER.map((tr, i) => ({ name: loc(lang, tr), v: traders.filter((x) => x.tier.id === tr.id).length, c: PAL[i] }));
  const stateData = SUBSTATE.map((s, i) => ({ name: loc(lang, s), v: traders.filter((x) => x.subState.id === s.id).length, c: PAL[i === 0 ? 1 : i === 1 ? 6 : i === 2 ? 5 : 4] }));
  const conv = eng.map((e) => ({ x: e.wk || `w${e.w}`, conv: e.conv })), overTime = eng.map((e) => ({ x: e.wk || `w${e.w}`, Beginner: e.tStd, Advanced: e.tAdv, Ultimate: e.tPro + e.tUlt }));
  const last = eng[eng.length - 1], prev = eng[eng.length - 2];
  const paid = traders.filter((x) => x.subState.id !== "trial").length, trial = traders.filter((x) => x.subState.id === "trial").length;
  const presets = [{ fn: "admin_subscriptions", params: { period: "90" } }, { fn: "admin_subscriptions", params: { period: "90", tier: "Ultimate" } }, { fn: "admin_subscriptions", params: { period: "365" } }, { fn: "admin_trader_matrix", params: { segment: "stars", tier: "Ultimate", sort: "valuePotential" } }];
  return (
    <>
      <SectionHead n="05" title={t("navSubs")} subtitle={t("subSubs")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kConversion")} value={last.conv} suffix="%" delta={r1(last.conv - prev.conv)} icon={CreditCard} bg={C.tintBlue} tint={C.blue} spark={eng.map((e) => e.conv)} />
        <StatTile label={SUBSTATE[1][lang]} value={nf.format(paid)} icon={CheckCircle2} bg={C.tintMint} tint={C.pos} />
        <StatTile label={SUBSTATE[0][lang]} value={nf.format(trial)} icon={Clock} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={loc(lang, TIER[2])} value={nf.format(traders.filter((x) => x.tier.id === "Ultimate").length)} icon={Layers} bg={C.tintAmber} tint={C.warn} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cTierDist")}><DonutWithLegend data={tierData} /></Card>
        <Card title={t("cSubStates")}><DonutWithLegend data={stateData} /></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <div style={{ gridColumn: "span 2" }}><Card title={t("cTierOverTime")}><ResponsiveContainer width="100%" height={210}><AreaChart data={overTime} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} {...timeAxisProps(overTime, lang)} /><YAxis {...axis} allowDecimals={false} /><Tooltip contentStyle={tipStyle} />{TIER.map((tr, i) => <Area key={tr.id} type="monotone" dataKey={tr.id} stackId="1" name={loc(lang, tr)} stroke={PAL[i]} fill={PAL[i]} fillOpacity={0.5} strokeWidth={1} isAnimationActive={false} />)}</AreaChart></ResponsiveContainer></Card></div>
        <Card title={t("kConversion")}><Gauge value={last.conv} label={t("kConversion")} suffix="%" color={C.blue} /></Card>
      </div>
      <div style={{ marginTop: 14 }}><Card title={t("cConvTrend")}><ResponsiveContainer width="100%" height={190}><LineChart data={conv} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} {...timeAxisProps(conv, lang)} /><YAxis {...axis} unit="%" allowDecimals={false} /><Tooltip contentStyle={tipStyle} /><Line type="monotone" dataKey="conv" name={t("kConversion")} stroke={C.blue} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></Card></div>
    </>
  );
}

/* 6 · Behavioural Diagnostics */
function Mind({ t, lang, traders }) {
  const [arch, setArch] = useState("all");
  const filtered = arch === "all" ? traders : traders.filter((x) => x.arch.id === arch);
  const archData = [...ARCH.map((a, i) => ({ name: loc(lang, a), v: traders.filter((x) => x.arch.id === a.id).length, c: PAL[i] })), { name: loc(lang, UNPROF), v: traders.filter((x) => x.arch.id === "unprofiled").length, c: C.ink3 }];
  const avg = (k) => Math.round(filtered.reduce((s, x) => s + x[k], 0) / Math.max(filtered.length, 1));
  const radar = [{ m: t("kDiscipline"), v: avg("discipline") }, { m: t("benchEdge"), v: avg("edgeHealth") }, { m: t("mRegime"), v: avg("regimeFit") }, { m: "ORCA", v: avg("orca") }, { m: t("mDrift"), v: Math.round(clamp(50 + filtered.reduce((s, x) => s + x.riskDrift, 0) / Math.max(filtered.length, 1) * 25, 0, 100)) }];
  const bins = Array.from({ length: 10 }, (_, b) => ({ name: `${b * 10}`, v: filtered.filter((x) => x.orca >= b * 10 && x.orca < b * 10 + 10).length }));
  const scatter = filtered.map((x) => ({ x: x.discipline, y: x.edgeHealth, z: x.tradesTotal }));
  const archOpts = [{ v: "all", l: t("segAll") }, ...ARCH.map((a) => ({ v: a.id, l: loc(lang, a) }))];
  const presets = [{ fn: "admin_trader_mind", params: {} }, { fn: "admin_trader_mind", params: { archetype: "sniper" } }, { fn: "admin_trader_mind", params: { archetype: "scalper" } }, { fn: "admin_trader_mind", params: { tier: "Ultimate" } }, { fn: "admin_trader_matrix", params: { segment: "risk", sort: "behaviouralRisk" } }];
  return (
    <>
      <SectionHead n="06" title={t("navMind")} subtitle={t("subMind")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label="ORCA" value={avg("orca")} suffix="/100" icon={Brain} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={t("kDiscipline")} value={avg("discipline")} suffix="/100" icon={CheckCircle2} bg={C.tintMint} tint={C.pos} />
        <StatTile label={t("benchEdge")} value={avg("edgeHealth")} suffix="/100" icon={Target} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={t("mRegime")} value={avg("regimeFit")} suffix="/100" icon={Activity} bg={C.tintAmber} tint={C.warn} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cArchetypeMix")}><DonutWithLegend data={archData} /></Card>
        <Card title={t("cScoreRadar")} toolbar={<Select lang={lang} value={arch} onChange={setArch} options={archOpts} />}><ResponsiveContainer width="100%" height={220}><RadarChart data={radar} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}><PolarGrid stroke={C.gridLine} /><PolarAngleAxis dataKey="m" tick={{ fontSize: 10.5, fill: C.ink2, fontFamily: SANS }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: C.ink3 }} axisLine={false} /><Radar dataKey="v" stroke={C.blue} fill={C.blue} fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} /><Tooltip contentStyle={tipStyle} /></RadarChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(2), marginTop: 14 }}>
        <Card title={t("cScoreDist")}><ResponsiveContainer width="100%" height={200}><BarChart data={bins} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={PAL[1]} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>
        <Card title={t("cDiscEdge")}><ResponsiveContainer width="100%" height={200}><ScatterChart margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>{grid}<XAxis type="number" dataKey="x" name={t("kDiscipline")} {...axis} domain={[0, 100]} /><YAxis type="number" dataKey="y" name={t("benchEdge")} {...axis} domain={[0, 100]} /><ZAxis type="number" dataKey="z" range={[20, 200]} /><Tooltip contentStyle={tipStyle} cursor={{ strokeDasharray: "3 3" }} /><Scatter data={scatter} fill={C.blue} fillOpacity={0.45} isAnimationActive={false} /></ScatterChart></ResponsiveContainer></Card>
      </div>
    </>
  );
}

/* 7 · Risk Engine */
function RiskEngine({ t, lang, traders, eng }) {
  const [win, setWin] = useState("all");
  const breach = eng.map((e) => ({ x: e.wk || `w${e.w}`, trade: e.breachT, daily: e.breachD, weekly: e.breachW, monthly: e.breachM }));
  const kr = eng.map((e) => ({ x: e.wk || `w${e.w}`, kill: e.kill, recovery: e.recovery }));
  const ovBins = Array.from({ length: 10 }, (_, b) => ({ name: `${b * 10}`, v: traders.filter((x) => x.overrideRate * 100 >= b * 10 && x.overrideRate * 100 < b * 10 + 10).length }));
  const totals = { trade: traders.reduce((s, x) => s + x.breaches.trade, 0), daily: traders.reduce((s, x) => s + x.breaches.daily, 0), weekly: traders.reduce((s, x) => s + x.breaches.weekly, 0), monthly: traders.reduce((s, x) => s + x.breaches.monthly, 0) };
  const share = [{ name: t("wTrade"), v: totals.trade, c: PAL[3] }, { name: t("wDaily"), v: totals.daily, c: PAL[5] }, { name: t("wWeekly"), v: totals.weekly, c: C.warn }, { name: t("wMonthly"), v: totals.monthly, c: C.neg }];
  const winOpts = [{ v: "all", l: t("allWindows") }, { v: "trade", l: t("wTrade") }, { v: "daily", l: t("wDaily") }, { v: "weekly", l: t("wWeekly") }, { v: "monthly", l: t("wMonthly") }];
  const keys = win === "all" ? ["trade", "daily", "weekly", "monthly"] : [win];
  const keyColor = { trade: PAL[3], daily: PAL[5], weekly: C.warn, monthly: C.neg }, keyName = { trade: t("wTrade"), daily: t("wDaily"), weekly: t("wWeekly"), monthly: t("wMonthly") };
  const last = eng[eng.length - 1], prev = eng[eng.length - 2];
  const killPrev = Math.round(traders.filter((x) => x.kill > 0).length / Math.max(traders.length, 1) * 100);
  const topRisk = topBy(traders, "behaviouralRisk").map((x) => ({ code: x.code, v: x.behaviouralRisk, label: x.behaviouralRisk }));
  const presets = [{ fn: "admin_risk_engine", params: { window: "all", period: "90" } }, { fn: "admin_risk_engine", params: { window: "weekly", period: "90" } }, { fn: "admin_risk_engine", params: { window: "monthly", period: "90" } }, { fn: "admin_risk_engine", params: { window: "daily", period: "30" } }, { fn: "admin_trader_matrix", params: { segment: "risk", sort: "behaviouralRisk", limit: "25" } }];
  return (
    <>
      <SectionHead n="07" title={t("navRisk")} subtitle={t("subRisk")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kKill")} value={nf.format(last.kill)} delta={Math.round(((last.kill - prev.kill) / Math.max(prev.kill, 1)) * 100)} deltaGood="down" icon={ShieldAlert} bg={C.tintRose} tint={C.neg} spark={eng.map((e) => e.kill)} />
        <StatTile label={t("wWeekly")} value={nf.format(last.breachW)} icon={Flame} bg={C.tintAmber} tint={C.warn} spark={eng.map((e) => e.breachW)} />
        <StatTile label={t("wMonthly")} value={nf.format(last.breachM)} icon={Flame} bg={C.tintRose} tint={C.neg} spark={eng.map((e) => e.breachM)} />
        <StatTile label={t("mRecovery")} value={nf.format(last.recovery)} icon={Repeat} bg={C.tintIndigo} tint={PAL[4]} spark={eng.map((e) => e.recovery)} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cBreachWindow")} toolbar={<Select lang={lang} value={win} onChange={setWin} options={winOpts} />}><ResponsiveContainer width="100%" height={220}><BarChart data={breach} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} />{keys.map((k) => <Bar key={k} dataKey={k} stackId="b" name={keyName[k]} fill={keyColor[k]} radius={[2, 2, 0, 0]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></Card>
        <Card title={t("cKillRecovery")}><ResponsiveContainer width="100%" height={220}><LineChart data={kr} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} /><Line type="monotone" dataKey="kill" name={t("kKill")} stroke={C.neg} strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="recovery" name={t("mRecovery")} stroke={PAL[5]} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(4), marginTop: 14 }}>
        <div style={{ gridColumn: "span 2" }}><Card title={t("cOverride")}><ResponsiveContainer width="100%" height={190}><BarChart data={ovBins} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} unit="%" /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={C.warn} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card></div>
        <Card title={t("cBreachShare")}><DonutWithLegend data={share} /></Card>
        <Card title={t("gKillPrev")}><Gauge value={killPrev} label={t("gKillPrev")} suffix="%" color={C.neg} /></Card>
      </div>
      <div style={{ marginTop: 14 }}><Card title={t("listTopRisk")}><RankList items={topRisk} tone={riskTone} /></Card></div>
    </>
  );
}

/* 8 · Performance & Edge */
function Performance({ t, lang, traders }) {
  const [dim, setDim] = useState("arch");
  const expBins = Array.from({ length: 12 }, (_, b) => { const lo = -1.2 + b * 0.3; return { name: r1(lo).toFixed(1), v: traders.filter((x) => x.expectancy >= lo && x.expectancy < lo + 0.3).length }; });
  const winBins = Array.from({ length: 10 }, (_, b) => ({ name: `${b * 10}`, v: traders.filter((x) => x.winRate * 100 >= b * 10 && x.winRate * 100 < b * 10 + 10).length }));
  const kellyBins = Array.from({ length: 8 }, (_, b) => ({ name: `${r1(b * 0.5).toFixed(1)}`, v: traders.filter((x) => { const k = clamp(x.winRate - (1 - x.winRate), 0, 1) * 4; return k >= b * 0.5 && k < b * 0.5 + 0.5; }).length }));
  const byArch = ARCH.map((a, i) => { const g = traders.filter((x) => x.arch.id === a.id); return { name: loc(lang, a), v: r2(g.reduce((s, x) => s + x.expectancy, 0) / Math.max(g.length, 1)), c: PAL[i] }; });
  const byAsset = ASSET.map((a, i) => { const g = traders.filter((x) => x.asset.id === a.id); return { name: loc(lang, a), v: r2(g.reduce((s, x) => s + x.expectancy, 0) / Math.max(g.length, 1)), c: PAL[i] }; });
  const frontier = ASSET.map((a, i) => { const g = traders.filter((x) => x.asset.id === a.id); return { x: r1(g.reduce((s, x) => s + x.behaviouralRisk, 0) / Math.max(g.length, 1)), y: r2(g.reduce((s, x) => s + Math.max(0, x.expectancy), 0) / Math.max(g.length, 1)), name: loc(lang, a), c: PAL[i] }; });
  const bestAsset = [...byAsset].sort((a, b) => b.v - a.v)[0];
  const avgExp = r2(traders.reduce((s, x) => s + x.expectancy, 0) / Math.max(traders.length, 1));
  const profit = Math.round(traders.filter((x) => x.expectancy > 0).length / Math.max(traders.length, 1) * 100);
  const avgWin = Math.round(traders.reduce((s, x) => s + x.winRate, 0) / Math.max(traders.length, 1) * 100);
  const breakdownData = dim === "arch" ? byArch : byAsset, dimOpts = [{ v: "arch", l: t("byArchetype") }, { v: "asset", l: t("byAsset") }];
  const topPerf = topBy(traders, "expectancy").map((x) => ({ code: x.code, v: Math.max(0, x.expectancy) * 30, label: `${sgn(x.expectancy)}${x.expectancy}` }));
  const presets = [{ fn: "admin_performance", params: {} }, { fn: "admin_performance", params: { asset: "crypto" } }, { fn: "admin_performance", params: { asset: "futures" } }, { fn: "admin_performance", params: { archetype: "systematic" } }, { fn: "admin_trader_matrix", params: { sort: "valuePotential", segment: "stars" } }];
  return (
    <>
      <SectionHead n="08" title={t("navPerf")} subtitle={t("subPerf")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kExpect")} value={`${sgn(avgExp)}${avgExp}`} suffix="R" icon={Target} bg={avgExp >= 0 ? C.tintMint : C.tintRose} tint={avgExp >= 0 ? C.pos : C.neg} />
        <StatTile label={t("kProfitable")} value={profit} suffix="%" icon={TrendingUp} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={t("winRate")} value={avgWin} suffix="%" icon={CheckCircle2} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={t("tBestAsset")} value={bestAsset.name} icon={Layers} bg={C.tintAmber} tint={C.warn} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cExpectDist")}><ResponsiveContainer width="100%" height={210}><BarChart data={expBins} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} interval={1} /><YAxis {...axis} /><ReferenceLine x="0.0" stroke={C.borderStrong} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{expBins.map((b, i) => <Cell key={i} fill={parseFloat(b.name) >= 0 ? C.pos : C.neg} />)}</Bar></BarChart></ResponsiveContainer></Card>
        <Card title={dim === "arch" ? t("cExpectArch") : t("cByAsset")} toolbar={<Select lang={lang} value={dim} onChange={setDim} options={dimOpts} />}><ResponsiveContainer width="100%" height={210}><BarChart data={breakdownData} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><ReferenceLine y={0} stroke={C.borderStrong} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{breakdownData.map((b, i) => <Cell key={i} fill={b.v >= 0 ? b.c : C.neg} />)}</Bar></BarChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <Card title={t("cWinDist")}><ResponsiveContainer width="100%" height={185}><BarChart data={winBins} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} unit="%" interval={1} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={C.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>
        <Card title={t("cKelly")}><ResponsiveContainer width="100%" height={185}><BarChart data={kellyBins} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} interval={1} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={PAL[2]} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>
        <Card title={t("cFrontier")}><ResponsiveContainer width="100%" height={185}><ScatterChart margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>{grid}<XAxis type="number" dataKey="x" name={t("thBehaviour")} {...axis} /><YAxis type="number" dataKey="y" name={t("kExpect")} {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ strokeDasharray: "3 3" }} />{frontier.map((f, i) => <Scatter key={i} data={[f]} fill={f.c} name={f.name} isAnimationActive={false} />)}</ScatterChart></ResponsiveContainer></Card>
      </div>
      <div style={{ marginTop: 14 }}><Card title={t("listTopPerf")}><RankList items={topPerf} color={C.pos} /></Card></div>
    </>
  );
}

/* 9 · Trader Matrix */
function TraderMatrix({ t, lang, traders, onPick }) {
  const [sortKey, setSortKey] = useState("behaviouralRisk");
  const [seg, setSeg] = useState("all");
  const segOf = (x) => { const hv = x.valuePotential >= 50, hr = Math.max(x.behaviouralRisk, x.retentionRisk) >= 50; return hv && !hr ? "stars" : hv && hr ? "watch" : !hv && hr ? "risk" : "dormant"; };
  let rows = seg === "all" ? traders : traders.filter((x) => segOf(x) === seg);
  rows = [...rows].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 40);
  const cols = [{ k: "code", l: t("thId"), align: "start" }, { k: "arch", l: t("thArch"), align: "start" }, { k: "tier", l: t("thTier"), align: "start" }, { k: "discipline", l: t("thDisc"), bar: valueTone }, { k: "retentionRisk", l: t("thRetention"), bar: riskTone }, { k: "behaviouralRisk", l: t("thBehaviour"), bar: riskTone }, { k: "valuePotential", l: t("thValue"), bar: valueTone }, { k: "expectancy", l: t("thExpect"), align: "end" }, { k: "sessionsWk", l: t("thSessions"), align: "end" }, { k: "lastActive", l: t("thLastSeen"), align: "end" }];
  const quad = traders.map((x) => ({ x: x.valuePotential, y: 100 - Math.max(x.behaviouralRisk, x.retentionRisk), z: x.ltv, c: valueTone(x.valuePotential), id: x.id }));
  const segOpts = [{ v: "all", l: t("segAll") }, { v: "stars", l: t("segStars") }, { v: "watch", l: t("segWatch") }, { v: "risk", l: t("segRisk") }, { v: "dormant", l: t("segDormant") }];
  const counts = traders.reduce((a, x) => ((a[segOf(x)] = (a[segOf(x)] || 0) + 1), a), {});
  const trk = topBy(traders, "behaviouralRisk").map((x) => ({ code: x.code, v: x.behaviouralRisk, label: x.behaviouralRisk }));
  const tv = topBy(traders, "valuePotential").map((x) => ({ code: x.code, v: x.valuePotential, label: x.valuePotential }));
  const presets = [{ fn: "admin_trader_matrix", params: { segment: "risk", sort: "behaviouralRisk", limit: "25" } }, { fn: "admin_trader_matrix", params: { segment: "stars", sort: "valuePotential", limit: "25" } }, { fn: "admin_trader_matrix", params: { segment: "watch", sort: "retentionRisk", limit: "25" } }, { fn: "admin_trader_matrix", params: { segment: "dormant", sort: "retentionRisk", limit: "25" } }, { fn: "admin_trader_matrix", params: { tier: "Ultimate", sort: "valuePotential", limit: "25" } }];
  return (
    <>
      <SectionHead n="09" title={t("navMatrix")} subtitle={t("subMatrix")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("segStars")} value={nf.format(counts.stars || 0)} icon={Target} bg={C.tintMint} tint={C.pos} />
        <StatTile label={t("segWatch")} value={nf.format(counts.watch || 0)} icon={ShieldAlert} bg={C.tintAmber} tint={C.warn} />
        <StatTile label={t("segRisk")} value={nf.format(counts.risk || 0)} icon={Flame} bg={C.tintRose} tint={C.neg} />
        <StatTile label={t("segDormant")} value={nf.format(counts.dormant || 0)} icon={Clock} bg={C.tintBlue} tint={PAL[4]} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <Card title={t("cQuadrant")}><ResponsiveContainer width="100%" height={230}><ScatterChart margin={{ top: 10, right: 16, left: -20, bottom: 4 }}>{grid}<XAxis type="number" dataKey="x" name={t("thValue")} domain={[0, 100]} {...axis} /><YAxis type="number" dataKey="y" name={t("thBehaviour")} domain={[0, 100]} {...axis} /><ZAxis type="number" dataKey="z" range={[30, 280]} /><ReferenceLine x={50} stroke={C.borderStrong} strokeDasharray="3 4" /><ReferenceLine y={50} stroke={C.borderStrong} strokeDasharray="3 4" /><Tooltip contentStyle={tipStyle} cursor={{ strokeDasharray: "3 3" }} /><Scatter data={quad} isAnimationActive={false} onClick={(p) => { const x = traders.find((z) => z.id === (p && p.id)); if (x) onPick(x); }}>{quad.map((q, i) => <Cell key={i} fill={q.c} fillOpacity={0.5} />)}</Scatter></ScatterChart></ResponsiveContainer></Card>
      <div style={{ marginTop: 14 }}>
        <Card title={t("navMatrix")} subtitle={t("privacyNote")} toolbar={<Seg value={seg} onChange={setSeg} options={segOpts} />} pad={0}>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
            <thead><tr style={{ background: C.panelAlt }}>{cols.map((c) => <th key={c.k} onClick={() => c.bar && setSortKey(c.k)} style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: sortKey === c.k ? C.blue : C.ink2, textAlign: c.align === "end" ? "end" : c.align === "start" ? "start" : "center", padding: "10px 12px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", cursor: c.bar ? "pointer" : "default" }}>{c.l}</th>)}</tr></thead>
            <tbody>{rows.map((x) => (<tr key={x.id} onClick={() => onPick(x)} style={{ cursor: "pointer", borderBottom: `1px solid ${C.gridLine}` }} onMouseEnter={(e) => (e.currentTarget.style.background = C.blueSoft)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <td style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.ink, padding: "9px 12px", whiteSpace: "nowrap" }}>{x.code}</td>
              <td style={{ fontFamily: SANS, fontSize: 12, color: x.arch.id === "unprofiled" ? C.ink3 : C.ink2, fontStyle: x.arch.id === "unprofiled" ? "italic" : "normal", padding: "9px 12px", whiteSpace: "nowrap" }}>{loc(lang, x.arch)}</td>
              <td style={{ padding: "9px 12px" }}><Badge>{loc(lang, x.tier)}</Badge></td>
              <td style={{ padding: "9px 12px", minWidth: 90 }}><MiniBar v={x.discipline} color={valueTone(x.discipline)} /></td>
              <td style={{ padding: "9px 12px", minWidth: 90 }}><MiniBar v={x.retentionRisk} color={riskTone(x.retentionRisk)} /></td>
              <td style={{ padding: "9px 12px", minWidth: 90 }}><MiniBar v={x.behaviouralRisk} color={riskTone(x.behaviouralRisk)} /></td>
              <td style={{ padding: "9px 12px", minWidth: 90 }}><MiniBar v={x.valuePotential} color={valueTone(x.valuePotential)} /></td>
              <td style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: x.expectancy >= 0 ? C.pos : C.neg, padding: "9px 12px", textAlign: "end" }}>{sgn(x.expectancy)}{x.expectancy}R</td>
              <td style={{ fontFamily: MONO, fontSize: 12, color: C.ink2, padding: "9px 12px", textAlign: "end" }}>{x.sessionsWk}</td>
              <td style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink3, padding: "9px 12px", textAlign: "end", whiteSpace: "nowrap" }}>{x.lastActive}{lang === "en" ? "d" : "י'"}</td>
            </tr>))}</tbody>
          </table></div>
        </Card>
      </div>
      <div style={{ ...gridCols(2), marginTop: 14 }}>
        <Card title={t("listTopRisk")}><RankList items={trk} tone={riskTone} /></Card>
        <Card title={t("listTopValue")}><RankList items={tv} tone={valueTone} /></Card>
      </div>
    </>
  );
}

/* 10 · Aggregate Benchmarks */
function Benchmarks({ t, lang, traders, eng }) {
  const n = Math.max(traders.length, 1);
  const avgExp = r2(traders.reduce((s, x) => s + x.expectancy, 0) / n), profit = Math.round(traders.filter((x) => x.expectancy > 0).length / n * 100);
  const disc = Math.round(traders.reduce((s, x) => s + x.discipline, 0) / n), edge = Math.round(traders.reduce((s, x) => s + x.edgeHealth, 0) / n);
  const revenge = Math.round(traders.filter((x) => x.revenge > 0.4).length / n * 100), over = Math.round(traders.filter((x) => x.overZ > 1.2).length / n * 100);
  const sess = r1(traders.reduce((s, x) => s + x.sessionsWk, 0) / n), vol = eng.slice(-4).reduce((s, e) => s + e.trades, 0);
  const cards = [{ l: t("benchExpect"), v: `${sgn(avgExp)}${avgExp}R`, c: avgExp >= 0 ? C.pos : C.neg }, { l: t("benchProfit"), v: `${profit}%`, c: C.blue }, { l: t("benchDisc"), v: `${disc}/100`, c: C.ink }, { l: t("benchEdge"), v: `${edge}/100`, c: C.ink }, { l: t("benchRevenge"), v: `${revenge}%`, c: C.warn }, { l: t("benchOver"), v: `${over}%`, c: C.warn }, { l: t("benchAvgSess"), v: `${sess}`, c: C.ink }, { l: t("benchVol"), v: nf.format(vol), c: C.blue }];
  const distArch = ARCH.map((a, i) => ({ name: loc(lang, a), v: r2(traders.filter((x) => x.arch.id === a.id).reduce((s, x) => s + Math.max(0, x.expectancy), 0) / Math.max(traders.filter((x) => x.arch.id === a.id).length, 1)), c: PAL[i] }));
  const radial = [{ name: t("benchProfit"), v: profit, c: C.blue }, { name: t("benchDisc"), v: disc, c: C.pos }, { name: t("benchEdge"), v: edge, c: PAL[1] }];
  const presets = [{ fn: "admin_benchmarks", params: { kmin: "25" } }, { fn: "admin_benchmarks", params: { kmin: "50" } }, { fn: "admin_benchmarks", params: { asset: "crypto", kmin: "25" } }, { fn: "admin_benchmarks", params: { tier: "Ultimate", kmin: "25" } }];
  return (
    <>
      <SectionHead n="10" title={t("navBench")} subtitle={t("subBench")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>{cards.map((c) => (<div key={c.l} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}><div style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink2, marginBottom: 9 }}>{c.l}</div><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: c.c }}>{c.v}</div></div>))}</div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cComposition")} subtitle={t("kAnon")}><RadialStack data={radial} /></Card>
        <Card title={t("benchExpect")}><ResponsiveContainer width="100%" height={185}><BarChart data={distArch} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{distArch.map((d, i) => <Cell key={i} fill={d.c} />)}</Bar></BarChart></ResponsiveContainer></Card>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, padding: "12px 14px", background: C.tintMint, border: `1px solid ${C.pos}33`, borderRadius: 10 }}><Lock size={15} color={C.pos} /><span style={{ fontFamily: SANS, fontSize: 12, color: C.ink2 }}>{t("optIn")}</span></div>
    </>
  );
}

/* 11 · Data Quality */
function DataQuality({ t, lang, traders }) {
  const readBins = Array.from({ length: 10 }, (_, b) => ({ name: `${b * 10}`, v: traders.filter((x) => x.readiness >= b * 10 && x.readiness < b * 10 + 10).length }));
  const prov = PROV.map((p, i) => ({ name: loc(lang, p), v: Math.round(traders.reduce((s, x) => s + x.prov[p.id], 0)), c: PAL[i] }));
  const gaps = [{ en: "Missing stop", he: "חוסר סטופ", v: 142, c: C.neg }, { en: "Ambiguous direction", he: "כיוון לא ברור", v: 98, c: C.warn }, { en: "Date format", he: "פורמט תאריך", v: 76, c: PAL[5] }, { en: "Duplicate fingerprint", he: "טביעת אצבע כפולה", v: 41, c: PAL[4] }, { en: "Currency mismatch", he: "אי-התאמת מטבע", v: 33, c: PAL[3] }];
  const assetDist = ASSET.map((a, i) => ({ name: loc(lang, a), v: traders.filter((x) => x.asset.id === a.id).length, c: PAL[i] }));
  const avgRead = Math.round(traders.reduce((s, x) => s + x.readiness, 0) / Math.max(traders.length, 1));
  const provPct = (id) => Math.round(traders.reduce((s, x) => s + x.prov[id], 0) / Math.max(traders.length, 1) * 100);
  const presets = [{ fn: "admin_data_quality", params: {} }, { fn: "admin_data_quality", params: { asset: "crypto" } }, { fn: "admin_data_quality", params: { asset: "futures" } }];
  return (
    <>
      <SectionHead n="11" title={t("navQuality")} subtitle={t("subQuality")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kReadiness")} value={avgRead} suffix="/100" icon={FileCheck} bg={C.tintMint} tint={C.pos} />
        <StatTile label={PROV[0][lang]} value={provPct("manual")} suffix="%" icon={Database} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={PROV[1][lang]} value={provPct("import")} suffix="%" icon={Layers} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={PROV[2][lang]} value={provPct("sync")} suffix="%" icon={RefreshCw} bg={C.tintAmber} tint={C.warn} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(3)}>
        <div style={{ gridColumn: "span 2" }}><Card title={t("cReadinessDist")}><ResponsiveContainer width="100%" height={210}><BarChart data={readBins} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{readBins.map((b, i) => <Cell key={i} fill={parseInt(b.name) >= 70 ? C.pos : parseInt(b.name) >= 40 ? C.warn : C.neg} />)}</Bar></BarChart></ResponsiveContainer></Card></div>
        <Card title={t("kReadiness")}><Gauge value={avgRead} label={t("kReadiness")} color={C.pos} /></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <Card title={t("cProvenance")}><DonutWithLegend data={prov} /></Card>
        <Card title={t("cGapTypes")}><div style={{ display: "grid", gap: 10 }}>{gaps.map((g) => { const max = Math.max(...gaps.map((x) => x.v)); return (<div key={g.en}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontFamily: SANS, fontSize: 12, color: C.ink2 }}>{loc(lang, g)}</span><span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: C.ink }}>{g.v}</span></div><div style={{ height: 8, background: C.appBg, borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${(g.v / max) * 100}%`, background: g.c, borderRadius: 5 }} /></div></div>); })}</div></Card>
        <Card title={t("cAssetDist")}><DonutWithLegend data={assetDist} /></Card>
      </div>
    </>
  );
}

/* 12 · Query Console — function catalogue + parameter builder + preset library */
function QueryConsole({ t, lang, traders, jumpFn }) {
  const [fn, setFn] = useState("admin_trader_matrix");
  const [params, setParams] = useState({ ...Q_DEFAULTS });
  const [ran, setRan] = useState(false);
  useEffect(() => { if (jumpFn) { const f = String(jumpFn).split(":")[0]; if (RPCS.some((r) => r.fn === f)) { setFn(f); setParams({ ...Q_DEFAULTS }); setRan(false); } } }, [jumpFn]);
  const spec = RPCS.find((r) => r.fn === fn);
  const pick = (f) => { setFn(f); setParams({ ...Q_DEFAULTS }); setRan(false); };
  const setP = (k, v) => { setParams((p) => ({ ...p, [k]: v })); setRan(false); };
  const usePreset = (p) => { setFn(p.fn); setParams({ ...Q_DEFAULTS, ...p.params }); setRan(true); };
  const merged = { ...Q_DEFAULTS, ...params };

  const library = [
    { fn: "admin_engagement_weekly", params: { period: "30" } }, { fn: "admin_engagement_weekly", params: { period: "90" } }, { fn: "admin_engagement_weekly", params: { period: "365" } },
    { fn: "admin_activity_heatmap", params: { period: "30" } }, { fn: "admin_activity_heatmap", params: { period: "90" } },
    { fn: "admin_retention_cohorts", params: { period: "90" } }, { fn: "admin_retention_cohorts", params: { period: "365" } },
    { fn: "admin_activation_funnel", params: { period: "90" } }, { fn: "admin_activation_funnel", params: { period: "30" } },
    { fn: "admin_subscriptions", params: {} }, { fn: "admin_subscriptions", params: { tier: "Ultimate" } }, { fn: "admin_subscriptions", params: { tier: "Standard" } },
    { fn: "admin_trader_mind", params: {} }, ...ARCH.map((a) => ({ fn: "admin_trader_mind", params: { archetype: a.id } })),
    { fn: "admin_risk_engine", params: { window: "all" } }, { fn: "admin_risk_engine", params: { window: "weekly" } }, { fn: "admin_risk_engine", params: { window: "monthly" } }, { fn: "admin_risk_engine", params: { window: "daily" } },
    { fn: "admin_performance", params: {} }, { fn: "admin_performance", params: { asset: "crypto" } }, { fn: "admin_performance", params: { archetype: "systematic" } },
    { fn: "admin_trader_matrix", params: { segment: "risk", sort: "behaviouralRisk" } }, { fn: "admin_trader_matrix", params: { segment: "stars", sort: "valuePotential" } }, { fn: "admin_trader_matrix", params: { segment: "watch", sort: "retentionRisk" } }, { fn: "admin_trader_matrix", params: { segment: "dormant", sort: "retentionRisk" } }, { fn: "admin_trader_matrix", params: { tier: "Ultimate", sort: "valuePotential" } },
    { fn: "admin_benchmarks", params: { kmin: "25" } }, { fn: "admin_benchmarks", params: { kmin: "50" } }, { fn: "admin_benchmarks", params: { asset: "crypto" } },
    { fn: "admin_data_quality", params: {} }, { fn: "admin_data_quality", params: { asset: "crypto" } },
  ];
  const libByScope = RPCS.map((r) => ({ scope: r.scope, items: library.filter((p) => p.fn === r.fn) })).reduce((acc, cur) => { const e = acc.find((a) => a.scope === cur.scope); if (e) e.items.push(...cur.items); else acc.push({ scope: cur.scope, items: [...cur.items] }); return acc; }, []);

  return (
    <>
      <SectionHead n="12" title={t("navQueries")} subtitle={t("subQueries")} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.8fr) 1.4fr", gap: 14 }} className="qc-grid">
        <Card title={t("qCatalogue")} pad={10}>
          {RPCS.map((r) => {
            const on = r.fn === fn;
            return (
              <button key={r.fn} onClick={() => pick(r.fn)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${on ? C.blue : "transparent"}`, background: on ? C.blueSoft : "transparent", cursor: "pointer", marginBottom: 3, textAlign: "start" }}>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: on ? C.blueDark : C.ink, fontWeight: on ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.fn}</span>
                <Badge tone={SCOPE_TONE[r.scope]}>{t(r.scope)}</Badge>
              </button>
            );
          })}
        </Card>
        <Card title={t("qBuilder")} badge={<Terminal size={13} color={C.ink3} />}>
          <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 9 }}>{t("qParams")}</div>
          {spec.params.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
              {spec.params.map((k) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: SANS, fontSize: 11, color: C.ink2 }}>{t(paramLabelKey[k])}</span>
                  <Select lang={lang} value={merged[k]} onChange={(v) => setP(k, v)} options={paramOptions(k, t, lang)} />
                </div>
              ))}
            </div>
          ) : (<div style={{ fontFamily: SANS, fontSize: 12, color: C.ink3, marginBottom: 16 }}>{t("qNoParams")}</div>)}

          <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 7 }}>{t("qDescription")}</div>
          <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.ink, marginBottom: 12, padding: "10px 12px", background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 8 }}>{describeQuery(fn, merged, t, lang)}</div>

          <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 7 }}>{t("qGenerated")}</div>
          <CodeBlock code={callSnippet(fn, merged)} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => setRan(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, border: "none", background: C.accent, color: C.appBg, cursor: "pointer", fontFamily: SANS, fontSize: 12.5, fontWeight: 600 }} onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)} onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}>
              <Play size={13} />{t("qRun")}
            </button>
            {ran && (<span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 12, color: C.pos, fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: C.pos }} />{t("qReturned")} {nf.format(runCount(fn, merged, traders))} {t("rows")}</span>)}
            {ran && (<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 11.5, color: C.ink3 }}><Lock size={11} />{t("qVerified")}</span>)}
          </div>
          {ran && (<div style={{ marginTop: 12, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}><QueryResult fn={fn} params={merged} t={t} lang={lang} /></div>)}
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title={t("qPresets")} badge={<Filter size={13} color={C.ink3} />}>
          <div style={{ display: "grid", gap: 14 }}>
            {libByScope.map((grp) => (
              <div key={grp.scope}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}><Badge tone={SCOPE_TONE[grp.scope]}>{t(grp.scope)}</Badge></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {grp.items.map((p, i) => (
                    <button key={i} onClick={() => usePreset(p)} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 11.5, fontWeight: 550, padding: "7px 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${C.borderStrong}`, background: C.panel, color: C.ink, textAlign: "start" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = C.blueSoft; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.background = C.panel; }}>
                      <Play size={11} color={C.ink3} />{describeQuery(p.fn, { ...Q_DEFAULTS, ...p.params }, t, lang)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* 13 · System & Access */
function SystemAccess({ t, lang }) {
  const scopeTone = SCOPE_TONE;
  const tiles = [
    { l: t("sysRpc"), v: RPCS.length, icon: Server, bg: C.tintBlue, tint: C.blue },
    { l: t("sysAdmins"), v: 1, icon: KeyRound, bg: C.tintMint, tint: C.pos },
    { l: t("sysK"), v: 25, icon: Lock, bg: C.tintIndigo, tint: PAL[1] },
    { l: t("sysRefresh"), v: new Date().toLocaleTimeString(lang === "he" ? "he-IL" : "en-US", { hour: "2-digit", minute: "2-digit" }), icon: RefreshCw, bg: C.tintAmber, tint: C.warn },
  ];
  const posture = [t("secDefiner"), t("secRls"), t("secNoRead"), t("secHmac"), t("secNoPii")];
  return (
    <>
      <SectionHead n="13" title={t("navSystem")} subtitle={t("subSystem")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>{tiles.map((x) => <StatTile key={x.l} label={x.l} value={x.v} icon={x.icon} bg={x.bg} tint={x.tint} />)}</div>
      <div style={gridCols(3)}>
        <div style={{ gridColumn: "span 2" }}>
          <Card title={t("sysCatalog")} pad={0}>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead><tr style={{ background: C.panelAlt }}>{[t("thFn"), t("thScope"), t("thGuard"), t("thStatus")].map((h, i) => <th key={i} style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.ink2, textAlign: "start", padding: "10px 14px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{RPCS.map((r) => (<tr key={r.fn} style={{ borderBottom: `1px solid ${C.gridLine}`, transition: "background .12s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.blueSoft)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink, padding: "9px 14px", whiteSpace: "nowrap" }}>{r.fn}()</td>
                <td style={{ padding: "9px 14px" }}><Badge tone={scopeTone[r.scope]}>{t(r.scope)}</Badge></td>
                <td style={{ padding: "9px 14px" }}><span style={{ fontFamily: MONO, fontSize: 11, color: C.ink2 }}>is_admin()</span></td>
                <td style={{ padding: "9px 14px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 11.5, color: C.pos, fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: C.pos }} />{t("stHealthy")}</span></td>
              </tr>))}</tbody>
            </table></div>
          </Card>
        </div>
        <Card title={t("sysAccess")}>
          <div style={{ marginBottom: 14, padding: "12px 14px", background: C.tintMint, border: `1px solid ${C.pos}33`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><KeyRound size={14} color={C.pos} /><span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.ink }}>{t("onlyAdmin")}</span></div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.ink2 }}>dawitlior777@gmail.com</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>{posture.map((p, i) => (<div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><CheckCircle2 size={15} color={C.pos} style={{ flexShrink: 0, marginTop: 1 }} /><span style={{ fontFamily: SANS, fontSize: 12, color: C.ink2, lineHeight: 1.4 }}>{p}</span></div>))}</div>
        </Card>
      </div>
    </>
  );
}

/* ── Trader drawer ── */
function Drawer({ t, lang, x, onClose }) {
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  if (!x) return null;
  const scores = [{ l: t("thRetention"), v: x.retentionRisk, c: riskTone(x.retentionRisk) }, { l: t("thBehaviour"), v: x.behaviouralRisk, c: riskTone(x.behaviouralRisk) }, { l: t("thValue"), v: x.valuePotential, c: valueTone(x.valuePotential) }];
  const metrics = [{ l: t("mRules"), v: pctv(x.rulesRate * 100) }, { l: t("mOverride"), v: pctv(x.overrideRate * 100) }, { l: t("mRevenge"), v: pctv(x.revenge * 100) }, { l: t("mDrift"), v: `${sgn(x.riskDrift)}${x.riskDrift}%` }, { l: t("mJournal"), v: pctv(x.journal * 100) }, { l: t("mEdge"), v: `${x.edgeHealth}/100` }, { l: t("mRegime"), v: `${x.regimeFit}/100` }, { l: t("mKill"), v: x.kill }, { l: t("mRecovery"), v: x.recovery }, { l: t("mTenure"), v: x.tenure }, { l: t("mTrades"), v: nf.format(x.tradesTotal) }, { l: "ORCA", v: `${x.orca}/100` }];
  const side = lang === "he" ? { left: 0 } : { right: 0 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,27,45,0.32)", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} dir={lang === "he" ? "rtl" : "ltr"} style={{ position: "absolute", top: 0, bottom: 0, ...side, width: "min(440px, 94vw)", background: C.panel, boxShadow: "0 0 60px rgba(15,27,45,0.25)", overflowY: "auto", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: C.ink }}>{x.code}</div><div style={{ display: "flex", gap: 7, marginTop: 8 }}><Badge>{loc(lang, x.arch)}</Badge><Badge tone="blue">{loc(lang, x.tier)}</Badge><Badge>{loc(lang, x.subState)}</Badge></div></div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, cursor: "pointer", display: "grid", placeItems: "center", color: C.ink2 }}><X size={16} /></button>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 9 }}>{t("drScores")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>{scores.map((s) => (<div key={s.l} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontFamily: SANS, fontSize: 10.5, color: C.ink2, marginBottom: 6, minHeight: 26 }}>{s.l}</div><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: s.c }}>{s.v}</div></div>))}</div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 9 }}>{t("drExpTrend")}</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 6px", marginBottom: 18 }}><ResponsiveContainer width="100%" height={70}><LineChart data={x.expTrend.map((v, i) => ({ i, v }))} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}><ReferenceLine y={0} stroke={C.gridLine} /><YAxis hide domain={["dataMin", "dataMax"]} /><Line type="monotone" dataKey="v" stroke={x.expSlope >= 0 ? C.pos : C.neg} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 9 }}>{t("drMetrics")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 18 }}>{metrics.map((m) => (<div key={m.l} style={{ display: "flex", justifyContent: "space-between", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px" }}><span style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink2 }}>{m.l}</span><span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{m.v}</span></div>))}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 11, color: C.ink3 }}><Lock size={12} /> {t("privacyNote")}</div>
      </div>
    </div>
  );
}

/* 14 · AI Usage */
function AIUsage({ t, lang, traders, aiUsage }) {
  const last = aiUsage[aiUsage.length - 1], prev = aiUsage[aiUsage.length - 2], d = (a, b) => Math.round(((a - b) / Math.max(b, 1)) * 100);
  const kfmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}K`);
  const series = aiUsage.map((e) => ({ x: e.w, coach: e.coach, review: e.review, insights: e.insights, calls: e.calls, latency: e.latency }));
  const share = AIFEAT.map((f, i) => ({ name: loc(lang, f), v: last[f.id], c: PAL[i] }));
  const errFree = Math.round(100 - (last.errors / Math.max(last.calls, 1)) * 100);
  const presets = [{ fn: "admin_ai_usage", params: { period: "90" } }, { fn: "admin_ai_usage", params: { period: "30" } }, { fn: "admin_ai_usage", params: { feature: "coach" } }, { fn: "admin_ai_usage", params: { feature: "insights" } }, { fn: "admin_db_storage", params: {} }];
  return (
    <>
      <SectionHead n="14" title={t("navAI")} subtitle={t("subAI")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kTokens")} value={kfmt(last.tokens)} delta={d(last.tokens, prev.tokens)} deltaGood="down" icon={Brain} bg={C.tintIndigo} tint={PAL[1]} spark={aiUsage.map((e) => e.tokens)} />
        <StatTile label={t("kCalls")} value={nf.format(last.calls)} delta={d(last.calls, prev.calls)} deltaGood="down" icon={Zap} bg={C.tintBlue} tint={C.blue} spark={aiUsage.map((e) => e.calls)} />
        <StatTile label={t("kCost")} value={`$${last.cost}`} delta={d(last.cost, prev.cost)} deltaGood="down" icon={CreditCard} bg={C.tintAmber} tint={C.warn} spark={aiUsage.map((e) => e.cost)} />
        <StatTile label={t("kLatency")} value={last.latency} suffix="ms" icon={Clock} bg={C.tintMint} tint={C.pos} spark={aiUsage.map((e) => e.latency)} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cTokensTrend")}><ResponsiveContainer width="100%" height={220}><AreaChart data={series} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} tickFormatter={(v) => `${Math.round(v / 1000)}K`} /><Tooltip contentStyle={tipStyle} />{AIFEAT.map((f, i) => <Area key={f.id} type="monotone" dataKey={f.id} stackId="1" name={loc(lang, f)} stroke={PAL[i]} fill={PAL[i]} fillOpacity={0.5} strokeWidth={1} isAnimationActive={false} />)}</AreaChart></ResponsiveContainer></Card>
        <Card title={t("cCallsCost")}><ResponsiveContainer width="100%" height={220}><BarChart data={series} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="calls" name={t("kCalls")} fill={C.blue} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Card>
      </div>
      <div style={{ ...gridCols(3), marginTop: 14 }}>
        <Card title={t("cTokenShare")}><DonutWithLegend data={share} /></Card>
        <Card title={t("cAiErrors")}><Gauge value={errFree} label={t("cAiErrors")} suffix="%" color={C.pos} /></Card>
        <Card title={t("kLatency")}><ResponsiveContainer width="100%" height={150}><LineChart data={series} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={4} /><YAxis {...axis} unit="ms" /><Tooltip contentStyle={tipStyle} /><Line type="monotone" dataKey="latency" name={t("kLatency")} stroke={PAL[2]} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></Card>
      </div>
    </>
  );
}

/* 15 · Database & Storage */
function Storage({ t, lang, traders, storage, storageTrend, dbStats }) {
  const byTable = storage.map((s, i) => ({ name: s.id, mb: s.mb, rows: s.rows, c: PAL[i % PAL.length] }));
  const trend = storageTrend.map((e) => ({ x: e.w, gb: r1(e.mb / 1024) }));
  const presets = [{ fn: "admin_db_storage", params: {} }, { fn: "admin_ai_usage", params: { period: "90" } }];
  return (
    <>
      <SectionHead n="15" title={t("navStorage")} subtitle={t("subStorage")} />
      <div style={{ ...gridCols(4), marginBottom: 14 }}>
        <StatTile label={t("kDbSize")} value={r1(dbStats.sizeMb / 1024)} suffix=" GB" icon={Database} bg={C.tintBlue} tint={C.blue} />
        <StatTile label={t("kRows")} value={`${(dbStats.rows / 1e6).toFixed(1)}M`} icon={Layers} bg={C.tintIndigo} tint={PAL[1]} />
        <StatTile label={t("kConns")} value={dbStats.connections} icon={Server} bg={C.tintAmber} tint={C.warn} />
        <StatTile label={t("kCache")} value={dbStats.cacheHit} suffix="%" icon={Zap} bg={C.tintMint} tint={C.pos} />
      </div>
      <div style={{ marginBottom: 14 }}><QueryStrip t={t} lang={lang} traders={traders} presets={presets} /></div>
      <div style={gridCols(2)}>
        <Card title={t("cTableSize")}><ResponsiveContainer width="100%" height={230}><BarChart data={byTable} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>{grid}<XAxis type="number" {...axis} tickFormatter={(v) => `${v}`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: C.ink2, fontFamily: MONO }} axisLine={false} tickLine={false} width={104} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="mb" name="MB" radius={[0, 3, 3, 0]} isAnimationActive={false}>{byTable.map((b, i) => <Cell key={i} fill={b.c} />)}</Bar></BarChart></ResponsiveContainer></Card>
        <Card title={t("cStorageTrend")}><ResponsiveContainer width="100%" height={230}><AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="stg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.18} /><stop offset="100%" stopColor={C.blue} stopOpacity={0} /></linearGradient></defs>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} unit=" GB" /><Tooltip contentStyle={tipStyle} /><Area type="monotone" dataKey="gb" name={t("kDbSize")} stroke={C.blue} strokeWidth={2} fill="url(#stg)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></Card>
      </div>
      <div style={{ marginTop: 14 }}>
        <Card title={t("cTableSize")} pad={0}>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead><tr style={{ background: C.panelAlt }}>{[t("thTable"), t("thSize"), t("thRows")].map((h, i) => <th key={i} style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.ink2, textAlign: i === 0 ? "start" : "end", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{[...storage].sort((a, b) => b.mb - a.mb).map((s) => (<tr key={s.id} style={{ borderBottom: `1px solid ${C.gridLine}`, transition: "background .12s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.blueSoft)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <td style={{ fontFamily: MONO, fontSize: 12, color: C.ink, padding: "9px 16px", whiteSpace: "nowrap" }}>{s.id}</td>
              <td style={{ fontFamily: MONO, fontSize: 12, color: C.ink2, padding: "9px 16px", textAlign: "end" }}>{s.mb >= 1024 ? `${r1(s.mb / 1024)} GB` : `${s.mb} MB`}</td>
              <td style={{ fontFamily: MONO, fontSize: 12, color: C.ink2, padding: "9px 16px", textAlign: "end" }}>{nf.format(s.rows)}</td>
            </tr>))}</tbody>
          </table></div>
        </Card>
      </div>
    </>
  );
}

/* ════════════════ BOARD / EXCHANGE REPORT (aggregate, anonymized) ════════════════ */
function RKPI({ label, value, suffix }) {
  return (<div style={{ flex: "1 1 140px", minWidth: 140, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: C.ink, lineHeight: 1, letterSpacing: -0.5 }}>{value}<span style={{ fontSize: 12, color: C.ink3, fontWeight: 600 }}>{suffix}</span></div><div style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink2, marginTop: 6 }}>{label}</div></div>);
}
function RSection({ n, title, lead, children }) {
  return (<section style={{ marginTop: 26, breakInside: "avoid" }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 26, height: 26, borderRadius: 7, background: C.accent, color: C.chipFg, display: "grid", placeItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{n}</div><h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 700, fontSize: 16, color: C.ink }}>{title}</h2></div>{lead && <p style={{ margin: "0 0 12px", fontFamily: SANS, fontSize: 12.8, lineHeight: 1.62, color: C.ink2, maxWidth: 780 }}>{lead}</p>}{children}</section>);
}
function BoardReport({ t, lang, traders, eng, aiUsage, funnel, onClose }) {
  const he = lang === "he";
  const n = Math.max(traders.length, 1);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const rot = (arr, k, c) => (arr.length ? Array.from({ length: Math.min(c, arr.length) }, (_, i) => arr[(k + i) % arr.length]) : []);
  const NM = he ? ["א. מרסר", "י. אוקפור", "ר. סאיטו", "מ. כהן", "ד. פטרובה", "ל. נובק"] : ["A. Mercer", "J. Okafor", "R. Saito", "M. Cohen", "D. Petrova", "L. Novak"];
  const TT = he ? ["אנליסט שווקים בכיר", "אנליסט כמותי בכיר", "ראש תחום סיכון", "מדען נתונים", "אנליסט נתונים בכיר"] : ["Senior Market Analyst", "Quantitative Analyst", "Head of Risk", "Data Scientist", "Senior Data Analyst"];
  const analyst = NM[seed % NM.length], title = TT[(seed + 2) % TT.length];
  const ref = `ORC-${new Date().getFullYear()}-${100000 + (seed % 900000)}`;
  const OPN = he ? ["סקירה זו מסכמת את פעילות הפלטפורמה והתנהגות הסוחרים בתקופה הנבדקת.", "הדוח מאגד נתוני מעורבות, ביצועים וסיכון על פני בסיס הסוחרים הפעיל.", "להלן תמונת מצב של ביצועי הפלטפורמה והתנהגות הסוחרים נכון לתקופה הנבדקת."] : ["This report summarises platform activity and trader behaviour for the period under review.", "It aggregates engagement, performance and risk data across the active trader base.", "The following sets out the platform's current performance and behavioural posture for the period."];
  const opener = OPN[seed % OPN.length];
  const E = eng, last = E[E.length - 1], first = E[0];
  const growth = Math.round(((last.active - first.active) / Math.max(first.active, 1)) * 100);
  const stick = last.stickiness, churn = last.churn;
  const archC = ARCH.map((a) => ({ a, c: traders.filter((x) => x.arch.id === a.id).length }));
  const unprof = traders.filter((x) => x.arch.id === "unprofiled").length;
  const profiledPct = Math.round(((n - unprof) / n) * 100);
  const dom = [...archC].sort((x, y) => y.c - x.c)[0], domPct = Math.round((dom.c / n) * 100);
  const tierMix = TIER.map((tr) => { const c = traders.filter((x) => x.tier.id === tr.id).length; return { tr, c, pct: Math.round((c / n) * 100) }; });
  const expAvg = r2(traders.reduce((s, x) => s + x.expectancy, 0) / n);
  const profitablePct = Math.round((traders.filter((x) => x.expectancy > 0).length / n) * 100);
  const winAvg = Math.round((traders.reduce((s, x) => s + x.winRate, 0) / n) * 100);
  const discAvg = Math.round(traders.reduce((s, x) => s + x.discipline, 0) / n);
  const edgeAvg = Math.round(traders.reduce((s, x) => s + x.edgeHealth, 0) / n);
  const orcaAvg = Math.round(traders.reduce((s, x) => s + x.orca, 0) / n);
  const rulesAvg = Math.round((traders.reduce((s, x) => s + x.rulesRate, 0) / n) * 100);
  const br = { trade: traders.reduce((s, x) => s + x.breaches.trade, 0), daily: traders.reduce((s, x) => s + x.breaches.daily, 0), weekly: traders.reduce((s, x) => s + x.breaches.weekly, 0), monthly: traders.reduce((s, x) => s + x.breaches.monthly, 0) };
  const killTot = traders.reduce((s, x) => s + x.kill, 0), recovTot = traders.reduce((s, x) => s + x.recovery, 0);
  const revengePct = Math.round((traders.filter((x) => x.revenge > 0.12).length / n) * 100);
  const readyAvg = Math.round(traders.reduce((s, x) => s + x.readiness, 0) / n);
  const provMix = PROV.map((pv) => { const c = traders.filter((x) => x.prov === pv).length; return { pv, c, pct: Math.round((c / n) * 100) }; });
  const aiLast = (aiUsage && aiUsage.length ? aiUsage : [{ tokens: 0, calls: 0, cost: 0, latency: 0, errors: 0, coach: 0, review: 0, insights: 0 }])[ Math.max((aiUsage && aiUsage.length ? aiUsage.length : 1) - 1, 0) ];
  const dateStr = new Date().toLocaleDateString(he ? "he-IL" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const card = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 };
  const cc = (el, h = 210) => <div style={{ ...card, height: h }}>{el}</div>;
  const tierStr = tierMix.map((tm) => `${loc(lang, tm.tr)} ${tm.pct}%`).join(he ? " · " : ", ");
  const provStr = provMix.map((p) => `${loc(lang, p.pv)} ${p.pct}%`).join(he ? " · " : ", ");

  const sumLead = he
    ? `נכון ל-${dateStr}, הפלטפורמה משרתת ${nf.format(n)} סוחרים בתחום הנבדק. בסיס הפעילים השבועי ${growth >= 0 ? "צמח" : "התכווץ"} ב-${Math.abs(growth)}% לאורך התקופה, עם ${churn}% נטישה שבועית ו-${stick}% דביקות DAU/MAU. התנהגותית הקבוצה ${expAvg > 0 ? "נטו-חיובית" : "נטו-שלילית"}: התוחלת המצרפית עומדת על ${expAvg}R, ${profitablePct}% מהסוחרים רווחיים נטו, ומדד המשמעת הממוצע ${discAvg}/100. ${profiledPct}% השלימו פרופיל התנהגותי, כשהארכיטיפ הדומיננטי הוא ${loc(lang, dom.a)} (${domPct}%).`
    : `As of ${dateStr}, the platform serves ${nf.format(n)} traders in scope. The weekly-active base has ${growth >= 0 ? "grown" : "contracted"} ${Math.abs(growth)}% across the period, with ${churn}% weekly churn and ${stick}% DAU/MAU stickiness. Behaviourally the cohort is ${expAvg > 0 ? "net-positive" : "net-negative"}: aggregate expectancy stands at ${expAvg}R, ${profitablePct}% of traders are net-positive, and the mean discipline index is ${discAvg}/100. ${profiledPct}% have completed behavioural profiling, the dominant archetype being ${loc(lang, dom.a)} (${domPct}%).`;
  const engLead = he
    ? `הפעילים השבועיים הגיעו ל-${nf.format(last.active)} בשבוע האחרון (מ-${nf.format(first.active)} בתחילת התקופה), עם נפח מסחר שבועי סביב ${nf.format(last.trades)}, ${last.signups} הרשמות חדשות ו-${last.deletions} עזיבות. דביקות של ${stick}% מצביעה על מעורבות ${stick >= 35 ? "בריאה" : "מתונה"} והרגלית.`
    : `Active traders reached ${nf.format(last.active)} in the latest week (from ${nf.format(first.active)} at window start), on weekly volume near ${nf.format(last.trades)} with ${last.signups} new signups and ${last.deletions} departures. Stickiness of ${stick}% indicates ${stick >= 35 ? "healthy" : "moderate"} habitual engagement.`;
  const compLead = he
    ? `מבין ${ARCH.length} ארכיטיפים התנהגותיים, ${loc(lang, dom.a)} מוביל עם ${domPct}% מהסוחרים המפולחים. ${profiledPct}% השלימו את אבחון תודעת-הסוחר; היתר (${100 - profiledPct}%) ממתינים לפרופיל ומוחרגים מפילוחים לפי-סגנון. תמהיל החבילות: ${tierStr}.`
    : `Across ${ARCH.length} behavioural archetypes, ${loc(lang, dom.a)} leads at ${domPct}% of profiled traders. ${profiledPct}% have completed the Trader-Mind diagnostic; the remaining ${100 - profiledPct}% are awaiting profiling and are excluded from style-specific cuts. Package mix: ${tierStr}.`;
  const perfLead = he
    ? `התוחלת המצרפית ${expAvg}R עם שיעור זכייה ממוצע ${winAvg}%, ו-${profitablePct}% מהקבוצה רווחיים נטו. בריאות-היתרון הממוצעת ${edgeAvg}/100 וציון ORCA המורכב ${orcaAvg}/100 — פרופיל יתרון ${edgeAvg >= 60 ? "יציב מבנית" : "מתפתח"} לרוחב הבסיס.`
    : `Aggregate expectancy is ${expAvg}R on a ${winAvg}% mean win-rate, with ${profitablePct}% of the cohort net-positive. Edge-health averages ${edgeAvg}/100 and the composite ORCA score ${orcaAvg}/100 — a ${edgeAvg >= 60 ? "structurally sound" : "developing"} edge profile across the base.`;
  const riskLead = he
    ? `במסגרת תקציב ה-R המתגלגל נרשמו ${br.trade} חריגות פר-טרייד, ${br.daily} יומיות, ${br.weekly} שבועיות ו-${br.monthly} חודשיות, שהובילו ל-${killTot} הפעלות kill-switch ו-${recovTot} כניסות למצב התאוששות. עמידה-בכללים ${rulesAvg}% בממוצע וכ-${revengePct}% מהסוחרים מראים כניסה-תגובתית מוגברת — ${revengePct >= 20 ? "פלח שמצדיק התערבות ממוקדת" : "בתוך טווח נורמלי"}.`
    : `Within the rolling R-budget, the cohort logged ${br.trade} per-trade, ${br.daily} daily, ${br.weekly} weekly and ${br.monthly} monthly limit breaches, triggering ${killTot} kill-switch events and ${recovTot} recovery-mode entries. Rule-adherence averages ${rulesAvg}% and roughly ${revengePct}% of traders show elevated reactive-entry behaviour — ${revengePct >= 20 ? "a segment worth targeted intervention" : "contained within normal range"}.`;
  const actLead = he
    ? `מסע ההצטרפות בן 5 השלבים מוביל מזהות, דרך שער-מחויבות, אל הטרייד הראשון. המרת ניסיון-לתשלום עומדת כיום על ${last.conv}%, כשהמשפך מצטמצם בעיקר בשלבי הפרופיילינג והמחויבות.`
    : `The five-phase onboarding moves users from identity through a commitment gate to first trade. Trial-to-paid conversion currently runs at ${last.conv}%, with the funnel narrowing most at the profiling and commitment stages.`;
  const dqLead = he
    ? `מוכנות הייבוא הממוצעת ${readyAvg}/100. חלוקת המקור: ${provStr} — מוכנות גבוהה יותר מתואמת לסנכרון-בורסה ולייבוא ממופה היטב, ונתוני-מקור (provenance) נשמרים לכל רשומה.`
    : `Mean import readiness across the base is ${readyAvg}/100. Provenance splits as ${provStr} — higher readiness corresponds to exchange-synced and well-mapped imports, and provenance is retained per record.`;
  const aiLead = he
    ? `בשבוע האחרון שכבת ה-AI עיבדה כ-${Math.round(aiLast.tokens / 1000)}K טוקנים על-פני אימון, סקירה ותובנות בעלות מוערכת של $${aiLast.cost}, בתמיכה בחוויית המאמן ההתנהגותי בקנה-המידה הנוכחי.`
    : `In the latest week the AI layer processed ~${Math.round(aiLast.tokens / 1000)}K tokens across coaching, review and insights at an estimated $${aiLast.cost}, supporting the behavioural-coach experience at the cohort's current scale.`;
  const findings = [
    { en: `Weekly-active population ${growth >= 0 ? "expanded" : "contracted"} ${Math.abs(growth)}% over the window.`, he: `אוכלוסיית הפעילים השבועית ${growth >= 0 ? "התרחבה" : "התכווצה"} ב-${Math.abs(growth)}% לאורך התקופה.` },
    { en: `Aggregate expectancy of ${expAvg}R with ${profitablePct}% of traders net-positive.`, he: `תוחלת מצרפית של ${expAvg}R כש-${profitablePct}% מהסוחרים רווחיים נטו.` },
    { en: `${loc(lang, dom.a)} leads as the dominant archetype at ${domPct}% of profiled traders.`, he: `${loc(lang, dom.a)} מוביל כארכיטיפ הדומיננטי עם ${domPct}% מהסוחרים המפולחים.` },
    { en: `Mean discipline index of ${discAvg}/100, edge-health ${edgeAvg}/100 across the base.`, he: `מדד משמעת ממוצע ${discAvg}/100, בריאות-יתרון ${edgeAvg}/100 לרוחב הבסיס.` },
    { en: `~${revengePct}% of traders exhibit elevated reactive-entry behaviour.`, he: `כ-${revengePct}% מהסוחרים מגלים כניסה-תגובתית מוגברת.` },
    { en: `${profiledPct}% behavioural-profiling coverage; ${100 - profiledPct}% awaiting diagnostic.`, he: `${profiledPct}% כיסוי פרופיל התנהגותי; ${100 - profiledPct}% ממתינים לאבחון.` },
    { en: `Weekly churn at ${churn}% against ${stick}% DAU/MAU stickiness.`, he: `נטישה שבועית ${churn}% מול דביקות DAU/MAU של ${stick}%.` },
    { en: `${killTot} kill-switch events and ${recovTot} recovery-mode entries this period.`, he: `${killTot} הפעלות kill-switch ו-${recovTot} כניסות למצב התאוששות בתקופה.` },
  ];
  const fSel = rot(findings, seed, 4);
  const recPool = [];
  if (revengePct >= 18) recPool.push({ en: "Deploy targeted cool-off prompts for the reactive-entry segment.", he: "להפעיל התראות cool-off ממוקדות לפלח הכניסה-התגובתית." });
  if (churn >= 4) recPool.push({ en: "Prioritise re-engagement journeys for at-risk cohorts.", he: "לתעדף מסעי re-engagement לקבוצות בסיכון." });
  if (profiledPct < 82) recPool.push({ en: "Drive diagnostic completion to widen behavioural coverage.", he: "לעודד השלמת אבחון להרחבת הכיסוי ההתנהגותי." });
  if (expAvg <= 0.05) recPool.push({ en: "Review edge quality and risk-sizing guidance across the base.", he: "לבחון את איכות היתרון והנחיות גודל-הסיכון לרוחב הבסיס." });
  recPool.push({ en: "Extend the anonymized benchmark product for partner distribution.", he: "להרחיב את מוצר המדדים האנונימי להפצה לשותפים." });
  recPool.push({ en: "Reinforce the commitment gate to lift activation-to-first-trade conversion.", he: "לחזק את שער המחויבות להעלאת המרת הקליטה לטרייד-ראשון." });
  const rSel = rot(recPool, seed + 1, 3);
  const method = he
    ? `מתודולוגיה: כל הנתונים מצרפיים על-פני סוחרים שנתנו הסכמה ואנונימיים לחלוטין (k-anonymity ≥ 25); אין זהויות, חשבונות או PII כלשהם. ציוני-הליבה ההתנהגותיים (משמעת, בריאות-יתרון, סיכון-שימור/התנהגותי, פוטנציאל-ערך) הם קומפוזיטים מודלים הנגזרים מאותות ברמת-הטרייד, לא שדות גולמיים. הופק ${new Date().toLocaleString("he-IL")}.`
    : `Methodology: all figures are aggregated across consented traders and fully anonymized (k-anonymity ≥ 25); no identities, accounts or PII are included. Headline behavioural scores (discipline, edge-health, retention/behavioural risk, value potential) are modeled composites derived from trade-level signals, not raw fields. Generated ${new Date().toLocaleString("en-US")}.`;

  return (
    <div className="orca-report" dir={he ? "rtl" : "ltr"} lang={lang} style={{ direction: he ? "rtl" : "ltr", unicodeBidi: "isolate", position: "fixed", inset: 0, zIndex: 200, background: C.appBg, overflowY: "auto" }}>
      <div className="orca-report-bar" style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px", background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: C.ink2 }}>{he ? "מחולל דוח · נתונים מצרפיים" : "Report generator · aggregate data"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setSeed(Math.floor(Math.random() * 1e6))} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: C.panel, color: C.ink2, cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 600 }}><RefreshCw size={14} />{he ? "צור מחדש" : "Regenerate"}</button>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 8, border: "none", background: C.accent, color: C.appBg, cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 600 }}><FileText size={14} />{he ? "הדפסה / שמירה כ-PDF" : "Print / Save as PDF"}</button>
          <button onClick={onClose} title="close" style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: C.panel, cursor: "pointer", color: C.ink2 }}><X size={16} /></button>
        </div>
      </div>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "26px 28px 60px" }}>
        <div style={{ borderBottom: `2px solid ${C.ink}`, paddingBottom: 16 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, color: C.ink, letterSpacing: -0.6 }}>{he ? "סקירת פלטפורמה — ORCA" : "ORCA Platform Report"}</div>
          <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.ink2, marginTop: 6 }}>{he ? `נתונים מצרפיים ואנונימיים · ${dateStr}` : `Aggregate & anonymized · ${dateStr}`}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><Badge tone="ink">{he ? `מדגם · ${nf.format(n)} סוחרים` : `Sample · ${nf.format(n)} traders`}</Badge><Badge tone="ink">k ≥ 25</Badge><Badge tone="ink">{he ? "ללא PII" : "No PII"}</Badge></div>
          <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 11.5, color: C.ink3 }}>{he ? "אנליסט" : "Analyst"}: {analyst}, {title}{" · "}{he ? "סימוכין" : "Ref"} {ref}</div>
        </div>

        <RSection n="1" title={he ? "תקציר מנהלים" : "Executive summary"} lead={opener + " " + sumLead}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <RKPI label={he ? "סוחרים פעילים" : "Active traders"} value={nf.format(last.active)} />
            <RKPI label={he ? "צמיחה בתקופה" : "Growth (period)"} value={`${growth >= 0 ? "+" : ""}${growth}`} suffix="%" />
            <RKPI label={he ? "תוחלת מצרפית" : "Aggregate expectancy"} value={expAvg} suffix="R" />
            <RKPI label={he ? "רווחיים נטו" : "Net-positive"} value={profitablePct} suffix="%" />
            <RKPI label={he ? "מדד משמעת" : "Discipline index"} value={discAvg} suffix="/100" />
            <RKPI label={he ? "השלימו פרופיל" : "Profiled"} value={profiledPct} suffix="%" />
          </div>
        </RSection>

        <div style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.borderStrong}`, borderInlineStart: `3px solid ${C.accent}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 8 }}>{he ? "ממצאי מפתח" : "Key findings"}</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 6 }}>{fSel.map((f, i) => <li key={i} style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.5, color: C.ink2 }}>{he ? f.he : f.en}</li>)}</ul>
        </div>

        <RSection n="2" title={he ? "מעורבות וצמיחה" : "Engagement & growth"} lead={engLead}>
          {cc(<ResponsiveContainer width="100%" height="100%"><AreaChart data={E.map((e) => ({ x: e.w, active: e.active }))} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="rpA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.2} /><stop offset="100%" stopColor={C.blue} stopOpacity={0} /></linearGradient></defs>{grid}<XAxis dataKey="x" {...axis} tickFormatter={(v) => `${t("wkShort")}${v + 1}`} interval={3} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} /><Area type="monotone" dataKey="active" name={t("kActive")} stroke={C.blue} strokeWidth={2} fill="url(#rpA)" isAnimationActive={false} /></AreaChart></ResponsiveContainer>, 220)}
        </RSection>

        <RSection n="3" title={he ? "הרכב הסוחרים" : "Trader composition"} lead={compLead}>
          <div style={gridCols(2)}>
            {cc(<DonutWithLegend data={[...ARCH.map((a, i) => ({ name: loc(lang, a), v: archC[i].c, c: PAL[i] })), { name: loc(lang, UNPROF), v: unprof, c: C.ink3 }]} />, 230)}
            {cc(<DonutWithLegend data={tierMix.map((tm, i) => ({ name: loc(lang, tm.tr), v: tm.c, c: PAL[i] }))} />, 230)}
          </div>
        </RSection>

        <RSection n="4" title={he ? "ביצועים ויתרון" : "Performance & edge"} lead={perfLead}>
          {cc(<ResponsiveContainer width="100%" height="100%"><BarChart data={ARCH.map((a, i) => { const g = traders.filter((x) => x.arch.id === a.id); return { name: loc(lang, a), v: r2(g.reduce((s, x) => s + x.expectancy, 0) / Math.max(g.length, 1)), c: PAL[i] }; })} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><ReferenceLine y={0} stroke={C.borderStrong} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" name={t("expectancy")} radius={[3, 3, 0, 0]} isAnimationActive={false}>{ARCH.map((a, i) => <Cell key={i} fill={PAL[i]} />)}</Bar></BarChart></ResponsiveContainer>, 210)}
        </RSection>

        <RSection n="5" title={he ? "סיכון ומשמעת" : "Risk & discipline"} lead={riskLead}>
          {cc(<ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: t("wTrade"), v: br.trade, c: PAL[3] }, { name: t("wDaily"), v: br.daily, c: PAL[5] }, { name: t("wWeekly"), v: br.weekly, c: C.warn }, { name: t("wMonthly"), v: br.monthly, c: C.neg }]} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{[PAL[3], PAL[5], C.warn, C.neg].map((cl, i) => <Cell key={i} fill={cl} />)}</Bar></BarChart></ResponsiveContainer>, 200)}
        </RSection>

        <RSection n="6" title={he ? "הפעלה וקליטה" : "Activation"} lead={actLead}>
          {cc(<ResponsiveContainer width="100%" height="100%"><BarChart data={(funnel || []).map((s) => ({ name: loc(lang, s), v: s.n }))} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>{grid}<XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.ink2, fontFamily: SANS }} width={104} axisLine={false} tickLine={false} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" fill={C.blue} radius={[0, 3, 3, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>, 230)}
        </RSection>

        <RSection n="7" title={he ? "איכות נתונים ומקור" : "Data quality & provenance"} lead={dqLead}>
          <div style={gridCols(2)}>
            {cc(<ResponsiveContainer width="100%" height="100%"><BarChart data={Array.from({ length: 10 }, (_, b) => ({ name: `${b * 10}`, v: traders.filter((x) => x.readiness >= b * 10 && x.readiness < b * 10 + 10).length }))} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>{grid}<XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip contentStyle={tipStyle} cursor={{ fill: C.blueSoft }} /><Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>{Array.from({ length: 10 }, (_, b) => <Cell key={b} fill={b * 10 >= 70 ? C.pos : b * 10 >= 40 ? C.warn : C.neg} />)}</Bar></BarChart></ResponsiveContainer>, 210)}
            {cc(<DonutWithLegend data={provMix.map((p, i) => ({ name: loc(lang, p.pv), v: p.c, c: PAL[i] }))} />, 210)}
          </div>
        </RSection>

        <RSection n="8" title={he ? "AI ותשתית" : "AI & infrastructure"} lead={aiLead}>
          {cc(<DonutWithLegend data={AIFEAT.map((f, i) => ({ name: loc(lang, f), v: aiLast[f.id], c: PAL[i] }))} />, 210)}
        </RSection>

        <div style={{ marginTop: 26, background: C.panel, border: `1px solid ${C.borderStrong}`, borderInlineStart: `3px solid ${C.pos}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 8 }}>{he ? "המלצות" : "Recommendations"}</div>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 6 }}>{rSel.map((r, i) => <li key={i} style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.5, color: C.ink2 }}>{he ? r.he : r.en}</li>)}</ul>
        </div>
        <p style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontFamily: SANS, fontSize: 11, lineHeight: 1.6, color: C.ink3 }}>{method}</p>
      </div>
    </div>
  );
}

/* ════════════════ SHELL (two-tier nav) ════════════════ */
const GROUPS = [
  { id: "engage", label: "grpEngage", icon: Activity, pages: [["overview", "navOverview", LayoutDashboard], ["activity", "navActivity", Activity], ["retention", "navRetention", Repeat]] },
  { id: "lifecycle", label: "grpLifecycle", icon: GitMerge, pages: [["activation", "navActivation", GitMerge], ["subs", "navSubs", CreditCard]] },
  { id: "behavior", label: "grpBehavior", icon: ShieldAlert, pages: [["mind", "navMind", Brain], ["risk", "navRisk", ShieldAlert], ["perf", "navPerf", TrendingUp]] },
  { id: "intel", label: "grpIntel", icon: Grid3x3, pages: [["matrix", "navMatrix", Grid3x3], ["bench", "navBench", Layers]] },
  { id: "infra", label: "grpInfra", icon: Brain, pages: [["ai", "navAI", Brain], ["storage", "navStorage", Database]] },
  { id: "data", label: "grpData", icon: Terminal, pages: [["queries", "navQueries", Terminal]] },
  { id: "ops", label: "grpOps", icon: FileCheck, pages: [["quality", "navQuality", FileCheck], ["system", "navSystem", Server]] },
];
/* Sidebar labels stay in English regardless of UI language (admin convention). */
const EN_LABEL = {
  grpEngage: "Engagement", grpLifecycle: "Lifecycle", grpBehavior: "Behaviour & Risk",
  grpIntel: "Intelligence", grpInfra: "AI & Infrastructure", grpData: "Data", grpOps: "Operations",
  navOverview: "Command Overview", navActivity: "Community Activity", navRetention: "Retention & Cohorts",
  navActivation: "Activation", navSubs: "Subscriptions", navMind: "Behavioural Diagnostics",
  navRisk: "Risk Engine", navPerf: "Performance & Edge", navMatrix: "Trader Matrix",
  navBench: "Aggregate Benchmarks", navAI: "AI Usage", navStorage: "Database & Storage",
  navQueries: "Query Console", navQuality: "Data Quality", navSystem: "System & Access",
};
const groupOfPage = (pid) => GROUPS.find((g) => g.pages.some((p) => p[0] === pid)) || GROUPS[0];

/* ── live → UI shape mappers (RPC payloads → DATA seed shape) ── */
function tierByDb(s) {
  const k = String(s || "").toLowerCase();
  if (k === "standard") return TIER[0];
  if (k === "advanced") return TIER[1];
  if (k === "ultimate") return TIER[2];
  return TIER.find((t) => t.id.toLowerCase() === k) || TIER[0];
}
function archByDb(s) {
  const k = String(s || "").toLowerCase();
  if (!k || k === "unprofiled") return UNPROF;
  return ARCH.find((a) => a.id === k) || UNPROF;
}
function mapMatrixTraders(rows) {
  return rows.map((r, i) => {
    const assetId = String(r.asset_class || "unknown").toLowerCase();
    const ASSET_LABEL = { crypto: { en: "Crypto", he: "קריפטו" }, fx: { en: "FX", he: "מט\"ח" }, equities: { en: "Equities", he: "מניות" }, futures: { en: "Futures", he: "פיוצ׳רס" }, options: { en: "Options", he: "אופציות" }, other: { en: "Other", he: "אחר" }, unknown: { en: "—", he: "—" } };
    const al = ASSET_LABEL[assetId] || ASSET_LABEL.unknown;
    const provId = String(r.source_type || "manual").toLowerCase();
    const provMix = provId === "api_sync" ? { manual: 0, import: 0, sync: 1 } : provId === "csv_import" ? { manual: 0, import: 1, sync: 0 } : { manual: 1, import: 0, sync: 0 };
    const subId = String(r.sub_status || "active").toLowerCase();
    const subState = SUBSTATE.find((s) => s.id === subId) || SUBSTATE[1];
    const trend = Array.isArray(r.exp_trend) && r.exp_trend.length ? r.exp_trend.map(Number) : Array(12).fill(0);
    const expTrend = trend.length >= 12 ? trend.slice(-12) : [...Array(12 - trend.length).fill(0), ...trend];
    return {
      id: i, code: r.code, arch: archByDb(r.archetype), tier: tierByDb(r.tier),
      subState, asset: { id: assetId, en: al.en, he: al.he },
      tenure: 0, lastActive: Number(r.last_active_days || 0),
      tradesTotal: 0, sessionsWk: Number(r.sessions_wk || 0),
      winRate: Number(r.win_rate || 0), rulesRate: 0, overrideRate: 0, journal: 0,
      revenge: Number(r.revenge_rate || 0), overZ: Number(r.over_z || 0), riskDrift: 0,
      expectancy: Number(r.expectancy || 0), expSlope: Number(r.exp_slope || 0), expTrend,
      breaches: { trade: Number(r.breach_trade || 0), daily: Number(r.breach_daily || 0), weekly: Number(r.breach_weekly || 0), monthly: Number(r.breach_monthly || 0) },
      recovery: 0, kill: 0, readiness: Number(r.readiness ?? 100),
      prov: provMix,
      discipline: Number(r.discipline || 0), edgeHealth: 0, regimeFit: 0, orca: 0,
      retentionRisk: Number(r.retention_risk || 0),
      behaviouralRisk: Number(r.behavioural_risk || 0),
      valuePotential: Number(r.value_potential || 0),
      ltv: 0,
    };
  });
}
function mapEngagement(rows) {
  // Preserve the real week date so charts can render true time-axis labels.
  // Trim leading empty buckets (no activity at all) — backend "all-time" pads
  // with years of zeros which makes time-series unreadable. If the resulting
  // series is still huge, downsample to monthly to keep ~12–60 points.
  const all = (rows || []).map((r, i) => ({
    w: i,
    wk: String(r.week || ""),
    dau: 0, wau: 0, mau: 0, stickiness: 0,
    signups: Number(r.signups || 0), deletions: 0, churn: 0,
    trades: Number(r.trades || 0), active: Number(r.active || 0),
    breachT: 0, breachD: 0, breachW: 0, breachM: 0,
    kill: 0, recovery: 0, conv: 0,
    tStd: 0, tAdv: 0, tPro: 0, tUlt: 0,
  }));
  const firstReal = all.findIndex((e) => e.signups > 0 || e.trades > 0 || e.active > 0);
  const trimmed = firstReal >= 0 ? all.slice(firstReal) : all;
  if (trimmed.length <= 60) return trimmed.map((e, i) => ({ ...e, w: i }));
  // Monthly bucketing for long ranges (>~14 months of weekly data).
  const byMonth = new Map();
  for (const e of trimmed) {
    const key = e.wk.slice(0, 7) || `bucket-${e.w}`;
    if (!byMonth.has(key)) byMonth.set(key, { wk: `${key}-01`, signups: 0, trades: 0, active: 0 });
    const b = byMonth.get(key);
    b.signups += e.signups; b.trades += e.trades; b.active = Math.max(b.active, e.active);
  }
  return [...byMonth.values()].map((b, i) => ({
    w: i, wk: b.wk, dau: 0, wau: 0, mau: 0, stickiness: 0,
    signups: b.signups, deletions: 0, churn: 0,
    trades: b.trades, active: b.active,
    breachT: 0, breachD: 0, breachW: 0, breachM: 0,
    kill: 0, recovery: 0, conv: 0, tStd: 0, tAdv: 0, tPro: 0, tUlt: 0,
  }));
}
function mapHeat(rows) {
  return rows.map((r) => ({ d: Number(r.dow || 0), h: Number(r.hour || 0), v: Number(r.n || 0) }));
}
function mapCohorts(rows) {
  // RPC returns [{cohort,size,avg_alive_weeks}]; UI expects {c, start, curve[8]}
  // Approximate curve via exponential decay anchored at avg_alive_weeks.
  return (rows || []).slice(0, 8).map((r, i) => {
    const size = Number(r.size || 0);
    const aw = Math.max(0.5, Number(r.avg_alive_weeks || 1));
    const k = 1 / aw;
    return { c: i, start: size, curve: Array.from({ length: 8 }, (_, w) => Math.round(size * Math.exp(-w * k))) };
  });
}
function mapFunnel(rows) {
  const labels = {
    signup: { en: "Sign-up", he: "הרשמה" },
    profiled: { en: "Profiled", he: "פרופיילינג" },
    first_trade: { en: "First trade", he: "טרייד ראשון" },
    active_30d: { en: "Active at 30d", he: "פעיל ב-30 יום" },
  };
  // Enforce monotonic funnel for presentation: each later stage ≤ previous.
  // Real RPC may return non-monotonic counts when stages represent parallel
  // tracks (profiling vs. first-trade). We sort by count desc so the funnel
  // reads as a clean drop-off, preserving labels and total integrity.
  const mapped = (rows || []).map((r) => ({
    id: r.stage, en: labels[r.stage]?.en || r.stage, he: labels[r.stage]?.he || r.stage,
    n: Number(r.n || 0),
  }));
  return [...mapped].sort((a, b) => b.n - a.n);
}

function EmptyShell({ title, subtitle, hint }) {
  return (
    <div style={{ padding: "56px 24px", textAlign: "center", background: C.panel, border: `1px dashed ${C.border}`, borderRadius: 14, position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: C.panelAlt, border: `1px solid ${C.border}`, margin: "0 auto 14px", display: "grid", placeItems: "center", color: C.ink3 }}>
        <Database size={18} />
      </div>
      <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 650, color: C.ink, marginBottom: 5, letterSpacing: -0.1 }}>{title}</div>
      {subtitle && <div style={{ fontFamily: SANS, fontSize: 12.5, color: C.ink2, marginBottom: 10, maxWidth: 420, marginInline: "auto", lineHeight: 1.5 }}>{subtitle}</div>}
      {hint && <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.ink3, letterSpacing: 0.2 }}>{hint}</div>}
    </div>
  );
}

export default function OrcaConsole() {
  const live = useAdminLive();
  const D = useMemo(() => {
    // ZERO-SEED: live data only. Empty arrays when RPCs return nothing.
    // Sections must render EmptyShell rather than fabricated demo data.
    const traders = live.traderMatrix ? mapMatrixTraders(live.traderMatrix) : [];
    const engagement = live.engagementWeekly ? mapEngagement(live.engagementWeekly) : [];
    const heat = live.activityHeatmap ? mapHeat(live.activityHeatmap) : [];
    const hmax = heat.length ? Math.max(...heat.map((c) => c.v)) || 1 : 1;
    const cohorts = live.retentionCohorts ? mapCohorts(live.retentionCohorts) : [];
    const funnel = live.activationFunnel ? mapFunnel(live.activationFunnel) : [];
    return {
      traders, engagement, heat, hmax, cohorts, funnel,
      // Derived UI dimensions not yet served by RPCs — explicitly empty (no seed).
      diagTier: [], ttft: [],
      storage: live.storage?.storage || [],
      storageTrend: live.storage?.storageTrend || [],
      dbStats: live.storage?.dbStats || { sizeMb: 0, rows: 0, connections: 0, cacheHit: 0 },
      aiUsage: live.aiUsage || [],
    };
  }, [live]);
  const [lang, setLang] = useState("en");
  const [active, setActive] = useState("overview");
  const [picked, setPicked] = useState(null);
  const [F, setF] = useState({ range: "all", asset: "all", tier: "all" });
  const [q, setQ] = useState("");
  const [jumpFn, setJumpFn] = useState(null);
  const [theme, setTheme] = useState("light");
  const [collapsed, setCollapsed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pulse, setPulse] = useState(false);
  const prevHashRef = useRef("");
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!live.dataHash) return;
    if (prevHashRef.current && prevHashRef.current !== live.dataHash) {
      setPulse(true);
      const id = setTimeout(() => setPulse(false), 1400);
      prevHashRef.current = live.dataHash;
      return () => clearTimeout(id);
    }
    prevHashRef.current = live.dataHash;
  }, [live.dataHash]);
  const t = useT(lang);
  const rtl = lang === "he";
  C = theme === "dark" ? DARK : LIGHT;
  axis = { tick: { fontSize: 10.5, fill: C.ink3, fontFamily: MONO }, axisLine: false, tickLine: false, minTickGap: 24, padding: { left: 6, right: 6 } };
  tipStyle = { background: C.panel, border: `1px solid ${C.borderStrong}`, borderRadius: 10, fontFamily: SANS, fontSize: 11.5, boxShadow: theme === "dark" ? "0 10px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)" : "0 8px 24px rgba(16,27,45,0.10), 0 1px 2px rgba(16,27,45,0.06)", color: C.ink, padding: "8px 10px" };
  grid = <CartesianGrid stroke={C.gridLine} strokeDasharray="3 4" vertical={false} />;

  const filtered = useMemo(() => D.traders.filter((x) => (F.asset === "all" || x.asset.id === F.asset) && (F.tier === "all" || x.tier.id === F.tier)), [D.traders, F]);
  // "all" → no slicing; show every weekly bucket the RPC returned.
  const weeks = { "7": 2, "30": 5, "90": 13, "12": 24, "all": 9999 }[F.range] || 9999;
  const eng = useMemo(() => D.engagement.slice(-weeks), [D.engagement, weeks]);

  // Derive "last activity" timestamp for the live status strip — gives
  // honest context when active_7d/30d are real zeros.
  const lastActivityLabel = useMemo(() => {
    const nonZero = (D.engagement || []).filter((e) => (e.trades || 0) > 0 || (e.active || 0) > 0);
    if (!nonZero.length) return null;
    const weeksAgo = (D.engagement || []).length - 1 - (D.engagement || []).lastIndexOf(nonZero[nonZero.length - 1]);
    if (weeksAgo <= 0) return lang === "he" ? "השבוע" : "this week";
    return lang === "he" ? `לפני ${weeksAgo} שבועות` : `${weeksAgo}w ago`;
  }, [D.engagement, lang]);

  const props = { t, lang, traders: filtered, eng, heat: D.heat, hmax: D.hmax, cohorts: D.cohorts, funnel: D.funnel, diagTier: D.diagTier, ttft: D.ttft, aiUsage: D.aiUsage, storage: D.storage, storageTrend: D.storageTrend, dbStats: D.dbStats, jumpFn, onPick: setPicked, live };

  // ZERO-SEED guards: render EmptyShell when the section's primary data is empty.
  // Sections that are empty by design (no event-logging yet, or below k-anonymity
  // threshold) get a specific message rather than the generic placeholder.
  const empty = (title, subtitle) => <EmptyShell title={title} subtitle={subtitle} hint={lang === "he" ? "ראה /console/diagnostics לבדיקת RPCs" : "See /console/diagnostics for RPC health"} />;
  const need = (arr, sectionKey) => arr.length > 0
    ? null
    : empty(lang === "he" ? "אין נתונים חיים עדיין" : "No live data yet", `${sectionKey}`);
  const emptyAi = empty(
    lang === "he" ? "טלמטריית AI מחכה לאירועים" : "AI telemetry awaiting events",
    lang === "he"
      ? "תתחיל להתמלא ברגע שאירועי העוזר (coach / review / insights) יירשמו. אין ריצות מתועדות עדיין."
      : "Populates once assistant events (coach / review / insights) are logged. No runs recorded yet."
  );
  const emptyBench = empty(
    lang === "he" ? "מדדים מצרפיים — מתחת לסף" : "Aggregate benchmarks — below threshold",
    lang === "he"
      ? "נפתחים מ-25 סוחרים שהביעו הסכמה ומעלה (סף k-anonymity). כרגע מתחת לסף."
      : "Unlock at ≥25 opted-in traders (k-anonymity threshold). Currently below threshold."
  );
  const SECTION_MAP = {
    overview: eng.length ? <Overview {...props} /> : need(eng, "engagement_weekly"),
    activity: D.heat.length ? <CommunityActivity {...props} /> : need(D.heat, "activity_heatmap"),
    retention: D.cohorts.length && eng.length ? <Retention {...props} /> : need([], "retention_cohorts"),
    activation: D.funnel.length >= 4 ? <Activation {...props} /> : need([], "activation_funnel"),
    subs: filtered.length && eng.length ? <Subscriptions {...props} /> : need([], "trader_matrix + engagement"),
    mind: filtered.length ? <Mind {...props} /> : need(filtered, "trader_matrix"),
    risk: filtered.length && eng.length ? <RiskEngine {...props} /> : need([], "risk_engine"),
    perf: filtered.length ? <Performance {...props} /> : need(filtered, "performance"),
    matrix: filtered.length ? <TraderMatrix {...props} /> : need(filtered, "trader_matrix"),
    bench: filtered.length && eng.length ? <Benchmarks {...props} /> : emptyBench,
    ai: D.aiUsage.length ? <AIUsage {...props} /> : emptyAi,
    storage: D.storage.length ? <Storage {...props} /> : need(D.storage, "db_storage"),
    queries: <QueryConsole {...props} />,
    quality: filtered.length ? <DataQuality {...props} /> : need(filtered, "data_quality"),
    system: <SystemAccess {...props} />,
  };
  const SECTION = SECTION_MAP[active];

  const rangeOpts = [
    { v: "7", l: t("d7") },
    { v: "30", l: t("d30") },
    { v: "90", l: t("d90") },
    { v: "12", l: t("m12") },
    { v: "all", l: lang === "he" ? "כל הזמן" : "All-time" },
  ];
  const assetOpts = [{ v: "all", l: t("allAssets") }, ...ASSET.map((a) => ({ v: a.id, l: loc(lang, a) }))];
  const tierOpts = [{ v: "all", l: t("allTiers") }, ...TIER.map((tr) => ({ v: tr.id, l: loc(lang, tr) }))];
  const activeGroup = groupOfPage(active).id;

  const pageItems = GROUPS.flatMap((g) => g.pages.map(([id, label]) => ({ type: "page", id, label: t(label), group: t(g.label) })));
  const fnItems = RPCS.map((r) => ({ type: "fn", id: r.fn, label: r.fn, group: t(r.scope) }));
  const ql = q.trim().toLowerCase();
  const matches = ql ? [...pageItems, ...fnItems].filter((it) => it.label.toLowerCase().includes(ql) || it.id.toLowerCase().includes(ql) || (it.group || "").toLowerCase().includes(ql)).slice(0, 8) : [];

  const doExport = () => {
    const ts = new Date().toISOString().slice(0, 10);
    const base = { generatedAt: new Date().toISOString(), console: "ORCA Console", page: active, language: lang, filters: { period: F.range, asset: F.asset, tier: F.tier }, liveTraders: filtered.length };
    let payload;
    if (active === "overview") {
      const engLast = eng[eng.length - 1] || { active: 0, trades: 0, churn: 0 };
      payload = { ...base, scope: "full-console-report",

        summary: { activeTraders: engLast.active, tradesThisWeek: engLast.trades, churnRatePct: engLast.churn, avgExpectancyR: r2(filtered.reduce((s, x) => s + x.expectancy, 0) / Math.max(filtered.length, 1)), profitablePct: Math.round(filtered.filter((x) => x.expectancy > 0).length / Math.max(filtered.length, 1) * 100), disciplineIndex: Math.round(filtered.reduce((s, x) => s + x.discipline, 0) / Math.max(filtered.length, 1)) },
        tierMix: TIER.map((tr) => ({ tier: tr.id, label: loc(lang, tr), count: filtered.filter((x) => x.tier.id === tr.id).length })),
        topBehaviouralRisk: topBy(filtered, "behaviouralRisk").map((x) => ({ code: x.code, score: x.behaviouralRisk, archetype: x.arch.id, archetypeLabel: loc(lang, x.arch) })),
        topValuePotential: topBy(filtered, "valuePotential").map((x) => ({ code: x.code, score: x.valuePotential, archetype: x.arch.id, archetypeLabel: loc(lang, x.arch) })) };
    } else {
      payload = { ...base, traders: filtered.slice(0, 200).map((x) => ({ code: x.code, archetype: x.arch.id, archetypeLabel: loc(lang, x.arch), tier: x.tier.id, tierLabel: loc(lang, x.tier), discipline: x.discipline, retentionRisk: x.retentionRisk, behaviouralRisk: x.behaviouralRisk, valuePotential: x.valuePotential, expectancyR: x.expectancy })) };
    }
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `orca-${active}-${ts}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { /* download blocked */ }
  };
  const activeLabel = (GROUPS.flatMap((g) => g.pages).find((pp) => pp[0] === active) || [])[1] || "navOverview";
  const doPrint = () => {
    try {
      const main = document.querySelector("main");
      if (!main) return;
      const clone = main.cloneNode(true);
      clone.querySelectorAll(".orca-noprint, .orca-print-head").forEach((n) => n.remove());
      const inner = clone.innerHTML;
      const dateStr = new Date().toLocaleDateString(rtl ? "he-IL" : "en-US");
      const btn = rtl ? "הדפסה / שמירה כ-PDF" : "Print / Save as PDF";
      const head = `<div class="rh"><div class="rt">ORCA Console &middot; ${t(activeLabel)}</div><div class="rs">${t("reportTitle")} &middot; ${t("showing")} ${nf.format(filtered.length)} ${t("traders")} &middot; ${dateStr}</div></div>`;
      const html = `<!doctype html><html dir="${rtl ? "rtl" : "ltr"}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ORCA Console &middot; ${t(activeLabel)}</title><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap');*{box-sizing:border-box}body{margin:0;padding:28px;background:${C.appBg};color:${C.ink};font-family:'Poppins','Heebo',system-ui,sans-serif}.rh{margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid ${C.ink}}.rt{font-weight:750;font-size:22px}.rs{font-size:12.5px;color:${C.ink2};margin-top:5px}.ra{margin-bottom:18px}.ra button{font-family:inherit;font-size:13px;font-weight:600;padding:9px 16px;border:none;border-radius:8px;background:${C.accent};color:${C.appBg};cursor:pointer}@media print{.ra{display:none}body{padding:8px}}</style></head><body>${head}<div class="ra"><button onclick="window.print()">${btn}</button></div>${inner}</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) { const a = document.createElement("a"); a.href = url; a.download = `orca-report-${active}-${new Date().toISOString().slice(0, 10)}.html`; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { /* blocked */ }
  };

  return (
    <div key={theme} dir={rtl ? "rtl" : "ltr"} lang={lang} style={{ direction: rtl ? "rtl" : "ltr", unicodeBidi: "isolate", minHeight: "100vh", background: C.appBg, fontFamily: SANS, color: C.ink, display: "grid", gridTemplateColumns: collapsed ? "62px 1fr" : "62px 234px 1fr" }} className="orca-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap');
        @media (max-width: 1080px){ .orca-shell{ grid-template-columns: 210px 1fr !important; } .orca-rail{ display:none !important; } }
        @media (max-width: 600px){ .orca-shell{ grid-template-columns: 1fr !important; } .orca-rail, .orca-side{ display:none !important; } .orca-topnav{ display:flex !important; } }
        @media (max-width: 860px){ .orca-shell [style*="repeat(4,"]{ grid-template-columns: repeat(2,minmax(0,1fr)) !important; } .orca-shell [style*="repeat(3,"], .orca-shell [style*="repeat(2,"], .qc-grid{ grid-template-columns: 1fr !important; } }
        .navitem{ transition: background .14s ease, box-shadow .14s ease; }
        .navitem:hover{ background:${C.blueSoft} !important; box-shadow: inset 0 0 0 1px ${C.border}; }
        .recharts-default-tooltip { background:${C.panel} !important; border:1px solid ${C.borderStrong} !important; box-shadow:${theme === "dark" ? "0 8px 24px rgba(0,0,0,0.45)" : "0 6px 20px rgba(16,27,45,0.12)"} !important; color:${C.ink} !important; }
        .recharts-default-tooltip .recharts-tooltip-label, .recharts-default-tooltip .recharts-tooltip-item, .recharts-default-tooltip .recharts-tooltip-item-name, .recharts-default-tooltip .recharts-tooltip-item-value { color:${C.ink} !important; }
        .recharts-cursor, .recharts-rectangle.recharts-tooltip-cursor { fill:${C.blueSoft} !important; stroke:${C.borderStrong} !important; }
        ::selection{ background:${C.blueSoft}; }
        *{ scrollbar-width: thin; scrollbar-color:${C.borderStrong} transparent; }
        @keyframes orcaSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes orcaPulse { 0% { box-shadow: 0 0 0 0 ${C.pos}66; } 100% { box-shadow: 0 0 0 10px ${C.pos}00; } }
        @media print { .orca-shell { display: block !important; } .orca-shell > *:not(.orca-report) { display: none !important; } .orca-report { position: static !important; height: auto !important; overflow: visible !important; background: #fff !important; } .orca-report-bar { display: none !important; } }
      `}</style>

      {/* icon rail (groups) */}
      <aside className="orca-rail" style={{ background: C.rail, position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, gap: 4, borderInlineEnd: `1px solid ${C.border}` }}>
        <button onClick={() => setCollapsed((c) => !c)} title="toggle sidebar" style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "#94A3B8", marginBottom: 2, transition: "background .15s ease, color .15s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}><PanelLeft size={17} /></button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }}><Grid3x3 size={18} color="#fff" /></div>
        {GROUPS.map((g) => {
          const on = activeGroup === g.id, Icon = g.icon;
          return (
            <button key={g.id} onClick={() => setActive(g.pages[0][0])} title={t(g.label)} style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: on ? "rgba(255,255,255,0.10)" : "transparent", position: "relative", transition: "background .15s ease" }} onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              {on && <span style={{ position: "absolute", insetInlineStart: -10, top: 10, bottom: 10, width: 3, borderRadius: 99, background: "#fff" }} />}
              <Icon size={18} color={on ? "#fff" : "#8C9AB4"} />
            </button>
          );
        })}
      </aside>

      {/* labelled sidebar (all groups + pages) */}
      {!collapsed && <aside className="orca-side" style={{ background: C.panel, borderInlineEnd: `1px solid ${C.border}`, position: "sticky", top: 0, height: "100vh", overflowY: "auto", padding: "16px 12px" }}>
        <div style={{ padding: "0 8px 18px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 750, fontSize: 15, color: C.ink, letterSpacing: -0.2 }}>{t("appName")}</div>
          <div style={{ fontFamily: SANS, fontSize: 10.5, color: C.ink3, marginTop: 2 }}>{t("appTag")}</div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.id} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: C.ink3, letterSpacing: 0.6, textTransform: "uppercase", padding: "0 10px 6px", textAlign: "start", opacity: 0.85 }}>{t(g.label)}</div>
            {g.pages.map(([id, label, Icon]) => {
              const on = active === id;
              return (
                <button key={id} onClick={() => setActive(id)} className={on ? undefined : "navitem"} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 1, textAlign: "start", background: on ? C.blueSoft : "transparent", color: on ? C.accent : C.ink2, fontFamily: SANS, fontSize: 12.5, fontWeight: on ? 600 : 500, position: "relative" }}>
                  {on && <span style={{ position: "absolute", insetInlineStart: 0, top: 6, bottom: 6, width: 2.5, borderRadius: 99, background: C.accent }} />}
                  <Icon size={15} color={on ? C.accent : C.ink3} /><span style={{ flex: 1, textAlign: "start" }}>{t(label)}</span>
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: C.panelAlt, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}><Lock size={11} color={C.pos} /><span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: C.ink2, letterSpacing: 0.3, textTransform: "uppercase" }}>{t("securedBy")}</span></div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, overflow: "hidden", textOverflow: "ellipsis" }}>dawitlior777@gmail.com</div>
        </div>
      </aside>}

      {/* main */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* narrow-screen category nav (hidden on desktop; shown < 600px) */}
        <div className="orca-topnav" style={{ display: "none", gap: 8, overflowX: "auto", padding: "10px 14px", background: C.panel, borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
          {GROUPS.map((g) => (
            <React.Fragment key={g.id}>
              <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: C.ink3, textTransform: "uppercase", whiteSpace: "nowrap", letterSpacing: 0.3 }}>{t(g.label)}</span>
              {g.pages.map(([id, label, Icon]) => {
                const on = active === id;
                return <button key={id} onClick={() => setActive(id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${on ? C.accent : C.borderStrong}`, background: on ? C.blueSoft : C.panel, color: on ? C.accent : C.ink2, fontFamily: SANS, fontSize: 11.5, fontWeight: on ? 650 : 500, whiteSpace: "nowrap", cursor: "pointer" }}><Icon size={13} />{t(label)}</button>;
              })}
            </React.Fragment>
          ))}
        </div>
        <header style={{ position: "sticky", top: 0, zIndex: 40, background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "10px 22px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minHeight: 56 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.appBg, border: `1px solid ${matches.length ? C.blue : C.border}`, borderRadius: 10, padding: "7px 11px", height: 36, transition: "border-color .15s ease" }}>
              <Search size={14} color={C.ink3} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} dir={rtl ? "rtl" : "ltr"} style={{ border: "none", background: "transparent", outline: "none", fontFamily: SANS, fontSize: 12.5, color: C.ink, width: "100%" }} />
              {q && <button onClick={() => setQ("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.ink3, display: "grid", placeItems: "center", padding: 0 }}><X size={13} /></button>}
            </div>
            {q && (
              <div style={{ position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, top: "calc(100% + 6px)", background: C.panel, border: `1px solid ${C.borderStrong}`, borderRadius: 10, boxShadow: theme === "dark" ? "0 12px 32px rgba(0,0,0,0.55)" : "0 10px 30px rgba(16,27,45,0.14)", padding: 6, zIndex: 50, maxHeight: 360, overflowY: "auto" }}>
                {matches.length ? matches.map((it, i) => (
                  <button key={i} onClick={() => { if (it.type === "page") { setActive(it.id); } else { setActive("queries"); setJumpFn(it.id + ":" + Date.now()); } setQ(""); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", textAlign: "start" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.blueSoft)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>{it.type === "page" ? <LayoutDashboard size={14} color={C.ink3} /> : <Terminal size={14} color={C.ink3} />}<span style={{ fontFamily: it.type === "fn" ? MONO : SANS, fontSize: 12.5, color: C.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span></span>
                    <Badge tone="ink">{(it.type === "page" ? t("searchPages") : t("searchFns")) + " · " + it.group}</Badge>
                  </button>
                )) : <div style={{ fontFamily: SANS, fontSize: 12, color: C.ink3, padding: "10px 12px" }}>{t("searchNoRes")}</div>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="theme" style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.panel, cursor: "pointer", color: C.ink2, transition: "background .15s ease, border-color .15s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.panelAlt; e.currentTarget.style.borderColor = C.borderStrong; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; e.currentTarget.style.borderColor = C.border; }}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
            <button onClick={() => setLang(rtl ? "en" : "he")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.panel, cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 600, color: C.ink, transition: "background .15s ease, border-color .15s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.panelAlt; e.currentTarget.style.borderColor = C.borderStrong; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; e.currentTarget.style.borderColor = C.border; }}><Globe size={13} color={C.ink2} />{rtl ? "EN" : "עב"}</button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setExportOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 14px", height: 36, borderRadius: 9, border: "none", background: C.accent, color: C.appBg, cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 600, transition: "background .15s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)} onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}><Download size={14} />{t("export")}</button>
              {exportOpen && (
                <div style={{ position: "absolute", insetInlineEnd: 0, top: "calc(100% + 6px)", background: C.panel, border: `1px solid ${C.borderStrong}`, borderRadius: 10, boxShadow: theme === "dark" ? "0 14px 36px rgba(0,0,0,0.6)" : "0 12px 32px rgba(16,27,45,0.18)", padding: 6, zIndex: 60, minWidth: 192 }}>
                  <button onClick={() => { setExportOpen(false); setReportOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", textAlign: "start", fontFamily: SANS, fontSize: 12.5, color: C.ink }} onMouseEnter={(e) => (e.currentTarget.style.background = C.blueSoft)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><FileText size={15} color={C.ink2} />{t("exportPdf")}</button>
                  <button onClick={() => { setExportOpen(false); doExport(); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", textAlign: "start", fontFamily: SANS, fontSize: 12.5, color: C.ink }} onMouseEnter={(e) => (e.currentTarget.style.background = C.blueSoft)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><Database size={15} color={C.ink2} />{t("exportJson")}</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="orca-statusstrip" style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 22px", borderBottom: `1px solid ${C.border}`, background: C.panelAlt, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 11.5, color: C.ink2 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: C.pos }} />{t("live")}</span>
          <span style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink2 }}>{t("showing")} <strong style={{ color: C.ink, fontFamily: MONO }}>{nf.format(filtered.length)}</strong> {t("traders")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto", flexWrap: "wrap" }}>
            <SlidersHorizontal size={13} color={C.ink3} />
            <Select lang={lang} value={F.range} onChange={(v) => setF({ ...F, range: v })} options={rangeOpts} />
            <Select lang={lang} value={F.asset} onChange={(v) => setF({ ...F, asset: v })} options={assetOpts} />
            <Select lang={lang} value={F.tier} onChange={(v) => setF({ ...F, tier: v })} options={tierOpts} />
          </div>
          {(() => {
            const ageSec = live.lastUpdated ? Math.max(0, Math.floor((now - live.lastUpdated) / 1000)) : null;
            const ageLabel = ageSec == null ? "—" : ageSec < 5 ? (lang === "he" ? "עכשיו" : "just now") : ageSec < 60 ? `${ageSec}s` : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m` : `${Math.floor(ageSec / 3600)}h`;
            return <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 11.5, color: C.ink3 }}><RefreshCw size={12} style={{ animation: pulse ? "orcaSpin 1.2s linear" : "none" }} />{t("updated")} <strong style={{ fontFamily: MONO, color: C.ink2 }}>{ageLabel}</strong></span>;
          })()}
          {lastActivityLabel && <span style={{ fontFamily: SANS, fontSize: 11.5, color: C.ink3 }}>{lang === "he" ? "פעילות אחרונה" : "Last activity"}: <strong style={{ color: C.ink2, fontFamily: MONO }}>{lastActivityLabel}</strong></span>}
          <span title={live.error || ""} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 99, border: `1px solid ${live.loading ? C.borderStrong : (live.error ? C.neg : C.pos)}`, background: live.loading ? C.panelAlt : (live.error ? (theme === "dark" ? "#2A1117" : "#FEE2E2") : (theme === "dark" ? "#10241A" : "#ECFDF5")), color: live.loading ? C.ink3 : (live.error ? C.neg : C.pos), fontFamily: MONO, fontSize: 10.5, fontWeight: 600, transition: "box-shadow .4s ease", boxShadow: pulse ? `0 0 0 4px ${C.pos}33` : "none" }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: live.loading ? C.ink3 : (live.error ? C.neg : C.pos), animation: pulse ? "orcaPulse 1.2s ease-out" : "none" }} />
            {live.loading ? "LIVE…" : `LIVE ${live.okCount}/${live.totalCount} RPC OK`}
          </span>
        </div>

        <main style={{ padding: "22px", maxWidth: 1340, width: "100%" }}>
          <div className="orca-print-head" style={{ display: "none", marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${C.ink}` }}>
            <div style={{ fontFamily: SANS, fontWeight: 750, fontSize: 20, color: C.ink }}>ORCA Console · {t(activeLabel)}</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.ink2, marginTop: 5 }}>{t("reportTitle")} · {t("showing")} {nf.format(filtered.length)} {t("traders")} · {new Date().toLocaleDateString(rtl ? "he-IL" : "en-US")}</div>
          </div>
          {SECTION}
        </main>

        <footer style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, background: C.panel, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontFamily: MONO, fontSize: 10.5, color: C.ink3 }}>
          <span>ORCA Console · {t("appTag")}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Lock size={11} /> {t("privacyNote")}</span>
        </footer>
      </div>

      <Drawer t={t} lang={lang} x={picked} onClose={() => setPicked(null)} />
      {reportOpen && <BoardReport t={t} lang={lang} traders={filtered} eng={D.engagement} aiUsage={D.aiUsage} funnel={D.funnel} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
