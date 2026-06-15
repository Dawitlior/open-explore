// Structure detection: header-row scoring, region segmentation (side-panels),
// special rows, sub-header mining, multi-sheet table-score. Calibration §5, §6, #26-#34.
import { RawMatrix, StructureResult, SheetInput, EquityEvent } from '../types';
import { cleanCell, isNullToken, normalizeHeader } from '../matching/normalize';
import { FIELD_TAXONOMY, TOTALS_TOKENS } from '../dictionary/canonical-fields';
import { parseNumber } from '../matching/values';

const ALIAS_SET = new Set<string>();
for (const f of FIELD_TAXONOMY) for (const l of ['he','en'] as const) for (const a of f.aliases[l]) ALIAS_SET.add(normalizeHeader(a, false));

function rowFilled(row: string[]): number { return row.filter(c => !isNullToken(c)).length; }
function headerScore(row: string[], next: string[] | undefined): number {
  let aliasHits = 0, textCells = 0, numCells = 0;
  for (const c of row) {
    const v = cleanCell(c); if (isNullToken(v)) continue;
    if (ALIAS_SET.has(normalizeHeader(v, false)) || ALIAS_SET.has(normalizeHeader(v, true))) aliasHits++;
    if (parseNumber(v) !== null) numCells++; else textCells++;
  }
  let s = 3 * aliasHits + textCells - 2 * numCells;
  if (cleanCell(row[0] || '').length > 40) s -= 5;
  if (next) { const nf = rowFilled(next); const nn = next.filter(c => parseNumber(c) !== null).length; if (nf && nn / nf > 0.3) s += 2; }
  return s;
}

// score a whole sheet for "is this a trades table"
export function tableScore(m: RawMatrix): number {
  let best = -1e9;
  for (let r = 0; r < Math.min(m.length, 15); r++) best = Math.max(best, headerScore(m[r] || [], m[r+1]));
  return best;
}

export function pickSheet(sheets: SheetInput[]): SheetInput {
  let bestIdx = 0, best = -1e9;
  sheets.forEach((s, i) => {
    const m = s.matrix;
    let hbest = -1e9, hrow = 0;
    for (let r = 0; r < Math.min(m.length, 15); r++) { const sc = headerScore(m[r] || [], m[r+1]); if (sc > hbest) { hbest = sc; hrow = r; } }
    let dataRows = 0;
    for (let r = hrow + 2; r < m.length; r++) if (rowFilled(m[r] || []) >= 2) dataRows++;
    let sc = hbest + Math.min(dataRows, 50) * 0.5;
    if (dataRows === 0) sc -= 1000;                    // empty sheet: last resort only (calibration #26)
    if (sc > best) { best = sc; bestIdx = i; }
  });
  return sheets[bestIdx];
}

// detect contiguous empty-column runs as region boundaries; return [start,end] of the region holding the header
function colNonEmpty(m: RawMatrix, c: number, fromRow: number): number {
  let n = 0; for (let r = fromRow; r < m.length; r++) if (!isNullToken((m[r] || [])[c])) n++;
  return n;
}

