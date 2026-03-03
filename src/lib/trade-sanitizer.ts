import type { Trade } from '@/data/trades';

/**
 * Sanitize a single trade object, ensuring all required fields exist with safe defaults.
 */
export function sanitizeTrade(t: unknown, fallbackId: number): Trade | null {
  if (!t || typeof t !== 'object') return null;
  const raw = t as Record<string, unknown>;

  const id = typeof raw.id === 'number' && raw.id > 0 ? raw.id : fallbackId;
  const date = typeof raw.date === 'string' && raw.date.length > 0 ? raw.date : new Date().toISOString().slice(0, 16);
  const day = typeof raw.day === 'string' ? raw.day : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date).getDay()] || 'Mon';
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
