/** Shared helpers for reading the jsonb trade payload stored in `public.trades`. */

export type TradeRow = {
  id: string;
  trade_id: number | null;
  portfolio_id: string | null;
  opened_at: string | null;
  closed_at: string | null;
  manual_r_multiple: number | null;
  data: Record<string, unknown> | null;
};

export type NormalizedTrade = {
  id: string;
  ref: number | null;
  symbol: string | null;
  direction: string | null;
  date: string | null;
  entry: number | null;
  exit: number | null;
  stopLoss: number | null;
  pnl: number;
  rMultiple: number;
  outcome: "Win" | "Loss" | "Breakeven";
  notes: string | null;
};

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : null;
  return n === null || Number.isNaN(n) ? null : n;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTrade(row: TradeRow): NormalizedTrade {
  const d = (row.data ?? {}) as Record<string, unknown>;
  const pnl = num(d.pnl) ?? 0;
  const r = row.manual_r_multiple ?? num(d.manualR) ?? num(d.returnR) ?? 0;
  const rawOutcome = str(d.winLoss);
  const outcome: NormalizedTrade["outcome"] =
    rawOutcome === "Win" ? "Win" : rawOutcome === "Loss" ? "Loss" : r > 0 ? "Win" : r < 0 ? "Loss" : "Breakeven";
  return {
    id: row.id,
    ref: row.trade_id,
    symbol: str(d.coin) ?? str(d.symbol),
    direction: str(d.direction),
    date: row.closed_at ?? str(d.date) ?? row.opened_at,
    entry: num(d.entry),
    exit: num(d.exit),
    stopLoss: num(d.stopLoss),
    pnl,
    rMultiple: r,
    outcome,
    notes: str(d.comments),
  };
}

export function summarize(trades: NormalizedTrade[]) {
  const total = trades.length;
  if (total === 0) {
    return { total, winRate: 0, expectancyR: 0, profitFactor: 0, netPnl: 0, netR: 0, maxDrawdown: 0, avgWinR: 0, avgLossR: 0 };
  }
  const wins = trades.filter((t) => t.outcome === "Win");
  const losses = trades.filter((t) => t.outcome === "Loss");
  const grossWin = wins.reduce((s, t) => s + Math.abs(t.pnl), 0);
  const grossLoss = losses.reduce((s, t) => s + Math.abs(t.pnl), 0);
  const netR = trades.reduce((s, t) => s + t.rMultiple, 0);

  // Max drawdown of the cumulative R curve, chronological.
  const chronological = [...trades].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  for (const t of chronological) {
    equity += t.rMultiple;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    total,
    winRate: round((wins.length / total) * 100),
    expectancyR: round(netR / total),
    profitFactor: grossLoss > 0 ? round(grossWin / grossLoss) : grossWin > 0 ? Infinity : 0,
    netPnl: round(trades.reduce((s, t) => s + t.pnl, 0)),
    netR: round(netR),
    maxDrawdown: round(maxDrawdown),
    avgWinR: wins.length ? round(wins.reduce((s, t) => s + t.rMultiple, 0) / wins.length) : 0,
    avgLossR: losses.length ? round(losses.reduce((s, t) => s + t.rMultiple, 0) / losses.length) : 0,
  };
}

export const TRADE_COLUMNS = "id, trade_id, portfolio_id, opened_at, closed_at, manual_r_multiple, data";
