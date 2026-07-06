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
  name: "list_upcoming_economic_events",
  title: "List upcoming macro events",
  description: "List upcoming macro/economic events from the ORCA economic radar, optionally filtered by impact tier and currency.",
  inputSchema: {
    days_ahead: z.number().int().min(1).max(30).nullable().describe("Look-ahead window in days (default 7)."),
    impact: z.enum(["low", "medium", "high"]).nullable().describe("Filter by impact tier."),
    currency: z.string().nullable().describe("ISO currency filter e.g. USD, EUR, CNY."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ days_ahead, impact, currency }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const now = new Date().toISOString();
    const until = new Date(Date.now() + (days_ahead ?? 7) * 86400_000).toISOString();
    let q = sb
      .from("economic_events")
      .select("id,event_name,country,currency,impact,release_at,forecast,previous,actual")
      .gte("release_at", now)
      .lte("release_at", until)
      .order("release_at", { ascending: true })
      .limit(200);
    if (impact) q = q.eq("impact", impact);
    if (currency) q = q.eq("currency", currency.toUpperCase());
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [], count: data?.length ?? 0 },
    };
  },
});
