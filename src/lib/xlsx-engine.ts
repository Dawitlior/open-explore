import * as XLSX from 'xlsx';
import type { Trade } from '@/data/trades';
import { sanitizeTrade } from './trade-sanitizer';

// ═══════════════════════════════════════════════════
// HEADER MAPPING: English ↔ Hebrew ↔ Internal Field
// ═══════════════════════════════════════════════════

const HEADER_MAP: Record<string, keyof Trade | '_ignore'> = {
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
  'leverage': 'leverage',
  'lev': 'leverage',
  'p&l': 'pnl',
  'pnl': 'pnl',
  'profit': 'pnl',
  'profit/loss': 'pnl',
  'result': 'winLoss',
  'win/loss': 'winLoss',
  'outcome': 'winLoss',
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
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function mapHeaderToField(header: string): keyof Trade | '_ignore' | null {
  const norm = normalizeHeader(header);
  // Direct match
  if (HEADER_MAP[norm]) return HEADER_MAP[norm];
  // Partial match — check if any key is contained in the header
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

  let cleaned = String(value).trim().replace(/\s/g, '').replace(/[R$€₪%]/gi, '');
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  }

  if (lastDot > lastComma) {
    // US/UK: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma > lastDot) {
    // European: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isFinite(num) ? num : null;
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
      const header = typeof cell?.w === 'string' && cell.w.trim() ? cell.w : cell?.v;
      if (typeof header === 'string') {
        const field = mapHeaderToField(header);
        if (field) score++;
      }
    }
    if (score > bestScore) { bestScore = score; bestRow = r; }
  }
  return bestRow;
}

function readCellValue(cell: XLSX.CellObject | undefined, preferFormattedText = false): unknown {
  if (!cell) return undefined;
  if (preferFormattedText && typeof cell.w === 'string' && cell.w.trim()) return cell.w.trim();
  if (cell.v instanceof Date) return cell.v;
  if (cell.t === 'd' && cell.v) return cell.v;
  if (cell.t === 'n' && typeof cell.v === 'number') return cell.v;
  if (typeof cell.w === 'string' && cell.w.trim()) return cell.w.trim();
  return cell.v;
}

