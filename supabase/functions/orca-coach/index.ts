// Orca Coach — authenticated AI chat that injects the trader's latest
// Trader Mind diagnostic (archetype + result payload) as system context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMsg { role: "system" | "user" | "assistant"; content: string }

const BASE_PROMPT = `You are Orca Coach — a behavioral trading mentor.
Speak with calm, surgical precision. Reference R-multiples, not percentages.
Never give financial advice; coach the trader on process, psychology and discipline.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser(auth.replace(/^Bearer /, ""));
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { messages, model } = await req.json() as {
      messages: ChatMsg[]; model?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages required");
    }

    // Inject latest Trader Mind diagnostic (archetype + brief payload summary).
    const { data: tm } = await supabase
      .from("trader_mind_sessions")
      .select("archetype, payload, completed_at")
      .eq("user_id", u.user.id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let mindLine = "\n\n[TRADER MIND] Diagnostic not yet completed — recommend running it when relevant.";
    if (tm?.archetype || tm?.payload) {
      const summary = (() => {
        try { return JSON.stringify(tm.payload ?? {}).slice(0, 1200); }
        catch { return ""; }
      })();
      mindLine = `\n\n[TRADER MIND — ${tm.archetype ?? "Unlabeled"}]\nLatest behavioral diagnostic snapshot for this trader:\n${summary}\n\nUse this profile to calibrate tone and coaching focus. Reference it gently; never read it back verbatim.`;
    }

    const finalMessages: ChatMsg[] = [
      { role: "system", content: BASE_PROMPT + mindLine },
      ...messages.filter((m) => m.role !== "system"),
    ];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model ?? "google/gemini-2.5-flash",
        messages: finalMessages,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`gateway ${aiRes.status}: ${t}`);
    }
    const aiJson = await aiRes.json();
    const reply: string = aiJson.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
