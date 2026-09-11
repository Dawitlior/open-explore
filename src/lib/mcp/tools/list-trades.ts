import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { TRADE_COLUMNS, normalizeTrade, type TradeRow } from "../trades";

export default defineTool({
  name: "list_trades",
  title: "List trades",
  description:
    "List the signed-in trader's most recent trades, optionally filtered by portfolio, outcome, or date range.",
  inputSchema: {
    portfolio_id: z.string().uuid().optional().describe("Only trades in this portfolio."),
    outcome: z.enum(["Win", "Loss", "Breakeven"]).optional().describe("Filter by trade outcome."),
    from: z.string().optional().describe("ISO date lower bound on the close date, e.g. 2026-01-01."),
    to: z.string().optional().describe("ISO date upper bound on the close date."),
    limit: z.number().int().min(1).max(200).default(30).describe("Maximum number of trades to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ portfolio_id, outcome, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("trades").select(TRADE_COLUMNS).order("closed_at", { ascending: false, nullsFirst: false });
    if (portfolio_id) query = query.eq("portfolio_id", portfolio_id);
    if (from) query = query.gte("closed_at", from);
    if (to) query = query.lte("closed_at", to);
    const { data, error } = await query.limit(Math.min(limit * 3, 500));
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    let trades = ((data ?? []) as TradeRow[]).map(normalizeTrade);
    if (outcome) trades = trades.filter((t) => t.outcome === outcome);
    trades = trades.slice(0, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(trades) }],
      structuredContent: { count: trades.length, trades },
    };
  },
});