function sortTradesChronologically(trades: Trade[]): Trade[] {
  const toMs = (date: string) => {
    const ms = new Date(String(date).replace(' ', 'T')).getTime();
    return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
  };
  return [...trades].sort((a, b) => toMs(a.date) - toMs(b.date) || a.id - b.id);
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
        // CRITICAL: keep formatted cell text (`cellText`) and avoid locale auto-parsing.
        // Dates like 04/02/2026 must stay DD/MM instead of being guessed as MM/DD.
        const wb = XLSX.read(data, { type: 'array', cellDates: false, cellText: true, dateNF: 'dd/mm/yyyy hh:mm', raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { resolve({ trades: [], errors: ['Empty spreadsheet'], skipped: 0, imported: 0 }); return; }

        const headerRowIdx = findHeaderRow(ws);
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const headers: string[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const rawHeader = readCellValue(ws[XLSX.utils.encode_cell({ r: headerRowIdx, c })]);
          headers[c] = String(rawHeader ?? '').trim();
        }

        const jsonData: Record<string, unknown>[] = [];
        for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
          const row: Record<string, unknown> = {};
          let hasValue = false;
          for (let c = range.s.c; c <= range.e.c; c++) {
            const header = headers[c];
            if (!header) continue;
            const field = mapHeaderToField(header);
            const value = readCellValue(ws[XLSX.utils.encode_cell({ r, c })], field === 'date');
            if (value !== undefined && value !== null && String(value).trim() !== '') hasValue = true;
            row[header] = value;
          }
          if (hasValue) jsonData.push(row);
        }

        if (jsonData.length === 0) { resolve({ trades: [], errors: ['No data rows found'], skipped: 0, imported: 0 }); return; }

        // Map headers from first data object keys
        const firstRow = jsonData[0];
        const headerMapping: Record<string, keyof Trade | '_ignore'> = {};
        Object.keys(firstRow).forEach(h => {
          const field = mapHeaderToField(h);
          if (field) headerMapping[h] = field;
        });

        const trades: Trade[] = [];
        const errors: string[] = [];
        let skipped = 0;

        jsonData.forEach((row, idx) => {
          try {
            const mapped: Record<string, unknown> = {};
            Object.entries(row).forEach(([h, v]) => {
              const field = headerMapping[h];
              if (field && field !== '_ignore') {
                mapped[field] = v;
              }
            });

            // Skip empty / all-zero rows
            if (isEmptyRow(mapped)) {
              skipped++;
              return;
            }

            // Parse numeric fields with locale awareness
            for (const numField of ['entry', 'stopLoss', 'exit', 'positionSize', 'risk', 'riskPct', 'expectedLoss', 'returnR', 'deviation', 'leverage', 'pnl'] as const) {
              if (mapped[numField] !== undefined) {
                const parsed = parseNumericValue(mapped[numField]);
                mapped[numField] = parsed !== null ? parsed : 0;
              }
            }

            // Parse date strictly. Do NOT duplicate/carry-forward dates: an invalid date row
            // must be skipped so the calendar never fills gaps with repeated dates.
            if (mapped.date !== undefined && mapped.date !== null && mapped.date !== '') {
              const parsed = parseFlexibleDate(mapped.date);
              if (parsed) {
                mapped.date = parsed;
              } else {
                skipped++;
                if (errors.length < 10) errors.push(`Row ${idx + headerRowIdx + 2}: Invalid date "${String(mapped.date)}"`);
                return;
              }
            } else {
              skipped++;
              if (errors.length < 10) errors.push(`Row ${idx + headerRowIdx + 2}: Missing date`);
              return;
            }

            // Direction normalization
            if (typeof mapped.direction === 'string') {
              const dir = mapped.direction.toLowerCase().trim();
              if (dir === 'long' || dir === 'לונג' || dir === 'buy' || dir === 'l') mapped.direction = 'Long';
              else if (dir === 'short' || dir === 'שורט' || dir === 'sell' || dir === 's') mapped.direction = 'Short';
            }

            // Rules normalization
            if (typeof mapped.rules === 'string') {
              const r = mapped.rules.toLowerCase().trim();
              mapped.rules = r === 'yes' || r === 'כן' || r === 'true' || r === '1' || r === 'v' || r === '✓';
            } else if (typeof mapped.rules === 'number') {
              mapped.rules = mapped.rules === 1;
            }

            // Win/Loss normalization
            if (typeof mapped.winLoss === 'string') {
              const wl = mapped.winLoss.toLowerCase().trim();
              if (wl === 'win' || wl === 'w' || wl === 'ניצחון') mapped.winLoss = 'Win';
              else if (wl === 'loss' || wl === 'l' || wl === 'הפסד') mapped.winLoss = 'Loss';
              else mapped.winLoss = 'Break Even';
            }

            // Determine winLoss from returnR/pnl if not provided
            if (!mapped.winLoss) {
              const returnR = typeof mapped.returnR === 'number' ? mapped.returnR : 0;
              const pnl = typeof mapped.pnl === 'number' ? mapped.pnl : 0;
              const signal = returnR || pnl;
              if (signal > 0.05) mapped.winLoss = 'Win';
              else if (signal < -0.05) mapped.winLoss = 'Loss';
              else mapped.winLoss = 'Break Even';
            }

            // Calculate PnL if missing
            if ((mapped.pnl === undefined || mapped.pnl === 0) && mapped.risk !== undefined && mapped.returnR !== undefined) {
              mapped.pnl = (mapped.returnR as number) * (typeof mapped.risk === 'number' ? mapped.risk : 2);
            }

            const sanitized = sanitizeTrade(mapped, idx + 1);
            if (sanitized) {
              trades.push(sanitized);
            } else {
              skipped++;
              if (errors.length < 10) errors.push(`Row ${idx + 2}: Invalid data`);
            }
          } catch (err) {
            skipped++;
            if (errors.length < 10) errors.push(`Row ${idx + 2}: ${err instanceof Error ? err.message : 'Parse error'}`);
          }
        });

        const sortedTrades = sortTradesChronologically(trades).map((t, i) => ({ ...t, id: i + 1 }));
        resolve({ trades: sortedTrades, errors, skipped, imported: sortedTrades.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}
