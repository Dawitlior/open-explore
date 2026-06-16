// Orchestrator S0–S8: SheetInput[] -> ImportResult. Pure; no UI, no I/O.
import { SheetInput, ImportResult, CanonicalTrade, EquityEvent, FieldMatch } from './types';
import { cleanCell, isNullToken, normalizeHeader } from './matching/normalize';
import { profileColumn } from './matching/profiling';
import { buildScoreMatrix, assign } from './matching/tiers';
import { resolve } from './matching/resolve';
import { detectStructure, pickSheet } from './structure/structure';
import { decideDateFormat, parseDate, parseNumber, normalizeDirection, normalizeSymbol } from './matching/values';
import { classifyArchetype, reconstructFIFO, StreamItem } from './reconstruction/reconstruction';
import { ACTIVITY_VALUES, byCanonical } from './dictionary/canonical-fields';

export interface RunImportOptions {
  /** Force-set canonical field by absolute columnIndex; null = ignore column. */
  mappingOverrides?: Record<number, string | null>;
}
import { deriveTrade, gapAnalysis, markDuplicates, detectUnitsMode, buildNotesOverflow, appendNotes } from './delivery/delivery';

let _tid = 0; const tid = () => 't' + (++_tid);
const colByField = (m: FieldMatch[], f: string) => { const x = m.find(z => z.field === f); return x ? x.columnIndex : -1; };
function classifyActivity(v: string): string | null {
  const s = cleanCell(v).toLowerCase();
  for (const k in ACTIVITY_VALUES) if (ACTIVITY_VALUES[k].indexOf(s) >= 0) return k;
  return null;
}

