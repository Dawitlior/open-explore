import * as XLSX from 'xlsx';
import type { Trade } from '@/data/trades';
import { sanitizeTrade } from './trade-sanitizer';

// ═══════════════════════════════════════════════════
// HEADER MAPPING: English ↔ Hebrew ↔ Internal Field
// ═══════════════════════════════════════════════════

const HEADER_MAP: Record<string, keyof Trade | '_ignore'> = {
  // English headers
  'entry date/time': 'date',
  'exit date/time': '_ignore',
  'trade duration': '_ignore',
  'coin': 'coin',
  'direction': 'direction',
  'entry order type': 'orderType',
  'entry': 'entry',
  'stop loss': 'stopLoss',
  'avg exit': 'exit',
  'desired risk (%)': 'riskPct',
  'desired risk (usd)': 'risk',
  'entry fee': '_ignore',
  'exit fee': '_ignore',
  'min. size': '_ignore',
  'position size': 'positionSize',
  'notional value': '_ignore',
  'risk': 'risk',
  'valid risk?': '_ignore',
  'expected loss': 'expectedLoss',
  'realised loss': '_ignore',
  'realised win': '_ignore',
  'r+/-': 'returnR',
  'deviation': 'deviation',
  'fees': '_ignore',
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
  'notes': 'comments',
  'system no.': '_ignore',
  'leverage': 'leverage',
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
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapHeaderToField(header: string): keyof Trade | '_ignore' | null {
  const norm = normalizeHeader(header);
  return HEADER_MAP[norm] ?? null;
}

// ═══════════════════════════════════════════════════
// DATE PARSING
// ═══════════════════════════════════════════════════

/** Convert Excel serial date number to JS Date */
function excelSerialToDate(serial: number): Date {
  // Excel epoch: Jan 0, 1900 (with the Lotus 1-2-3 leap year bug)
  const epoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const fraction = serial - days;
  const ms = days * 86400000 + Math.round(fraction * 86400000);
  return new Date(epoch.getTime() + ms);
}

/** Parse date string in DD/MM/YYYY HH:MM or MM/DD/YYYY HH:MM format */
function parseFlexibleDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  // Excel serial number
  if (typeof value === 'number' && value > 25000 && value < 100000) {
    const d = excelSerialToDate(value);
    if (!isNaN(d.getTime())) {
      return formatDate(d);
    }
    return null;
  }

  if (typeof value !== 'string') {
    const s = String(value).trim();
    if (!s) return null;
    return parseFlexibleDate(s);
  }

  const str = value.trim();
  if (!str) return null;

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return formatDate(d);
    return null;
  }

  // DD/MM/YYYY HH:MM or MM/DD/YYYY HH:MM
  const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;

    let day: number, month: number;

    // If first number > 12, it must be DD/MM/YYYY
    if (a > 12) {
      day = a; month = b;
    }
    // If second number > 12, it must be MM/DD/YYYY
    else if (b > 12) {
      month = a; day = b;
    }
    // Ambiguous — default to DD/MM/YYYY (more common in trading journals)
    else {
      day = a; month = b;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, hour, min);
      if (!isNaN(d.getTime())) return formatDate(d);
    }
  }

  // Fallback: try native parsing
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
  const entry = toNum(mapped.entry);
  const stopLoss = toNum(mapped.stopLoss);
  const exit = toNum(mapped.exit);
  const positionSize = toNum(mapped.positionSize);

  // All critical fields are missing/zero → empty row
  return entry === 0 && stopLoss === 0 && exit === 0 && positionSize === 0;
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') { const n = parseFloat(v); if (isFinite(n)) return n; }
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
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { resolve({ trades: [], errors: ['Empty spreadsheet'], skipped: 0, imported: 0 }); return; }

        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true });
        if (jsonData.length === 0) { resolve({ trades: [], errors: ['No data rows found'], skipped: 0, imported: 0 }); return; }

        // Map headers
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

            // Parse date
            if (mapped.date !== undefined) {
              const parsed = parseFlexibleDate(mapped.date);
              if (parsed) {
                mapped.date = parsed;
              } else {
                // Invalid date — skip row
                skipped++;
                errors.push(`Row ${idx + 2}: Invalid date`);
                return;
              }
            }

            // Direction normalization
            if (typeof mapped.direction === 'string') {
              const dir = mapped.direction.toLowerCase().trim();
              if (dir === 'long' || dir === 'לונג' || dir === 'buy') mapped.direction = 'Long';
              else if (dir === 'short' || dir === 'שורט' || dir === 'sell') mapped.direction = 'Short';
            }

            // Rules normalization
            if (typeof mapped.rules === 'string') {
              const r = mapped.rules.toLowerCase().trim();
              mapped.rules = r === 'yes' || r === 'כן' || r === 'true' || r === '1' || r === 'v' || r === '✓';
            }

            // Determine winLoss from returnR if not provided
            const returnR = typeof mapped.returnR === 'number' ? mapped.returnR : parseFloat(String(mapped.returnR || '0'));
            if (!mapped.winLoss) {
              if (returnR > 0.05) mapped.winLoss = 'Win';
              else if (returnR < -0.05) mapped.winLoss = 'Loss';
              else mapped.winLoss = 'Break Even';
            }

            // Calculate PnL if missing
            if (mapped.pnl === undefined && mapped.risk !== undefined) {
              mapped.pnl = returnR * (typeof mapped.risk === 'number' ? mapped.risk : parseFloat(String(mapped.risk || '2')));
            }

            const sanitized = sanitizeTrade(mapped, idx + 1);
            if (sanitized) {
              trades.push(sanitized);
            } else {
              skipped++;
              errors.push(`Row ${idx + 2}: Invalid data`);
            }
          } catch (err) {
            skipped++;
            errors.push(`Row ${idx + 2}: ${err instanceof Error ? err.message : 'Parse error'}`);
          }
        });

        resolve({ trades, errors: errors.slice(0, 10), skipped, imported: trades.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}
