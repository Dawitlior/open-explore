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
  
  // Set column widths
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
