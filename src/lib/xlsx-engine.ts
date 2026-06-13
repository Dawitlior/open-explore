import * as XLSX from 'xlsx';
import type { Trade } from '@/data/trades';
import { sanitizeTrade } from './trade-sanitizer';

// ═══════════════════════════════════════════════════
// HEADER MAPPING: English ↔ Hebrew ↔ Internal Field
// ═══════════════════════════════════════════════════

const HEADER_MAP: Record<string, keyof Trade | '_ignore'> = {
  '#': '_ignore',
  'nr.': '_ignore',
  'nr': '_ignore',
  'trade no': '_ignore',
  // English headers
  'entry date/time': 'date',
  'entry date': 'date',
  'date': 'date',
  'exit date/time': '_ignore',
  'trade duration': '_ignore',
  'coin': 'coin',
  'symbol': 'coin',
  'ticker': 'coin',
  'pair': 'coin',
  'direction': 'direction',
  'side': 'direction',
  'type': 'direction',
  'entry order type': 'orderType',
  'order type': 'orderType',
  'entry': 'entry',
  'entry price': 'entry',
  'stop loss': 'stopLoss',
  'sl': 'stopLoss',
  'stoploss': 'stopLoss',
  'avg exit': 'exit',
  'exit': 'exit',
  'exit price': 'exit',
  'close price': 'exit',
  'desired risk (%)': 'riskPct',
  'risk %': 'riskPct',
  'risk pct': 'riskPct',
  'desired risk (usd)': 'risk',
  'risk $': 'risk',
  'risk usd': 'risk',
  'entry fee': '_ignore',
  'exit fee': '_ignore',
  'min. size': '_ignore',
  'position size': 'positionSize',
  'size': 'positionSize',
  'quantity': 'positionSize',
  'qty': 'positionSize',
  'notional value': '_ignore',
  'risk': 'risk',
  'valid risk?': '_ignore',
  'expected loss': 'expectedLoss',
  'realised loss': '_ignore',
  'realised win': '_ignore',
  'r+/-': 'returnR',
  'r': 'returnR',
  'return r': 'returnR',
  'r multiple': 'returnR',
  'deviation': 'deviation',
  'fees': '_ignore',
  'fee': '_ignore',
  'commission': '_ignore',
  'account size': '_ignore',
  'baseline equity': '_ignore',
  'mfe date/time': '_ignore',
  'mfe trade duration': '_ignore',
  'mfe price': '_ignore',
  'mfe r+/-': '_ignore',
  'mae date/time': '_ignore',
  'mae trade duration': '_ignore',
  'mae price': '_ignore',
  'mae r+/-': '_ignore',
  'early exit reason': '_ignore',
  'rules?': 'rules',
  'rules': 'rules',
  'notes': 'comments',
  'comment': 'comments',
  'comments': 'comments',
  'system no.': '_ignore',
  'system no': '_ignore',
  'leverage': 'leverage',
  'lev': 'leverage',
  'p&l': 'pnl',
  'pnl': 'pnl',
  'profit': 'pnl',
  'profit/loss': 'pnl',
  'result': 'winLoss',
  'win/loss': 'winLoss',
  'outcome': 'winLoss',
  'trade status': 'winLoss',
  // Hebrew headers
  'תאריך כניסה': 'date',
  'תאריך יציאה': '_ignore',
  'משך עסקה': '_ignore',
  'מטבע': 'coin',
  'כיוון': 'direction',
  'סוג פקודת כניסה': 'orderType',
  'כניסה': 'entry',
  'סטופ לוס': 'stopLoss',
  'יציאה ממוצעת': 'exit',
  'סיכון רצוי (%)': 'riskPct',
  'סיכון רצוי (דולר)': 'risk',
  'עמלת כניסה': '_ignore',
  'עמלת יציאה': '_ignore',
  'גודל מינימלי': '_ignore',
  'גודל פוזיציה': 'positionSize',
  'ערך נומינלי': '_ignore',
  'סיכון': 'risk',
  'סיכון תקף?': '_ignore',
  'הפסד צפוי': 'expectedLoss',
  'הפסד ממומש': '_ignore',
  'רווח ממומש': '_ignore',
  'סטייה': 'deviation',
  'עמלות': '_ignore',
  'גודל חשבון': '_ignore',
  'הון בסיס': '_ignore',
  'כללים?': 'rules',
  'הערות': 'comments',
  'מספר מערכת': '_ignore',
  'מינוף': 'leverage',
  // Israeli broker/account statements
  'תאריך': 'date',
  'סוג פעולה': 'direction',
  'פעולה': 'direction',
  'שם הנייר': 'coin',
  'שם נכס': 'coin',
  'נכס': 'coin',
  'סימול': 'coin',
  'כמות': 'positionSize',
  'מחיר ממוצע': 'entry',
  'מחיר': 'entry',
  'סכום הפעולה': '_ignore',
  'עמלה': '_ignore',
  'יתרת מזומן': 'balance',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// UIE v1.2 — Phase 1: try the new canonical engine FIRST, fall back to the
// legacy HEADER_MAP if it returns null. Backward-compatible by design.
import { uieMapHeader, runUIE, type CanonicalTrade } from './uie';

const UIE_TO_TRADE: Partial<Record<string, keyof Trade | '_ignore'>> = {
  date: 'date',
  entryDate: 'date',
  symbol: 'coin',
  direction: 'direction',
  orderType: 'orderType',
  entry: 'entry',
  avgEntry: 'entry',
  exit: 'exit',
  avgExit: 'exit',
  stopLoss: 'stopLoss',
  positionSize: 'positionSize',
  pnl: 'pnl',
  realizedPnl: 'pnl',
  leverage: 'leverage',
  balance: 'balance',
  comments: 'comments',
  riskAmount: 'risk',
  riskPct: 'riskPct',
};

function mapHeaderToField(header: string): keyof Trade | '_ignore' | null {
  // Phase 1: new engine. Only accept mapped (not pending-content) so content
  // rules from Phase 2 stay authoritative for ambiguous semantic columns.
  try {
    const uie = uieMapHeader(header);
    if (uie.status === 'mapped' && uie.field) {
      const mapped = UIE_TO_TRADE[uie.field];
      if (mapped) return mapped;
    }
  } catch {
    // never let the new engine block legacy import
  }
  // Legacy fallback (Zero-Destruction)
  const norm = normalizeHeader(header);
  if (HEADER_MAP[norm]) return HEADER_MAP[norm];
  for (const [key, field] of Object.entries(HEADER_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return field;
  }
  return null;
}

// ═══════════════════════════════════════════════════
// LOCALE-AWARE NUMBER PARSING
// ═══════════════════════════════════════════════════

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isFinite(value) ? value : null;

  let cleaned = String(value).trim();
  if (!cleaned || cleaned === '—' || cleaned === '-') return null;
  const negative = /^\(.*\)$/.test(cleaned) || /^-/.test(cleaned);
  cleaned = cleaned
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/\((.*)\)/, '$1')
    .replace(/[^0-9.,\-]/g, '')
    .replace(/^-/, '')
    .trim();
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    const n = parseFloat(cleaned);
    return isFinite(n) ? (negative ? -n : n) : null;
  }

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) cleaned = cleaned.replace(/,/g, '');
    else cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastComma !== -1) {
    cleaned = /^\d{1,3}(,\d{3})+$/.test(cleaned) ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  } else if (lastDot !== -1) {
    cleaned = /^\d{1,3}(\.\d{3})+$/.test(cleaned) ? cleaned.replace(/\./g, '') : cleaned;
  }

  const num = parseFloat(cleaned);
  return isFinite(num) ? (negative ? -num : num) : null;
}

