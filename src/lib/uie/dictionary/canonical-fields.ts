// UIE v1.2 — Phase 1 · Canonical field dictionary
// Bilingual (HE/EN) aliases for 19 new canonical fields + existing mirrors.
// `pendingContent: true` => mapping is only finalised after Phase 2 content
// rules confirm. In Phase 1 these emit `status: 'pending-content'`.

import type { CanonicalField } from '../canonical-trade';

export interface CanonicalDef {
  field: CanonicalField;
  aliases: string[];            // normalised forms (lower, ascii where possible)
  pendingContent?: boolean;     // depends on Phase 2 content rules
}

// Aliases here are matched against `NormalizedHeader.primary` and `.variants`.
// Keep them lowercase and free of parenthetical chunks (normalizer strips those).
export const CANONICAL_DICT: CanonicalDef[] = [
  // ── existing mirrors (kept here so the new engine wins before fallback) ──
  { field: 'date', aliases: ['date', 'trade date', 'תאריך', 'יום מסחר'] },
  { field: 'time', aliases: ['time', 'שעה'] },
  { field: 'symbol', aliases: ['symbol', 'ticker', 'instrument', 'pair', 'asset', 'coin', 'מטבע', 'נכס', 'סימול'] },
  { field: 'direction', aliases: ['side', 'direction', 'position', 'long short', 'כיוון', 'פוזיציה'] },
  { field: 'orderType', aliases: ['order type', 'type', 'סוג הוראה', 'סוג עסקה'] },
  { field: 'entry', aliases: ['entry', 'entry price', 'open price', 'מחיר כניסה', 'פתיחה'] },
  { field: 'exit', aliases: ['exit', 'exit price', 'close price', 'מחיר יציאה', 'סגירה'] },
  { field: 'stopLoss', aliases: ['stop', 'stop loss', 'sl', 'סטופ', 'סטופ לוס'] },
  { field: 'takeProfit', aliases: ['take profit', 'tp', 'target', 'מטרה', 'יעד'] },
  { field: 'positionSize', aliases: ['size', 'qty', 'quantity', 'amount', 'volume', 'contracts', 'כמות', 'גודל פוזיציה'] },
  { field: 'pnl', aliases: ['pnl', 'p l', 'profit loss', 'net pnl', 'רווח הפסד', 'רווח'] },
  { field: 'fees', aliases: ['fee', 'fees', 'commission', 'עמלה', 'עמלות'] },
  { field: 'leverage', aliases: ['leverage', 'lev', 'מינוף'] },
  { field: 'balance', aliases: ['balance', 'equity', 'account balance', 'יתרה'] },
  { field: 'comments', aliases: ['notes', 'comment', 'comments', 'remark', 'remarks', 'הערות'] },
  { field: 'rowIndex', aliases: ['row', 'no', 'index', 'trade no', 'trade id', 'מספר'] },

  // ── 19 new canonical fields ──────────────────────────────────────────────
  { field: 'entryDate', aliases: ['entry date', 'open date', 'opened at', 'open time', 'תאריך פתיחה', 'תאריך כניסה'] },
  { field: 'exitDate', aliases: ['exit date', 'close date', 'closed at', 'close time', 'תאריך סגירה', 'תאריך יציאה'] },
  { field: 'durationStr', aliases: ['duration', 'hold time', 'time in trade', 'משך', 'זמן החזקה'] },
  { field: 'avgEntry', aliases: ['avg entry', 'average entry', 'avg open', 'average open price', 'מחיר כניסה ממוצע'] },
  { field: 'avgExit', aliases: ['avg exit', 'average exit', 'avg close', 'average close price', 'מחיר יציאה ממוצע'] },
  { field: 'maxOpenSize', aliases: ['max open size', 'peak size', 'max position', 'גודל מקסימלי'] },
  { field: 'realizedPnl', aliases: ['realized pnl', 'realised pnl', 'closed pnl', 'רווח ממומש'] },
  { field: 'unrealizedPnl', aliases: ['unrealized pnl', 'unrealised pnl', 'open pnl', 'floating pnl', 'רווח לא ממומש'] },
  { field: 'feeOpen', aliases: ['open fee', 'entry fee', 'opening commission', 'עמלת פתיחה'] },
  { field: 'feeClose', aliases: ['close fee', 'exit fee', 'closing commission', 'עמלת סגירה'] },
  { field: 'feeTotal', aliases: ['total fee', 'total fees', 'total commission', 'סך עמלות'] },
  { field: 'fundingFee', aliases: ['funding', 'funding fee', 'swap', 'funding payment', 'עמלת מימון', 'סוואפ'] },
  { field: 'rMultiple', aliases: ['r multiple', 'r value', 'r', 'risk multiple', 'מכפיל סיכון'], pendingContent: true },
  { field: 'riskAmount', aliases: ['risk', 'risk amount', 'risk usd', 'amount at risk', 'סכום סיכון'], pendingContent: true },
  { field: 'riskPct', aliases: ['risk percent', 'risk pct', 'risk %', 'risk percentage', 'אחוז סיכון'], pendingContent: true },
  { field: 'returnPct', aliases: ['return', 'return percent', 'return pct', 'roi', 'תשואה', 'אחוז תשואה'], pendingContent: true },
  { field: 'mfe', aliases: ['mfe', 'max favorable excursion', 'max favourable excursion'] },
  { field: 'mae', aliases: ['mae', 'max adverse excursion'] },
  { field: 'status', aliases: ['status', 'state', 'trade status', 'סטטוס', 'מצב'] },
  { field: 'liquidated', aliases: ['liquidated', 'liquidation', 'liq', 'נוזל', 'חיסול'] },
  { field: 'externalId', aliases: ['external id', 'broker id', 'order id', 'trade ref', 'reference', 'מזהה'] },
];

// Build a flat lookup for fast P1 exact matching.
export const EXACT_INDEX: Map<string, CanonicalDef> = (() => {
  const m = new Map<string, CanonicalDef>();
  for (const def of CANONICAL_DICT) {
    for (const a of def.aliases) m.set(a.toLowerCase().trim(), def);
  }
  return m;
})();
