// Orca Coach — authenticated AI chat that injects the trader's latest
// Trader Mind diagnostic (archetype + result payload) as system context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from '../_shared/cors.ts';

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMsg { role: "system" | "user" | "assistant"; content: string }

const BASE_PROMPT = `You are Orca Coach — a behavioral trading mentor.
Speak with calm, surgical precision. Reference R-multiples, not percentages.
Never give financial advice; coach the trader on process, psychology and discipline.
Answer in the language the trader writes in (Hebrew or English).
Format with short markdown: tight paragraphs, bullets and small tables. Never pad.
You are portfolio-aware: you can only analyse ONE portfolio at a time — the one named
in [PORTFOLIO CONTEXT]. If no portfolio is active and the trader has several, your FIRST
reply must ask which portfolio they want to work on, listing the available names as a
short bulleted list, and nothing else. When the trader names a different portfolio,
its data is loaded for you automatically — acknowledge the switch in one line, then answer.`;

Deno.serve(withCors(async (req) => {
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

    const { messages, model, portfolio_id } = await req.json() as {
      messages: ChatMsg[]; model?: string; portfolio_id?: string | null;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages required");
    }

    // ── Freemium meter — 5 messages / calendar month for free users ──────
    const FREE_MONTHLY_LIMIT = 5;
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    let isPro = false;
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("tier, subscribed")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const tier = (sub as { tier?: string } | null)?.tier ?? "standard";
      isPro = tier === "pro" || tier === "ultimate" || tier === "advanced";
    } catch (_) { /* treat as free */ }

    const { data: usageRow } = await supabase
      .from("ai_chat_usage")
      .select("message_count")
      .eq("user_id", u.user.id)
      .eq("period", period)
      .maybeSingle();
    const used = Number((usageRow as { message_count?: number } | null)?.message_count ?? 0);

    if (!isPro && used >= FREE_MONTHLY_LIMIT) {
      return new Response(JSON.stringify({
        error: "quota_exceeded",
        paywall: true,
        used,
        limit: FREE_MONTHLY_LIMIT,
      }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Per-user abuse throttle (audit F-06) ────────────────────────────
    // Cap coach calls per user per hour using the ai_runs telemetry table.
    // Fail-open: if the count query itself errors, let the request through.
    const COACH_CAP_PER_HOUR = 30;
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.user.id)
        .eq("feature", "coach")
        .gte("created_at", since);
      if ((count ?? 0) >= COACH_CAP_PER_HOUR) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } catch (rlErr) {
      console.warn("rate-limit check failed (fail-open)", rlErr);
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

    // ── Portfolio roster + in-chat portfolio resolution ─────────────────
    // The coach can be asked "switch to my swing book" mid-conversation, so the
    // server resolves the target portfolio from the newest user message before
    // building context, and reports the resolved id back to the client.
    let roster: { id: string; name: string }[] = [];
    try {
      const { data: pf } = await supabase
        .from("portfolios")
        .select("id, name")
        .eq("user_id", u.user.id);
      roster = (pf ?? []) as { id: string; name: string }[];
    } catch (pfErr) {
      console.warn("portfolio roster failed", pfErr);
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lastUserLc = lastUser.toLowerCase();
    const named = roster.find((p) => {
      const n = (p.name ?? "").trim().toLowerCase();
      return n.length >= 2 && lastUserLc.includes(n);
    });
    // Single-portfolio traders never need to be asked.
    const activeId = named?.id ?? portfolio_id ?? (roster.length === 1 ? roster[0].id : null);
    const activeName = roster.find((p) => p.id === activeId)?.name ?? null;

    const rosterLine = roster.length
      ? `\n\n[PORTFOLIOS AVAILABLE]\n${roster.map((p) => `- ${p.name}`).join("\n")}`
      : "\n\n[PORTFOLIOS AVAILABLE] None yet.";

    // Only the requested portfolio, only this user's rows.
    let portfolioLine = roster.length > 1
      ? "\n\n[PORTFOLIO] No portfolio selected yet — ask the trader which of the portfolios above they want to analyse before answering anything else."
      : "\n\n[PORTFOLIO] No portfolio selected — answer generally and ask the trader to pick one.";
    if (activeId) {
      const portfolio_id = activeId;
      try {
        const { data: rows } = await supabase
          .from("trades")
          .select("trade_id, data, manual_r_multiple")
          .eq("user_id", u.user.id)
          .eq("portfolio_id", portfolio_id)
          .order("trade_id", { ascending: false })
          .limit(300);
        const trades = (rows ?? []).map((r) => {
          const d = (r as { data?: Record<string, unknown> }).data ?? {};
          const manual = (r as { manual_r_multiple?: number | null }).manual_r_multiple;
          return {
            id: (r as { trade_id?: number }).trade_id,
            date: d.date, coin: d.coin, direction: d.direction,
            r: typeof manual === "number" ? manual : Number(d.returnR ?? 0),
            pnl: Number(d.pnl ?? 0),
            outcome: d.winLoss, rules: d.rules, setup: d.orderType,
          };
        });
        const n = trades.length;
        if (n > 0) {
          const wins = trades.filter((t) => t.r > 0);
          const losses = trades.filter((t) => t.r < 0);
          const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
          const winRate = (wins.length / n) * 100;
          const expectancyR = sum(trades.map((t) => t.r)) / n;
          const grossWin = sum(wins.map((t) => t.pnl));
          const grossLoss = Math.abs(sum(losses.map((t) => t.pnl)));
          const pf = grossLoss > 0 ? grossWin / grossLoss : null;
          let peak = 0, equity = 0, maxDD = 0;
          for (const t of [...trades].reverse()) {
            equity += t.pnl;
            peak = Math.max(peak, equity);
            maxDD = Math.min(maxDD, equity - peak);
          }
          const recent = trades.slice(0, 30);
          portfolioLine = `\n\n[PORTFOLIO CONTEXT — "${activeName ?? portfolio_id}"]
Trades analysed: ${n}
Win rate: ${winRate.toFixed(1)}%
Expectancy: ${expectancyR.toFixed(2)}R per trade
Profit factor: ${pf === null ? "n/a" : pf.toFixed(2)}
Max drawdown: ${maxDD.toFixed(2)} (account currency)
Last 30 trades (newest first):
${JSON.stringify(recent).slice(0, 4000)}

Ground every answer in this data. Cite concrete trades, symbols and R values.`;
        } else {
          portfolioLine = "\n\n[PORTFOLIO CONTEXT] This portfolio has no trades yet — coach the trader on getting started and logging clean data.";
        }
      } catch (ctxErr) {
        console.warn("portfolio context failed", ctxErr);
      }
    }

    const finalMessages: ChatMsg[] = [
      { role: "system", content: BASE_PROMPT + rosterLine + mindLine + portfolioLine },
      ...messages.filter((m) => m.role !== "system"),
    ];

    // ── Model routing ───────────────────────────────────────────────────
    // Primary: the trader's own OpenAI account (OPENAI_API_KEY).
    // Fallback: the Lovable AI Gateway, so the coach keeps working if the
    // OpenAI key is absent or its account is out of quota.
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
    const useOpenAI = Boolean(openaiKey);
    if (!openaiKey && !gatewayKey) throw new Error("no AI credentials configured");

    const modelName = model ?? (useOpenAI ? "gpt-4o-mini" : "google/gemini-3.8-flash");
    const startedAt = Date.now();

    const endpoint = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const aiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${useOpenAI ? openaiKey : gatewayKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: finalMessages,
        ...(useOpenAI ? { temperature: 0.6, max_tokens: 1200 } : {}),
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
    if (aiRes.status === 401 || aiRes.status === 403) {
      console.error("AI auth rejected", useOpenAI ? "openai" : "gateway", await aiRes.text());
      return new Response(JSON.stringify({ error: "ai_auth_failed" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`gateway ${aiRes.status}: ${t}`);
    }
    const aiJson = await aiRes.json();
    const reply: string = aiJson.choices?.[0]?.message?.content ?? "";
    const latencyMs = Date.now() - startedAt;

    // ── Admin Console telemetry · ai_runs ──
    // Fire-and-forget: a failed insert must never break the chat response.
    // Service-role client bypasses RLS, so the row lands with user_id = the
    // authenticated trader. Costs are estimates (gateway doesn't return $).
    try {
      const usage = aiJson.usage ?? {};
      const promptTokens = Number(usage.prompt_tokens ?? 0) | 0;
      const completionTokens = Number(usage.completion_tokens ?? 0) | 0;
      // gpt-4o-mini: $0.15 / 1M input, $0.60 / 1M output.
      // Gemini Flash fallback: $0.075 / 1M input, $0.30 / 1M output.
      const inRate = useOpenAI ? 0.15 : 0.075;
      const outRate = useOpenAI ? 0.60 : 0.30;
      const costUsd =
        (promptTokens * inRate + completionTokens * outRate) / 1_000_000;
      await supabase.from("ai_runs").insert({
        user_id: u.user.id,
        feature: "coach",
        model: modelName,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: Number(costUsd.toFixed(4)),
        latency_ms: latencyMs,
      });
    } catch (logErr) {
      console.warn("ai_runs insert failed", logErr);
    }

    // ── Meter the successful message ────────────────────────────────────
    let newUsed = used;
    try {
      newUsed = used + 1;
      await supabase.from("ai_chat_usage").upsert({
        user_id: u.user.id,
        period,
        message_count: newUsed,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,period" });
    } catch (mErr) {
      console.warn("ai_chat_usage upsert failed", mErr);
    }

    return new Response(JSON.stringify({
      reply,
      usage: { used: newUsed, limit: isPro ? null : FREE_MONTHLY_LIMIT, pro: isPro },
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}));