function parseDeviationValue(value: unknown): number {
  const n = parseNumericValue(value);
  if (n === null) return 0;
  if (typeof value === 'string' && value.includes('%')) return n / 100;
  return Math.abs(n) > 1 ? n / 100 : n;
}

// ═══════════════════════════════════════════════════
// DATE PARSING
// ═══════════════════════════════════════════════════

/** Convert Excel serial date number to JS Date */
function excelSerialToDate(serial: number): Date {
  const epoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const fraction = serial - days;
  const ms = days * 86400000 + Math.round(fraction * 86400000);
  return new Date(epoch.getTime() + ms);
}

/** Parse date string in many formats */
function parseFlexibleDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  // Excel serial number (loosened range: any number 1..200000 covers 1900-02-04..2447)
  if (typeof value === 'number' && value > 1 && value < 200000) {
    const d = excelSerialToDate(value);
    if (!isNaN(d.getTime())) return formatDate(d);
    return null;
  }

  // Date object
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) return formatDate(value);
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Already in YYYY-MM-DD or YYYY/MM/DD format
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (parts) {
      const d = new Date(+parts[1], +parts[2] - 1, +parts[3], +(parts[4] || 0), +(parts[5] || 0));
      if (!isNaN(d.getTime())) return formatDate(d);
    }
    return null;
  }

  // Israeli/European format: DD/MM/YYYY HH:MM (preferred — also accepts -, .)
  // Example: "27/02/2026 13:34" → 2026-02-27 13:34
  const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;

    // STRICT DD/MM/YYYY (Israeli convention) — only fall back to MM/DD if first
    // number is impossible as a day AND second is impossible as a month.
    let day: number, month: number;
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      // Prefer DD/MM (the Israeli way the user explicitly requested)
      day = a; month = b;
    } else if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      // Fallback only when DD/MM is invalid
      month = a; day = b;
    } else {
      day = a; month = b;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, hour, min);
      if (!isNaN(d.getTime())) return formatDate(d);
    }
  }

  // Fallback: native parse — but reconstruct in LOCAL time to avoid TZ drift
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
    return formatDate(local);
  }

  return null;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