export function detectStructure(sheet: SheetInput): StructureResult {
  const m = sheet.matrix;
  const maxCols = m.reduce((a, r) => Math.max(a, r.length), 0);
  // 1. header row
  let headerRow = 0, hbest = -1e9;
  for (let r = 0; r < Math.min(m.length, 15); r++) { const sc = headerScore(m[r] || [], m[r+1]); if (sc > hbest) { hbest = sc; headerRow = r; } }
  const metaBlock: string[] = [];
  for (let r = 0; r < headerRow; r++) { const t = (m[r] || []).map(cleanCell).filter(x => !isNullToken(x)).join(' '); if (t) metaBlock.push(t); }

  // 2. region segmentation (column bands separated by empty columns), pick band containing header alias hits
  const headerCells = m[headerRow] || [];
  const bands: [number, number][] = [];
  let start = -1;
  for (let c = 0; c < maxCols; c++) {
    const filledInHeader = !isNullToken(headerCells[c]);
    const colHas = colNonEmpty(m, c, headerRow) > 0;
    if (filledInHeader || colHas) { if (start < 0) start = c; }
    else { if (start >= 0) { bands.push([start, c - 1]); start = -1; } }
  }
  if (start >= 0) bands.push([start, maxCols - 1]);
  // choose band with most alias hits in header row
  let region: [number, number] = bands[0] || [0, maxCols - 1];
  let regBest = -1;
  for (const b of bands) {
    let hits = 0; for (let c = b[0]; c <= b[1]; c++) { const v = cleanCell(headerCells[c]); if (ALIAS_SET.has(normalizeHeader(v,false)) || ALIAS_SET.has(normalizeHeader(v,true))) hits++; }
    if (hits > regBest) { regBest = hits; region = b; }
  }

  const headers: string[] = [];
  for (let c = region[0]; c <= region[1]; c++) headers.push(cleanCell(headerCells[c]));

  // 3. sub-header (description) row right after header
  let dataStart = headerRow + 1;
  let subHeader: string[] = [];
  const cand = m[headerRow + 1];
  if (cand) {
    let longText = 0, filled = 0;
    for (let c = region[0]; c <= region[1]; c++) { const v = cleanCell(cand[c]); if (!isNullToken(v)) { filled++; if (v.length > 15 || /do not edit|אל תער|דוגמא|qty|enter/i.test(v)) longText++; } }
    if (filled && longText / filled >= 0.4) { subHeader = headers.map((_, i) => cleanCell(cand[region[0] + i])); dataStart = headerRow + 2; }
  }

  // 4. scan data rows for special/skip classification
  const skipped = { totals: 0, repeated: 0, description: 0, example: 0, indexOnly: 0, seedBalance: 0, cashAsRow: 0, blank: 0 };
  const equityEvents: EquityEvent[] = [];
  const notes: string[] = [];
  let dataEnd = m.length - 1;
  const dataRowIndices: number[] = [];
  const headerNormJoined = headers.map(h => normalizeHeader(h,false)).join('|');
  // locate balance & symbol & value columns (by header alias) for special-row handling
  const colIdxByField = (fieldAliases: string[]) => {
    const normAliases = fieldAliases.map(a => normalizeHeader(a, true));
    for (let c = region[0]; c <= region[1]; c++) { const hn = normalizeHeader(cleanCell(headerCells[c]), true); if (normAliases.indexOf(hn) >= 0) return c; }
    return -1;
  };
  const balCol = colIdxByField(['יתרת מזומן','יתרה','balance','equity','running balance','after trade','יתרת חשבון']);
  const symCol = colIdxByField(['שם הנייר','symbol','coin','מטבע','נייר','market','נכס']);
  const valCol = colIdxByField(['שווי','value','amount','סכום','total']);

  for (let r = dataStart; r < m.length; r++) {
    const row = m[r] || [];
    const slice: string[] = []; for (let c = region[0]; c <= region[1]; c++) slice.push(cleanCell(row[c]));
    const filled = slice.filter(x => !isNullToken(x)).length;
    if (filled === 0) { skipped.blank++; continue; }
    const first = slice[0] || '';
    // totals
    if (TOTALS_TOKENS.indexOf(normalizeHeader(first,false)) >= 0 || (filled <= 3 && /total|סה/.test(first))) { skipped.totals++; continue; }
    // repeated header
    if (slice.map(h => normalizeHeader(h,false)).join('|') === headerNormJoined) { skipped.repeated++; continue; }
    // cash-as-row (symbol cell says "cash"/"יתרת מזומן")
    if (symCol >= 0) { const sv = normalizeHeader(cleanCell(row[symCol]),true); if (/מזומן|cash|יתרת/.test(sv)) { const amt = parseNumber(row[valCol >= 0 ? valCol : symCol]); if (amt !== null) equityEvents.push({ date: '', type: 'balance_snapshot', amount: amt, description: 'cash-as-row' }); skipped.cashAsRow++; continue; } }
    // index-only (only the rowIndex/# col filled)
    if (filled === 1 && parseNumber(first) !== null) { skipped.indexOnly++; continue; }
    // seed-balance (only balance col filled, nothing else meaningful)
    if (balCol >= 0 && filled <= 2) { const b = parseNumber(row[balCol]); const others = slice.filter((x,i)=> (region[0]+i)!==balCol && !isNullToken(x)).length; if (b !== null && others === 0) { equityEvents.push({ date:'', type:'balance_snapshot', amount: b, description: 'seed balance' }); skipped.seedBalance++; continue; } }
    // example row ("eg." / "דוגמא" in first cell or rowIndex non-numeric)
    if (/^(eg\.?|example|דוגמ)/i.test(first)) { skipped.example++; continue; }
    dataEnd = r; dataRowIndices.push(r);
  }

  if (subHeader.length) notes.push('sub-header row mined as evidence (description row)');
  if (metaBlock.length) notes.push(`meta block: ${metaBlock.slice(0,2).join(' / ').slice(0,80)}`);

  return { sheetName: sheet.name, headerRowIndex: headerRow, dataStart, dataEnd, regionCols: region, dataRowIndices, headers, metaBlock, subHeader, skipped, specialRows: { equityEvents }, notes };
}
