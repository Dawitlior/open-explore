// Delivery layer: Derivation Engine, Duplicate Guard, Notes Overflow, Gap Analysis (Readiness).
// master-plan §10, §11. Runs derive BEFORE gap-analysis (a derived qty satisfies Tier-1).
import { CanonicalTrade, FieldMatch, ColumnProfile, GapReport, GapItem, UnitsMode } from '../types';
import { byCanonical } from '../dictionary/canonical-fields';

// ── Derivation Engine ───────────────────────────────────
export function deriveTrade(t: CanonicalTrade): void {
  const d = t.derivedFields;
  if (t.quantity == null && t.positionSize != null && t.entryPrice) { t.quantity = t.positionSize / t.entryPrice; d.push('quantity'); }
  if (t.positionSize == null && t.quantity != null && t.entryPrice) { t.positionSize = t.entryPrice * t.quantity; d.push('positionSize'); }
  if (t.pnl == null && t.exitPrice != null && t.entryPrice && t.quantity != null) {
    const sign = t.direction === 'long' ? 1 : -1;
    t.pnl = (t.exitPrice - t.entryPrice) * t.quantity * sign - (t.commission || 0) - (t.swapFunding || 0);
    d.push('pnl');
  }
  if (t.pnlPercent == null && t.pnl != null && t.entryPrice && t.quantity != null && t.entryPrice * t.quantity !== 0) {
    t.pnlPercent = t.pnl / (t.entryPrice * t.quantity) * 100; d.push('pnlPercent');
  }
  if (t.riskAmount == null && t.stopLoss != null && t.entryPrice && t.quantity != null) {
    t.riskAmount = Math.abs(t.entryPrice - t.stopLoss) * t.quantity; d.push('riskAmount');
  }
  if (t.rMultiple == null && t.pnl != null && t.riskAmount) { t.rMultiple = t.pnl / t.riskAmount; d.push('rMultiple'); }
  if (!t.direction && t.exitPrice != null && t.entryPrice != null && t.pnl != null) {
    t.direction = (t.exitPrice >= t.entryPrice) === (t.pnl >= 0) ? 'long' : 'short'; d.push('direction(inferred)');
  }
}