export function runImport(sheets: SheetInput[], opts?: RunImportOptions): ImportResult {
  const sheet = pickSheet(sheets);
  const st = detectStructure(sheet);
  const m = sheet.matrix;
  const [c0, c1] = st.regionCols;

  // columns over the data region (for profiling we use the classified data rows)
  const cols: string[][] = [];
  for (let c = c0; c <= c1; c++) { const col: string[] = []; for (const r of st.dataRowIndices) col.push(cleanCell((m[r] || [])[c])); cols.push(col); }
  const profiles = cols.map((col, i) => profileColumn(i, st.headers[i] || '', normalizeHeader(st.headers[i] || '', true), col));

  const ranked = buildScoreMatrix(profiles);
  let mapping = assign(profiles, ranked);
  mapping = resolve(mapping, profiles);

  // STAGE 2: user mapping overrides (forced by the Preflight editor).
  if (opts?.mappingOverrides) {
    const ov = opts.mappingOverrides;
    for (const fm of mapping) {
      if (!Object.prototype.hasOwnProperty.call(ov, fm.columnIndex)) continue;
      const forced = ov[fm.columnIndex];
      if (forced) {
        fm.field = forced;
        fm.destination = byCanonical[forced]?.destination;
        fm.status = 'auto';
        fm.score = 100;
        fm.evidence = [`USER override → ${forced}`, ...fm.evidence];
      } else {
        fm.field = null;
        fm.destination = undefined;
        fm.status = 'unmapped';
        fm.score = 0;
        fm.evidence = ['USER ignored', ...fm.evidence];
      }
    }
  }

  const archetype = classifyArchetype(mapping, profiles);
  const unitsMode = detectUnitsMode(mapping);

  const eIdx = colByField(mapping, 'entryDate');
  const dateDecision = eIdx >= 0 ? decideDateFormat(cols[eIdx]) : { fmt: 'UNKNOWN' as const, ambiguous: true, conflict: false };

  // assemble per-row records over the region, only for real data rows
  let rows: string[][] = st.dataRowIndices.map(r => { const slice: string[] = []; for (let c = c0; c <= c1; c++) slice.push(cleanCell((m[r] || [])[c])); return slice; });

  const colIdx = (f: string) => { const i = colByField(mapping, f); return i >= 0 ? i - c0 : -1; }; // index within slice
  const gNum = (rv: string[], f: string) => { const i = colIdx(f); return i >= 0 ? parseNumber(rv[i]) : null; };
  const gStr = (rv: string[], f: string) => { const i = colIdx(f); return i >= 0 ? rv[i] : ''; };

  // detect reverse-chronological file (newest-first) and flip to ascending for FIFO (calibration #12/#50)
  if (eIdx >= 0 && rows.length > 1) {
    const di = colIdx('entryDate');
    const d0 = parseDate(rows[0][di], dateDecision), dN = parseDate(rows[rows.length - 1][di], dateDecision);
    if (d0 && dN && d0 > dN) rows = rows.slice().reverse();
  }

  const equityEvents: EquityEvent[] = [...st.specialRows.equityEvents];
  let trades: CanonicalTrade[] = [];

  if (archetype === 'B_FILLS_LOG' || archetype === 'C_ACCOUNT_STATEMENT') {
    const stream: StreamItem[] = []; let seq = 0;
    const actIdx = colIdx('activityType');
    const dirIdxLocal = colIdx('direction');
    for (const rv of rows) {
      const sym = normalizeSymbol(gStr(rv, 'symbol'));
      const dir = normalizeDirection(gStr(rv, 'direction'));
      const price = gNum(rv, 'entryPrice'); const qty = gNum(rv, 'quantity');
      const dateRaw = gStr(rv, 'entryDate'); const date = parseDate(dateRaw, dateDecision) || dateRaw;
      const fee = gNum(rv, 'commission'); const ext = gStr(rv, 'externalId');
      // Prefer a dedicated activity column; otherwise try to classify the direction cell
      // (Israeli broker statements stuff dividend/deposit/fee tokens into "סוג פעולה").
      let act: string | null = actIdx >= 0 ? classifyActivity(rv[actIdx]) : null;
      if (!act && dirIdxLocal >= 0) act = classifyActivity(rv[dirIdxLocal]);
      if (!act) act = 'trade';
      if (act === 'funding') { if (sym && date) stream.push({ symbol: sym, date, seq: seq++, kind: 'funding', amount: fee ?? 0 }); continue; }
      if (['deposit','withdrawal','dividend','interest','tax','transfer','fee'].indexOf(act || '') >= 0) {
        equityEvents.push({ date, type: act as any, amount: gNum(rv, 'positionSize') ?? fee ?? 0 }); continue;
      }
      if (!sym || price == null || qty == null || !dir) continue;
      stream.push({ symbol: sym, date, seq: seq++, kind: 'trade', side: dir === 'long' ? 'buy' : 'sell', price, quantity: qty, fee: fee ?? 0, externalId: ext || undefined, liquidation: act === 'liquidation' });
    }
    const rec = reconstructFIFO(stream);
    trades = rec.trades.concat(rec.open);
    const fillCount = stream.filter(s => s.kind === 'trade').length;
    st.notes.push(`FIFO: ${fillCount} fills -> ${rec.trades.length} closed + ${rec.open.length} open; funding ${rec.fundingApplied} applied / ${rec.fundingOrphan} orphan`);
  } else {
    const tIdx = colIdx('timeOnly');
    for (const rv of rows) {
      const sym = normalizeSymbol(gStr(rv, 'symbol')); if (!sym) continue;
      let entryRaw = gStr(rv, 'entryDate');
      if (tIdx >= 0 && entryRaw && !/\d:\d/.test(entryRaw)) entryRaw = entryRaw + ' ' + rv[tIdx];
      const entry = parseDate(entryRaw, dateDecision) || entryRaw;
      const exitRaw = gStr(rv, 'exitDate'); const exit = exitRaw ? (parseDate(exitRaw, dateDecision) || exitRaw) : undefined;
      const dir = normalizeDirection(gStr(rv, 'direction')) || 'long';
      const isSnapshot = archetype === 'D_POSITIONS_SNAPSHOT';
      const entryPrice = gNum(rv, 'entryPrice') ?? (isSnapshot ? (gNum(rv, 'currentPrice') ?? 0) : 0);
      const t: CanonicalTrade = {
        id: tid(), externalIds: [gStr(rv, 'externalId')].filter(Boolean), symbol: sym, symbolRaw: gStr(rv, 'symbol'),
        direction: dir, status: isSnapshot ? 'open' : ((gNum(rv, 'exitPrice') != null || exit) ? 'closed' : 'open'), entryDate: entry, exitDate: exit,
        entryPrice, exitPrice: gNum(rv, 'exitPrice') ?? undefined,
        quantity: gNum(rv, 'quantity') ?? undefined, positionSize: gNum(rv, 'positionSize') ?? undefined,
        leverage: gNum(rv, 'leverage') ?? undefined, stopLoss: gNum(rv, 'stopLoss') ?? undefined,
        takeProfit: gNum(rv, 'takeProfit') ?? undefined, riskAmount: gNum(rv, 'riskAmount') ?? undefined,
        rMultiple: gNum(rv, 'rMultiple') ?? undefined, pnl: gNum(rv, 'pnl') ?? undefined,
        pnlPercent: gNum(rv, 'pnlPercent') ?? undefined, commission: gNum(rv, 'commission') ?? undefined,
        unitsMode, notes: gStr(rv, 'notes'), derivedFields: [], warnings: [],
      };
      const bal = gNum(rv, 'cashBalance'); if (bal != null) equityEvents.push({ date: entry, type: 'balance_snapshot', amount: bal });
      trades.push(t);
    }
  }

  for (const t of trades) {
    deriveTrade(t);
    const overflow = buildNotesOverflow([['עמלה', t.commission != null ? t.commission : undefined], ['מימון', t.swapFunding ? t.swapFunding : undefined]]);
    t.notes = appendNotes(t.notes, overflow); t.unitsMode = unitsMode;
  }
  const duplicates = markDuplicates(trades);
  const rowsSkipped = Object.values(st.skipped).reduce((a, b) => a + b, 0);
  const gap = gapAnalysis(mapping, trades, equityEvents.length, rowsSkipped, duplicates, dateDecision.ambiguous, dateDecision.conflict, archetype);

  return { sheetName: sheet.name, archetype, mapping, trades, equityEvents, gap, dateDecision, structure: st };
}
