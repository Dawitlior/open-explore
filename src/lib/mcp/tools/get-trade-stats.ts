import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_trade_stats",
  title: "Get trade stats",
  description: "Aggregate the signed-in user's trades into win rate, total R, average R, expectancy, and total P&L. Optionally scoped to a portfolio and a lookback window in days.",
  inputSchema: {
    portfolio_id: z.string().uuid().nullable().describe("Optional portfolio UUID. Null = all portfolios."),
    days: z.number().int().min(1).max(3650).nullable().describe("Lookback window in days based on closed_at. Null = all time."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ portfolio_id, days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb.from("trades").select("manual_r_multiple,data,closed_at").not("closed_at", "is", null);
    if (portfolio_id) q = q.eq("portfolio_id", portfolio_id);
    if (days) {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      q = q.gte("closed_at", since);
    }
    const { data, error } = await q.limit(5000);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    let wins = 0, losses = 0, rSum = 0, rCount = 0, pnlSum = 0;
    for (const t of data ?? []) {
      const d = (t.data ?? {}) as Record<string, any>;
      const r = t.manual_r_multiple ?? d.rMultiple ?? d.r_multiple;
      const pnl = Number(d.pnl ?? d.netPnl ?? 0);
      if (Number.isFinite(pnl)) pnlSum += pnl;
      if (typeof r === "number" && Number.isFinite(r)) {
        rSum += r; rCount++;
        if (r > 0) wins++; else if (r < 0) losses++;
      } else if (Number.isFinite(pnl)) {
        if (pnl > 0) wins++; else if (pnl < 0) losses++;
      }
    }
    const total = wins + losses;
    const stats = {
      total_trades: data?.length ?? 0,
      wins,
      losses,
      win_rate: total ? +(wins / total * 100).toFixed(2) : 0,
      total_r: +rSum.toFixed(3),
      avg_r: rCount ? +(rSum / rCount).toFixed(3) : 0,
      expectancy_r: rCount ? +(rSum / rCount).toFixed(3) : 0,
      total_pnl: +pnlSum.toFixed(2),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats) }],
      structuredContent: stats,
    };
  },
});
