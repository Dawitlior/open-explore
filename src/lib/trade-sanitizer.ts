import type { Trade } from '@/data/trades';

/**
 * Normalize ANY date input → "YYYY-MM-DD HH:mm" string.
 * Handles: ISO strings, "YYYY-MM-DD HH:mm", "DD/MM/YYYY", Date objects,
 * Excel serial numbers, and timestamps. Returns null when truly unparseable.
 */
function normalizeDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  // Excel serial
  if (typeof raw === 'number' && raw > 1 && raw < 200000) {
    const epoch = new Date(1899, 11, 30);
    const days = Math.floor(raw);
    const fraction = raw - days;
    const ms = days * 86400000 + Math.round(fraction * 86400000);
    const d = new Date(epoch.getTime() + ms);
    if (isNaN(d.getTime())) return null;
    return fmt(d);
  }
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : fmt(raw);
  const str = String(raw).trim();
  if (!str) return null;
  // YYYY-MM-DD or YYYY-MM-DDTHH:mm or "YYYY-MM-DD HH:mm"
  const iso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0));
    return isNaN(d.getTime()) ? null : fmt(d);
  }
  // DD/MM/YYYY (Israeli) — strict default; falls back to MM/DD only when DD/MM is impossible
  const dm = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[\sT](\d{1,2}):(\d{2}))?/);
  if (dm) {
    const a = +dm[1], b = +dm[2]; let year = +dm[3];
    if (year < 100) year += 2000;
    let day: number, month: number;
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) { day = a; month = b; }
    else if (a >= 1 && a <= 12 && b >= 1 && b <= 31) { month = a; day = b; }
    else { day = a; month = b; }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, +(dm[4] || 0), +(dm[5] || 0));
      if (!isNaN(d.getTime())) return fmt(d);
    }
  }
  const fb = new Date(str);
  if (!isNaN(fb.getTime())) {
    const local = new Date(fb.getFullYear(), fb.getMonth(), fb.getDate(), fb.getHours(), fb.getMinutes());
    return fmt(local);
  }
  return null;
}
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${mn}`;
}

/**
 * Sanitize a single trade object, ensuring all required fields exist with safe defaults.
 */
export function sanitizeTrade(t: unknown, fallbackId: number): Trade | null {
  if (!t || typeof t !== 'object') return null;
  const raw = t as Record<string, unknown>;

  const id = typeof raw.id === 'number' && raw.id > 0 ? raw.id : fallbackId;
  const date = normalizeDate(raw.date) || new Date().toISOString().slice(0, 16).replace('T', ' ');
  const day = typeof raw.day === 'string' ? raw.day : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date.replace(' ', 'T')).getDay()] || 'Mon';
  const coin = typeof raw.coin === 'string' && raw.coin.length > 0 ? raw.coin : 'UNKNOWN';
  const direction: 'Long' | 'Short' = raw.direction === 'Short' ? 'Short' : 'Long';
  const orderType = typeof raw.orderType === 'string' ? raw.orderType : 'Market';
  const entry = safeNum(raw.entry);
  const stopLoss = safeNum(raw.stopLoss);
  const exit = safeNum(raw.exit);
  const returnR = safeNum(raw.returnR);
  const risk = safeNum(raw.risk, 2);
  const expectedLoss = safeNum(raw.expectedLoss);
  const pnl = safeNum(raw.pnl);
  const deviation = safeNum(raw.deviation);
  const positionSize = safeNum(raw.positionSize);
  const leverage = safeNum(raw.leverage, 1);
  const balance = safeNum(raw.balance);
  const riskPct = safeNum(raw.riskPct, 1);
  const rules = typeof raw.rules === 'boolean' ? raw.rules : true;
  const comments = typeof raw.comments === 'string' ? raw.comments : '';

  let winLoss: Trade['winLoss'] = 'Break Even';
  if (raw.winLoss === 'Win') winLoss = 'Win';
  else if (raw.winLoss === 'Loss') winLoss = 'Loss';
  else if (pnl > 0.05) winLoss = 'Win';
  else if (pnl < -0.05) winLoss = 'Loss';

  return { id, date, day, coin, direction, orderType, entry, stopLoss, exit, returnR, winLoss, risk, expectedLoss, pnl, deviation, positionSize, leverage, balance, riskPct, rules, comments };
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') { const n = parseFloat(v); if (isFinite(n)) return n; }
  return fallback;
}

/**
 * Sanitize an array of trades, filtering out invalid entries.
 */
export function sanitizeTrades(trades: unknown[]): Trade[] {
  if (!Array.isArray(trades)) return [];
  const result: Trade[] = [];
  trades.forEach((t, i) => {
    const sanitized = sanitizeTrade(t, i + 1);
    if (sanitized) result.push(sanitized);
  });
  return result;
}
