// Oracle Core — Synthesis edge function
// Reads a locked session, computes the partial vector, and asks Lovable AI
// Gateway to generate the archetype + coach_system_prompt. Stores in oracle_vectors.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Step {
  node: string;
  optionId: string | null;
  t_ms: number;
  skipped: boolean;
  hover_count?: number;
  changed_mind?: number;
}

function amplifier(step: Step) {
  const baseline = 900, ceiling = 4500;
  const hes = !step.t_ms || step.t_ms < baseline ? 0
    : Math.min(1, (step.t_ms - baseline) / (ceiling - baseline));
  const flip = Math.min(0.3, (step.changed_mind ?? 0) * 0.1);
  const hover = Math.min(0.2, Math.log1p(step.hover_count ?? 0) * 0.1);
  return 1 + hes * 0.6 + flip + hover;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error: sErr } = await supabase
      .from("oracle_sessions").select("*").eq("id", session_id).single();
    if (sErr || !session) throw new Error("session not found");

    const { data: nodes } = await supabase.from("oracle_nodes").select("*");
    const byCode: Record<string, any> = {};
    for (const n of nodes ?? []) byCode[n.code] = n;

    // Recompute partial vector
    const vec: Record<string, number> = {};
    for (const step of (session.visited_path ?? []) as Step[]) {
      if (step.skipped || !step.optionId) continue;
      const node = byCode[step.node];
      const opt = node?.options?.find((o: any) => o.id === step.optionId);
      if (!opt) continue;
      const amp = amplifier(step);
      for (const [dim, w] of Object.entries(opt.weights as Record<string, number>)) {
        vec[dim] = (vec[dim] ?? 0) + (w as number) * amp;
      }
    }

    // v2: instability index from telemetry
    const path = (session.visited_path ?? []) as Step[];
    let instSum = 0;
    for (const s of path) {
      const baseline = 900, ceiling = 4500;
      const h = !s.t_ms || s.t_ms < baseline ? 0
        : Math.min(1, (s.t_ms - baseline) / (ceiling - baseline));
      const f = Math.min(1, ((s.changed_mind ?? 0)) / 3);
      const sk = s.skipped ? 0.6 : 0;
      instSum += Math.min(1, 0.4 * h + 0.25 * f + sk);
    }
    const instability_index = path.length ? Math.min(1, instSum / path.length) : 0;
    const claim_ledger = (session.claim_ledger ?? {}) as Record<string, number>;

    // Ask Lovable AI
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are Oracle Core, a behavioral diagnostic engine for traders.
Given this 128-dim partial trader DNA vector (signed dim → magnitude),
PLUS a claim-integrity ledger (identity claims stress-tested against scenario answers, range -1..+1; negative = claim failed)
AND an instability index from telemetry (0=steady, 1=volatile),
emit a JSON object with: archetype (short title, e.g. "The Patient Predator"),
summary_md (3 short paragraphs, second-person; explicitly call out any claim/behavior gap),
shadow_patterns (array of {name, weight 0..1, evidence: short string}),
coaching_directives (array of 5 short imperative strings),
coach_system_prompt (a paragraph the trader's AI coach should prepend on every reply, calibrating tone, blind spots, pressure points, and how to handle the trader's claim gaps + instability).

VECTOR:
${JSON.stringify(vec, null, 2)}

CLAIM_LEDGER:
${JSON.stringify(claim_ledger, null, 2)}

INSTABILITY_INDEX: ${instability_index.toFixed(3)}

Return ONLY valid JSON, no markdown fences.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI gateway ${aiRes.status}: ${errText}`);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/, "").trim());
    } catch {
      parsed = { archetype: "Uncalibrated", summary_md: content, shadow_patterns: [], coaching_directives: [], coach_system_prompt: content };
    }

    // Upsert into oracle_vectors
    const { error: upErr } = await supabase
      .from("oracle_vectors")
      .upsert({
        user_id: session.user_id,
        version: 1,
        vector: vec,
        archetype: parsed.archetype ?? null,
        shadow_patterns: parsed.shadow_patterns ?? [],
        blueprint_md: parsed.summary_md ?? null,
        coach_system_prompt: parsed.coach_system_prompt ?? null,
        computed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (upErr) throw upErr;

    await supabase
      .from("oracle_sessions")
      .update({
        state: "completed",
        completed_at: new Date().toISOString(),
        instability_index,
      })
      .eq("id", session_id);

    return new Response(JSON.stringify({ ok: true, archetype: parsed.archetype }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