// ═══════════════════════════════════════════════════
// ROW VALIDATION
// ═══════════════════════════════════════════════════

function isEmptyRow(mapped: Record<string, unknown>): boolean {
  const entry = parseNumericValue(mapped.entry);
  const stopLoss = parseNumericValue(mapped.stopLoss);
  const exit = parseNumericValue(mapped.exit);
  const positionSize = parseNumericValue(mapped.positionSize);

  // All critical fields are missing/zero → empty row
  return (!entry || entry === 0) && (!stopLoss || stopLoss === 0) && (!exit || exit === 0) && (!positionSize || positionSize === 0);
}

// ═══════════════════════════════════════════════════
// DYNAMIC HEADER DETECTION
// ═══════════════════════════════════════════════════

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxScan = Math.min(range.e.r, 15); // scan first 15 rows

  let bestRow = 0;
  let bestScore = 0;

  for (let r = range.s.r; r <= maxScan; r++) {
    let score = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'string') {
        const field = mapHeaderToField(cell.v);
        if (field) score++;
      }
    }
    if (score > bestScore) { bestScore = score; bestRow = r; }
  }
  return bestRow;
}

interface HeaderDetection {
  index: number;
  headers: Record<string, number>;
  rawHeaders: string[];
  mappedFields: Set<keyof Trade>;
  score: number;
}

