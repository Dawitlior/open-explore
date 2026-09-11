import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "trader_mind_profile",
  title: "Trader Mind profile",
  description:
    "Return the signed-in trader's most recent Trader Mind behavioural diagnostic result (archetype and answers), if one exists.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("trader_mind_sessions")
      .select("archetype, version, payload, completed_at")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No Trader Mind diagnostic has been completed yet." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { session: data },
    };
  },
});
