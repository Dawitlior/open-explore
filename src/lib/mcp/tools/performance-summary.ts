import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { TRADE_COLUMNS, normalizeTrade, summarize, type TradeRow } from "../trades";

export default defineTool({
  name: "performance_summary",
  title: "Performance summary",
  description:
    "Compute the signed-in trader's performance stats (win rate, expectancy in R, profit factor, net P&L, max drawdown in R) plus per-symbol and per-weekday breakdowns.",
  inputSchema: {
    portfolio_id: z.string().uuid().optional().describe("Restrict the analysis to one portfolio."),
    from: z.string().optional().describe("ISO date lower bound on the close date."),
    to: z.string().optional().describe("ISO date upper bound on the close date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ portfolio_id, from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("trades").select(TRADE_COLUMNS).limit(5000);
    if (portfolio_id) query = query.eq("portfolio_id", portfolio_id);
    if (from) query = query.gte("closed_at", from);
    if (to) query = query.lte("closed_at", to);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const trades = ((data ?? []) as TradeRow[]).map(normalizeTrade);
    const overall = summarize(trades);

    const bucket = (key: (t: (typeof trades)[number]) => string | null) => {
      const groups = new Map<string, typeof trades>();
      for (const t of trades) {
        const k = key(t);
        if (!k) continue;
        const list = groups.get(k) ?? [];
        list.push(t);
        groups.set(k, list);
      }
      return [...groups.entries()]
        .map(([name, list]) => ({ name, ...summarize(list) }))
        .sort((a, b) => b.netR - a.netR);
    };

    const bySymbol = bucket((t) => t.symbol);
    const byWeekday = bucket((t) => {
      if (!t.date) return null;
      const parsed = new Date(t.date);
      return Number.isNaN(parsed.getTime())
        ? null
        : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][parsed.getDay()];
    });

    const payload = { overall, bySymbol, byWeekday };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