function detectHeaderRowFromRows(rows: unknown[][]): HeaderDetection {
  let best: HeaderDetection = { index: 0, headers: {}, rawHeaders: [], mappedFields: new Set(), score: 0 };
  const maxScan = Math.min(rows.length, 25);

  for (let r = 0; r < maxScan; r++) {
    const headers: Record<string, number> = {};
    const rawHeaders: string[] = [];
    const mappedFields = new Set<keyof Trade>();
    let score = 0;

    (rows[r] || []).forEach((h, i) => {
      const raw = String(h ?? '').trim();
      if (!raw) return;
      const norm = normalizeHeader(raw);
      headers[norm] = i;
      rawHeaders.push(raw);
      const field = mapHeaderToField(raw);
      if (field) {
        score += field === '_ignore' ? 1 : 3;
        if (field !== '_ignore') mappedFields.add(field);
      }
    });

    if (headers['#'] !== undefined || headers['nr.'] !== undefined || headers['nr'] !== undefined) score += 4;
    if (mappedFields.has('date')) score += 3;
    if (mappedFields.has('coin')) score += 3;
    if (score > best.score) best = { index: r, headers, rawHeaders, mappedFields, score };
  }

  return best;
}

function formatHeaderList(headers: string[]): string {
  return headers.slice(0, 14).join(', ') || '(אין כותרות / no headers)';
}

function columnWarnings(d: HeaderDetection, nrIndex: number | undefined): string[] {
  const missing: string[] = [];
  if (nrIndex === undefined) missing.push('עמודת # / Nr. חסרה — אורקה יצרה מזהה אוטומטי לכל שורה. / Missing # / Nr. column — Orca generated row IDs automatically.');
  if (!d.mappedFields.has('date')) missing.push('חסרה עמודת תאריך / Date — שורות בלי תאריך תקין ידולגו. / Missing Date column — rows without a valid date will be skipped.');
  if (!d.mappedFields.has('coin')) missing.push('חסרה עמודת שם נכס / Symbol — שורות ייטענו כ-UNKNOWN. / Missing asset name / Symbol column — rows will import as UNKNOWN.');
  if (!d.mappedFields.has('direction')) missing.push('חסרה עמודת כיוון / Direction — ברירת המחדל תהיה Long. / Missing Direction column — default will be Long.');
  if (!d.mappedFields.has('entry')) missing.push('חסרה עמודת מחיר כניסה / Entry — ערך הכניסה יהיה 0. / Missing Entry column — entry price will be 0.');
  if (!d.mappedFields.has('exit')) missing.push('חסרה עמודת יציאה / Exit — הייבוא יצליח, אבל R-Multiple לא יהיה אמין עד השלמה ידנית. / Missing Exit column — import can continue, but R-Multiple will not be reliable until completed manually.');
  if (!d.mappedFields.has('stopLoss')) missing.push('חסרה עמודת Stop Loss — העסקאות ייטענו ללא חישוב R-Multiple מלא. / Missing Stop Loss column — trades import without full R-Multiple calculation.');
  if (!d.mappedFields.has('pnl')) missing.push('חסרה עמודת P&L — רווח/הפסד יישמר כ-0 אם אין נתון אחר לחישוב. / Missing P&L column — profit/loss will be 0 unless another calculable value exists.');
  return missing;
}

function normalizeDirectionValue(value: unknown): Trade['direction'] {
  const s = String(value ?? '').toLowerCase().trim();
  if (s.includes('short') || s === 's' || s.includes('sell') || s.includes('מכירה') || s.includes('שורט')) return 'Short';
  return 'Long';
}

function pickMainSheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  const name = wb.SheetNames.find(n => normalizeHeader(n) === 'main sheet')
    || wb.SheetNames.find(n => normalizeHeader(n).includes('main'))
    || wb.SheetNames.find(n => !['calculations', 'statistics'].includes(normalizeHeader(n)));
  return name ? wb.Sheets[name] : null;
}

function cellAt(row: unknown[], headers: Record<string, number>, names: string[]): unknown {
  for (const name of names) {
    const idx = headers[normalizeHeader(name)];
    if (idx !== undefined) return row[idx];
  }
  return undefined;
}

