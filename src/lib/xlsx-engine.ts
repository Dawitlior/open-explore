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

  // Excel serial number
  if (typeof value === 'number' && value > 25000 && value < 100000) {
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

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    // Parse locally to avoid timezone shift
    const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (parts) {
      const d = new Date(+parts[1], +parts[2] - 1, +parts[3], +(parts[4] || 0), +(parts[5] || 0));
      if (!isNaN(d.getTime())) return formatDate(d);
    }
    return null;
  }

  // DD/MM/YYYY HH:MM or MM/DD/YYYY HH:MM (with /, -, or . separators)
  const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;

    let day: number, month: number;
    if (a > 12) { day = a; month = b; }
    else if (b > 12) { month = a; day = b; }
    else { day = a; month = b; } // Default DD/MM/YYYY

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, hour, min);
      if (!isNaN(d.getTime())) return formatDate(d);
    }
  }

  // Fallback: try native parsing but use local components
  const d = new Date(str);
  if (!isNaN(d.getTime())) return formatDate(d);

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
        const wb = XLSX.read(data, { type: 'array', cellDates: false, raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { resolve({ trades: [], errors: ['Empty spreadsheet'], skipped: 0, imported: 0 }); return; }

        // Find the header row dynamically
        const headerRowIdx = findHeaderRow(ws);

        // Re-parse with the correct header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          raw: true,
          range: headerRowIdx,
        });

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

            // Parse date
            if (mapped.date !== undefined) {
              const parsed = parseFlexibleDate(mapped.date);
              if (parsed) {
                mapped.date = parsed;
              } else {
                skipped++;
                if (errors.length < 10) errors.push(`Row ${idx + 2}: Invalid date "${String(mapped.date).slice(0, 30)}"`);
                return;
              }
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

        resolve({ trades, errors, skipped, imported: trades.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}
