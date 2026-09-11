import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_day_note",
  title: "Log a journal day note",
  description: "Create or replace the signed-in trader's journal note for a specific calendar day.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Calendar day in YYYY-MM-DD format."),
    note: z.string().trim().min(1).max(4000).describe("The note text to store for that day."),
    portfolio_id: z.string().uuid().optional().describe("Attach the note to a specific portfolio."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ date, note, portfolio_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Could not resolve the signed-in user.");
    const supabase = supabaseForUser(ctx);

    let existing = supabase.from("day_notes").select("id").eq("date", date).limit(1);
    existing = portfolio_id ? existing.eq("portfolio_id", portfolio_id) : existing.is("portfolio_id", null);
    const { data: found, error: findError } = await existing.maybeSingle();
    if (findError) return { content: [{ type: "text", text: findError.message }], isError: true };

    const { data, error } = found
      ? await supabase.from("day_notes").update({ note }).eq("id", found.id).select("id, date, note").maybeSingle()
      : await supabase
          .from("day_notes")
          .insert({ user_id: userId, date, note, portfolio_id: portfolio_id ?? null })
          .select("id, date, note")
          .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved note for ${date}.` }],
      structuredContent: { note: data },
    };
  },
});