function parseTimespanMinutes(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Math.round(value * 24 * 60);
  const str = String(value).toLowerCase();
  const day = Number(str.match(/(\d+(?:\.\d+)?)\s*d/)?.[1] || 0);
  const hour = Number(str.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0);
  const min = Number(str.match(/(\d+(?:\.\d+)?)\s*m/)?.[1] || 0);
  if (day || hour || min) return Math.round(day * 1440 + hour * 60 + min);
  const clock = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  return 0;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export function exportToXlsx(trades: Trade[]): void {
  const headers = [
    'System No.', 'ENTRY DATE/TIME', 'COIN', 'DIRECTION', 'ENTRY ORDER TYPE',
    'ENTRY', 'STOP LOSS', 'AVG EXIT', 'DESIRED RISK (%)', 'DESIRED RISK (USD)',
    'POSITION SIZE', 'RISK', 'EXPECTED LOSS', 'R+/-', 'DEVIATION',
    'LEVERAGE', 'RULES?', 'NOTES', 'P&L', 'BALANCE'
  ];

  const data = trades.map(t => [
    t.id, t.date, t.coin, t.direction, t.orderType,
    t.entry, t.stopLoss, t.exit, t.riskPct, t.risk,
    t.positionSize, t.risk, t.expectedLoss, t.returnR, t.deviation,
    t.leverage, t.rules ? 'Yes' : 'No', t.comments, t.pnl, t.balance
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = headers.map(() => ({ wch: 16 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trades');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Orca_Investment_Trades_${dateStr}.xlsx`);
}

// ═══════════════════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════════════════

export interface ImportResult {
  trades: Trade[];
  errors: string[];
  skipped: number;
  imported: number;
}

export function importFromXlsx(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);

        // Detect Apple Numbers (.numbers) files renamed to .xlsx — they're ZIPs containing Index/*.iwa, not real Excel.
        const head = new TextDecoder('latin1').decode(data.slice(0, 4096));
        if (head.startsWith('PK') && (head.includes('Index/Document.iwa') || head.includes('.iwa'))) {
          resolve({
            trades: [],
            errors: [
              'הקובץ הוא Apple Numbers ולא Excel אמיתי. ב-Numbers: File → Export To → Excel (.xlsx) ואז העלה שוב. / File looks like Apple Numbers, not a real .xlsx. In Numbers: File → Export To → Excel (.xlsx), then re-upload.'
            ],
            skipped: 0,
            imported: 0,
          });
          return;
        }

        const wb = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy hh:mm', raw: true });
        const ws = pickMainSheet(wb);
        if (!ws) { resolve({ trades: [], errors: ['Main Sheet not found'], skipped: 0, imported: 0 }); return; }

        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy hh:mm', blankrows: false, defval: '' });
        if (rows.length < 2) { resolve({ trades: [], errors: ['Main Sheet must include headers and data rows'], skipped: 0, imported: 0 }); return; }

        const headerDetection = detectHeaderRowFromRows(rows);
        const headers = headerDetection.headers;
        const nrIndex = headers['#'] ?? headers['nr.'] ?? headers['nr'];
        if (headerDetection.score < 6 || headerDetection.mappedFields.size < 2) {
          const found = formatHeaderList(headerDetection.rawHeaders);
          resolve({
            trades: [],
            errors: [
              `לא זוהתה שורת כותרות אמיתית בקובץ. אורקה סורקת את השורות הראשונות ומחפשת עמודות כמו תאריך, שם הנכס, כיוון, כניסה, יציאה או P&L. כותרות שזוהו: ${found}. / Could not detect a real header row. Orca scans the first rows for columns like Date, Symbol, Direction, Entry, Exit or P&L. Detected headers: ${found}.`
            ],
            skipped: 0,
            imported: 0,
          });
          return;
        }

        const trades: Trade[] = [];
        const errors: string[] = columnWarnings(headerDetection, nrIndex);
        let skipped = 0;
        rows.slice(headerDetection.index + 1).forEach((row, idx) => {
          try {
            const excelRow = headerDetection.index + idx + 2;
            const nr = nrIndex !== undefined ? String(row[nrIndex] ?? '').trim() : String(excelRow);

            const entryDate = parseFlexibleDate(cellAt(row, headers, ['ENTRY DATE/TIME', 'Entry Date', 'Date', 'תאריך כניסה', 'תאריך']));
            if (!entryDate) { skipped++; if (errors.length < 14) errors.push(`Row ${excelRow}: invalid or missing date`); return; }

            const status = String(cellAt(row, headers, ['TRADE STATUS', 'Result', 'Win/Loss', 'Outcome']) ?? '').toLowerCase().trim();
            const directionRaw = cellAt(row, headers, ['DIRECTION', 'Side', 'Type', 'כיוון', 'סוג פעולה', 'פעולה']);
            const realisedLoss = Math.abs(parseNumericValue(cellAt(row, headers, ['REALISED LOSS', 'Realized Loss'])) ?? 0);
            const realisedWin = Math.abs(parseNumericValue(cellAt(row, headers, ['REALISED WIN', 'Realized Win'])) ?? 0);
            const returnR = parseNumericValue(cellAt(row, headers, ['R+/-', 'R', 'R Multiple'])) ?? 0;
            const risk = Math.abs(parseNumericValue(cellAt(row, headers, ['DESIRED RISK (USD)', 'Risk USD', 'Risk', 'סיכון רצוי (דולר)', 'סיכון'])) ?? 0);
            const directPnl = parseNumericValue(cellAt(row, headers, ['P&L', 'PNL', 'Profit/Loss', 'Profit', 'רווח/הפסד', 'תוצאה']));
            const pnl = directPnl ?? (realisedWin > 0 ? realisedWin : realisedLoss > 0 ? -realisedLoss : returnR * (risk || 0));
            const deviation = parseDeviationValue(cellAt(row, headers, ['DEVIATION', 'Deviation', 'סטייה']));
            const durationMin = parseTimespanMinutes(cellAt(row, headers, ['TRADE DURATION', 'Trade Duration']));
            const mfeR = parseNumericValue(cellAt(row, headers, ['MFE R+/-', 'MFE R'])) ?? 0;
            const maeR = parseNumericValue(cellAt(row, headers, ['MAE R+/-', 'MAE R'])) ?? 0;
            const stopLoss = parseNumericValue(cellAt(row, headers, ['STOP LOSS', 'SL', 'Stoploss', 'סטופ לוס']));

            const mapped: Record<string, unknown> = {
              id: parseNumericValue(nr) || idx + 1,
              date: entryDate,
              coin: String(cellAt(row, headers, ['COIN', 'Symbol', 'Ticker', 'Pair', 'מטבע', 'שם הנייר', 'שם נכס', 'נכס', 'סימול']) || 'UNKNOWN').trim().toUpperCase(),
              direction: normalizeDirectionValue(directionRaw),
              orderType: String(cellAt(row, headers, ['ENTRY ORDER TYPE', 'Order Type', 'סוג פקודת כניסה']) || 'Market').trim() || 'Market',
              entry: parseNumericValue(cellAt(row, headers, ['ENTRY', 'Entry Price', 'כניסה', 'מחיר ממוצע', 'מחיר'])) ?? 0,
              stopLoss,
              exit: parseNumericValue(cellAt(row, headers, ['AVG EXIT', 'Exit', 'Exit Price', 'Close Price', 'יציאה ממוצעת', 'יציאה'])) ?? 0,
              riskPct: parseDeviationValue(cellAt(row, headers, ['DESIRED RISK (%)', 'Risk %', 'Risk Pct', 'סיכון רצוי (%)'])) * 100 || 1,
              risk,
              expectedLoss: parseNumericValue(cellAt(row, headers, ['EXPECTED LOSS', 'Expected Loss', 'הפסד צפוי'])) ?? risk,
              returnR,
              deviation,
              pnl,
              positionSize: parseNumericValue(cellAt(row, headers, ['POSITION SIZE', 'Size', 'Quantity', 'Qty', 'גודל פוזיציה', 'כמות'])) ?? 0,
              leverage: parseNumericValue(cellAt(row, headers, ['LEVERAGE', 'Lev', 'מינוף'])) ?? 1,
              balance: parseNumericValue(cellAt(row, headers, ['Account Size', 'Balance', 'יתרת מזומן', 'גודל חשבון'])) ?? 0,
              rules: true,
              winLoss: status.includes('loss') || status === 'l' ? 'Loss' : status.includes('be') || status.includes('break') ? 'Break Even' : status.includes('win') || status === 'w' ? 'Win' : pnl > 0.05 ? 'Win' : pnl < -0.05 ? 'Loss' : 'Break Even',
              comments: [
                `Nr:${nr}`,
                headerDetection.index > 0 ? `Header row:${headerDetection.index + 1}` : '',
                String(cellAt(row, headers, ['SYSTEM NO.', 'SYSTEM NO', 'System']) || '').trim(),
                String(cellAt(row, headers, ['סוג פעולה', 'פעולה']) || '').trim(),
                durationMin ? `Duration:${durationMin}m` : '',
                mfeR || maeR ? `MFE:${mfeR}R MAE:${maeR}R` : '',
                deviation > 0.1 ? 'Red Flag: Deviation > 10%' : '',
              ].filter(Boolean).join(' | '),
            };

            if (isEmptyRow(mapped)) { skipped++; return; }
            const sanitized = sanitizeTrade(mapped, trades.length + 1);
            if (sanitized) {
              trades.push(sanitized);
            } else {
              skipped++;
              if (errors.length < 14) errors.push(`Row ${excelRow}: Invalid data`);
            }
          } catch (err) {
            skipped++;
            if (errors.length < 14) errors.push(`Row ${headerDetection.index + idx + 2}: ${err instanceof Error ? err.message : 'Parse error'}`);
          }
        });

        resolve({ trades, errors, skipped, imported: trades.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

// ═══════════════════════════════════════════════════
// BROKER CSV IMPORT — Generic pipeline for the Settings → Brokers drop zone.
// CONTRACT: every produced trade MUST carry `stopLoss: null` so the
// Dual-Currency Engine knows R-Multiples are not computable for these rows
// and locks the dashboard into MONEY mode.
//
// As of Phase 2 (Broker-Agnostic engine), the raw parsing is exposed via
// `parseBrokerCsvRaw()` so per-broker adapters can consume it under the
// BrokerAdapter contract. `importFromBrokerCsv()` is kept as a thin
// backward-compatibility wrapper.
// ═══════════════════════════════════════════════════

export interface BrokerImportResult extends ImportResult {
  broker: string;
}

/**
 * Phase 2: low-level CSV parser — returns raw sanitized trades with NO
 * broker-specific tagging, NO stopLoss normalization. Used by the per-broker
 * adapters in `src/lib/brokers/` to feed the dispatcher pipeline.
 */
export function parseBrokerCsvRaw(file: File): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: true });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) { resolve([]); return; }
        const ws = wb.Sheets[sheetName];

        const headerRowIdx = findHeaderRow(ws);
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, blankrows: false, defval: '' });
        if (rows.length <= headerRowIdx + 1) { resolve([]); return; }

        const headerRow = rows[headerRowIdx] || [];
        const colMap: Array<{ idx: number; field: keyof Trade | '_ignore' }> = [];
        headerRow.forEach((h, i) => {
          const field = mapHeaderToField(String(h ?? ''));
          if (field && field !== '_ignore') colMap.push({ idx: i, field });
        });
        if (colMap.length === 0) {
          // Phase 2 fallback: legacy header map found nothing — try UIE end-to-end.
          const uie = tryUIEBrokerImport(headerRow, rows.slice(headerRowIdx + 1));
          resolve(uie);
          return;
        }

        const trades: Trade[] = [];
        rows.slice(headerRowIdx + 1).forEach((row) => {
          try {
            const mapped: Record<string, unknown> = {};
            for (const { idx: ci, field } of colMap) {
              const val = row[ci];
              if (field === 'date') mapped.date = parseFlexibleDate(val);
              else if (field === 'pnl' || field === 'entry' || field === 'exit' || field === 'stopLoss' || field === 'positionSize' || field === 'leverage' || field === 'risk' || field === 'expectedLoss' || field === 'returnR' || field === 'riskPct') {
                mapped[field] = parseNumericValue(val);
              } else if (field === 'deviation') mapped.deviation = parseDeviationValue(val);
              else if (field === 'direction') {
                const s = String(val ?? '').toLowerCase().trim();
                mapped.direction = s.includes('short') || s === 's' || s.includes('sell') ? 'Short' : 'Long';
              } else if (field === 'rules') mapped.rules = true;
              else mapped[field] = val;
            }
            if (isEmptyRow(mapped)) return;
            const sanitized = sanitizeTrade(mapped, trades.length + 1);
            if (sanitized) trades.push(sanitized);
          } catch { /* skip bad rows */ }
        });

        // Phase 2 Zero-Destruction fallback: if legacy produced nothing, try UIE.
        if (trades.length === 0) {
          const uie = tryUIEBrokerImport(headerRow, rows.slice(headerRowIdx + 1));
          if (uie.length) { resolve(uie); return; }
        }

        resolve(trades);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Phase 2 · UIE end-to-end fallback ─────────────────────────────────────
// CanonicalTrade → legacy Trade via the shared UIE_TO_TRADE map + sanitizer.
function canonicalToLegacy(ct: CanonicalTrade, idx: number): Trade | null {
  const mapped: Record<string, unknown> = { id: idx + 1 };
  for (const [uieField, tradeField] of Object.entries(UIE_TO_TRADE)) {
    if (tradeField === '_ignore' || !tradeField) continue;
    const v = (ct as Record<string, unknown>)[uieField];
    if (v == null) continue;
    if (mapped[tradeField] == null) mapped[tradeField] = v;
  }
  // direction normalization (UIE already normalizes to 'Long'/'Short')
  if (mapped.direction !== 'Long' && mapped.direction !== 'Short') {
    const s = String(mapped.direction ?? '').toLowerCase();
    mapped.direction = s.includes('short') || s.includes('sell') ? 'Short' : 'Long';
  }
  return sanitizeTrade(mapped, idx + 1);
}

function tryUIEBrokerImport(headerRow: unknown[], dataRows: unknown[][]): Trade[] {
  try {
    const headers = headerRow.map((h) => String(h ?? ''));
    const res = runUIE(headers, dataRows);
    const out: Trade[] = [];
    res.trades.forEach((ct, i) => {
      const t = canonicalToLegacy(ct, i);
      if (t) out.push(t);
    });
    return out;
  } catch {
    return [];
  }
}

/**
 * Backwards-compatible wrapper. New ingestion paths should go through the
 * dispatcher (`ingestFileToTrades` in `src/lib/ingestion/file-import.ts`).
 */
export async function importFromBrokerCsv(file: File, brokerId: string): Promise<BrokerImportResult> {
  try {
    const raw = await parseBrokerCsvRaw(file);
    const trades: Trade[] = raw.map(t => {
      const hasRealSL = typeof t.stopLoss === 'number' && isFinite(t.stopLoss) && t.stopLoss !== 0;
      return {
        ...t,
        stopLoss: hasRealSL ? t.stopLoss : null,
        comments: [`Broker:${brokerId}`, t.comments].filter(Boolean).join(' | '),
      };
    });
    return { trades, errors: [], skipped: 0, imported: trades.length, broker: brokerId };
  } catch (err) {
    return { trades: [], errors: [err instanceof Error ? err.message : 'parse_failed'], skipped: 0, imported: 0, broker: brokerId };
  }
}

