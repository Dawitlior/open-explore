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
  name: "list_trades",
  title: "List trades",
  description: "List the signed-in ORCA user's most recent trades, optionally filtered by portfolio. Returns id, symbol, direction, R multiple and P&L extracted from the trade payload.",
  inputSchema: {
    portfolio_id: z.string().uuid().nullable().describe("Optional portfolio UUID to filter by. Pass null for all portfolios."),
    limit: z.number().int().min(1).max(200).nullable().describe("Max rows to return (1-200). Defaults to 50 when null."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ portfolio_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("trades")
      .select("id,portfolio_id,asset_class,opened_at,closed_at,manual_r_multiple,data")
      .order("closed_at", { ascending: false, nullsFirst: false })
      .limit(limit ?? 50);
    if (portfolio_id) q = q.eq("portfolio_id", portfolio_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((t: any) => {
      const d = (t.data ?? {}) as Record<string, unknown>;
      return {
        id: t.id,
        portfolio_id: t.portfolio_id,
        asset_class: t.asset_class,
        opened_at: t.opened_at,
        closed_at: t.closed_at,
        symbol: d.symbol ?? d.ticker ?? null,
        direction: d.direction ?? d.side ?? null,
        pnl: d.pnl ?? d.netPnl ?? null,
        r_multiple: t.manual_r_multiple ?? d.rMultiple ?? d.r_multiple ?? null,
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { trades: rows, count: rows.length },
    };
  },
});