// ── Notes Overflow ──────────────────────────────────────
export function buildNotesOverflow(pairs: [string, any][]): string {
  const parts = pairs.filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${v}`);
  return parts.length ? `[ייבוא] ${parts.join(' | ')}` : '';
}
export function appendNotes(existing: string, overflow: string): string {
  if (!overflow) return existing || '';
  return existing ? `${existing}\n${overflow}` : overflow;
}

// ── Duplicate Guard ─────────────────────────────────────
export function dedupKey(t: CanonicalTrade): string {
  if (t.externalIds && t.externalIds.length) return 'x:' + t.externalIds.slice().sort().join(',');
  return ['c', t.symbol, t.entryDate, t.entryPrice, t.quantity, t.direction].join('|');
}
export function markDuplicates(trades: CanonicalTrade[], existingKeys: Set<string> = new Set()): number {
  const seen = new Set(existingKeys); let dups = 0;
  for (const t of trades) { const k = dedupKey(t); if (seen.has(k)) { t.warnings.push('possible duplicate'); (t as any)._dup = true; dups++; } else seen.add(k); }
  return dups;
}

// ── Gap Analysis / Readiness ────────────────────────────
export function detectUnitsMode(mapping: FieldMatch[]): UnitsMode {
  const has = (f: string) => mapping.some(m => m.field === f);
  const money = has('quantity') || has('positionSize') || has('pnl');
  const r = has('rMultiple') || has('riskPercent');
  if (money && r) return 'HYBRID';
  if (r && !money) return 'R_MODE';
  return 'MONEY';
}

const MSG: Record<string, GapItem> = {
  T1_SYMBOL: { code:'T1_SYMBOL', severity:'blocker', he:'לא זוהתה עמודת "שם נייר / מטבע / Symbol".', en:'No Symbol/Instrument column detected.', fix:{ he:'מפה ידנית או הוסף עמודה וטען מחדש', en:'Map manually or add the column and re-upload' } },
  T1_ENTRYDATE: { code:'T1_ENTRYDATE', severity:'blocker', he:'לא זוהה תאריך כניסה.', en:'No entry date detected.' },
  T1_ENTRYPRICE: { code:'T1_ENTRYPRICE', severity:'blocker', he:'לא זוהה מחיר כניסה.', en:'No entry price detected.' },
  T1_DIRECTION: { code:'T1_DIRECTION', severity:'blocker', he:'לא זוהה כיוון (long/short).', en:'No direction detected.' },
  T1_SIZE: { code:'T1_SIZE', severity:'blocker', he:'לא זוהתה כמות/גודל פוזיציה (ולא R להסקה).', en:'No quantity/size (and no R to derive from).' },
  T2_EXIT: { code:'T2_EXIT', severity:'warning', he:'לא נמצא מחיר/תאריך יציאה — עסקאות פתוחות ייובאו כ-open.', en:'No exit — open positions imported as open.' },
  T2_COMMISSION: { code:'T2_COMMISSION', severity:'warning', he:'לא זוהתה עמלה — תיכתב הערה "עמלה: לא דווחה".', en:'No commission — a note is appended.' },
  INFO_COMM_NOTES: { code:'INFO_COMM_NOTES', severity:'info', he:'עמלה תיכתב אוטומטית בהערות כל עסקה.', en:'Commission appended to each trade’s notes.' },
  INFO_BALANCE: { code:'INFO_BALANCE', severity:'info', he:'יתרת מזומן תזין את גרפי ה-Equity (לא יומן העסקאות).', en:'Cash balance feeds equity charts.' },
  WARN_DATE_AMBIG: { code:'WARN_DATE_AMBIG', severity:'warning', he:'פורמט התאריך לא חד-משמעי — אשר DD/MM או החלף ל-MM/DD.', en:'Date format ambiguous — confirm DD/MM or switch to MM/DD.' },
  WARN_DATE_CONFLICT: { code:'WARN_DATE_CONFLICT', severity:'warning', he:'עמודת התאריך מכילה גם DD/MM וגם MM/DD — בדיקה ידנית.', en:'Date column mixes DD/MM and MM/DD — manual check.' },
};

export function gapAnalysis(mapping: FieldMatch[], trades: CanonicalTrade[], equityCount: number, rowsSkipped: number, duplicates: number, dateAmbiguous: boolean, dateConflict: boolean, archetype = ''): GapReport {
  const has = (f: string) => mapping.some(m => m.field === f);
  const unitsMode = detectUnitsMode(mapping);
  const items: GapItem[] = [];
  let t1 = 0, t2 = 0, t3 = 0;

  const snapshot = archetype === 'D_POSITIONS_SNAPSHOT';
  if (!has('symbol')) { items.push(MSG.T1_SYMBOL); t1++; }
  if (snapshot) {
    items.push({ code:'INFO_SNAPSHOT', severity:'info', he:'זוהה צילום מצב פוזיציות (לא יומן עסקאות) — מיובא כאחזקות פתוחות.', en:'Positions snapshot detected — imported as open holdings.' });
  } else {
    if (!has('entryDate')) { items.push(MSG.T1_ENTRYDATE); t1++; }
    if (!has('entryPrice')) { items.push(MSG.T1_ENTRYPRICE); t1++; }
    if (!has('direction') && !(has('exitPrice') && has('pnl'))) { items.push(MSG.T1_DIRECTION); t1++; }
    const sizeOk = has('quantity') || has('positionSize') || (unitsMode !== 'MONEY' && (has('rMultiple') && (has('entryPrice') || has('stopLoss'))));
    if (!sizeOk) { items.push(MSG.T1_SIZE); t1++; }
  }

  if (!has('exitPrice') && !has('exitDate')) { items.push(MSG.T2_EXIT); t2++; }
  if (!has('commission')) { items.push(MSG.T2_COMMISSION); t2++; } else items.push(MSG.INFO_COMM_NOTES);
  if (has('cashBalance')) items.push(MSG.INFO_BALANCE);
  if (dateConflict) { items.push(MSG.WARN_DATE_CONFLICT); }
  else if (dateAmbiguous) { items.push(MSG.WARN_DATE_AMBIG); }

  for (const f of ['stopLoss','takeProfit','strategy','leverage']) if (!has(f)) t3++;

  let readiness = 100 - 40 * t1 - 8 * t2 - 2 * t3;
  const closed = trades.filter(t => t.status === 'closed').length;
  const open = trades.filter(t => t.status === 'open').length;
  readiness = Math.max(0, Math.min(100, readiness));

  return { readiness, unitsMode, items, counts: { tradesClosed: closed, tradesOpen: open, equityEvents: equityCount, rowsSkipped, duplicates } };
}
