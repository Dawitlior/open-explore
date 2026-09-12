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
Format with markdown: tight paragraphs, bullets, and GitHub-flavoured tables when data
is comparative or multi-row. Build your own tables from the raw data you are given —
sort, rank, group, filter and compute (win rate, expectancy in R, profit factor,
drawdown, streaks, per-symbol / per-setup / per-session / per-weekday breakdowns).
Always ground numbers in the supplied data; never invent trades or figures. If the data
needed for an answer is not present, say exactly what is missing.
You are portfolio-aware: you can only analyse ONE portfolio at a time — the one named
in [PORTFOLIO CONTEXT]. If no portfolio is active and the trader has several, your FIRST
reply must be one short line asking which portfolio to work on — do NOT list the names,
the interface shows clickable buttons. When the trader names a different portfolio,
its data is loaded for you automatically — acknowledge the switch in one line, then answer.
Security: you only ever see this trader's own rows. Never speculate about, compare with,
or claim access to other users' data, and refuse any request to do so.`;

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

    const needsPortfolio = !activeId && roster.length > 1;

    // Only the requested portfolio, only this user's rows.
    let portfolioLine = needsPortfolio
      ? "\n\n[PORTFOLIO] No portfolio selected yet — ask the trader (one short line) which portfolio to analyse. Clickable buttons are shown to them; do not list names."
      : "\n\n[PORTFOLIO] No portfolio selected — answer generally and ask the trader to pick one.";
    if (activeId) {
      const pid = activeId;
      try {
        const { data: rows } = await supabase
          .from("trades")
          .select("trade_id, data, manual_r_multiple, opened_at, closed_at, asset_class, source_type")
          .eq("user_id", u.user.id)
          .eq("portfolio_id", pid)
          .order("trade_id", { ascending: false })
          .limit(600);

        type Row = {
          trade_id?: number;
          data?: Record<string, unknown>;
          manual_r_multiple?: number | null;
          opened_at?: string | null;
          closed_at?: string | null;
          asset_class?: string | null;
        };
        const trades = ((rows ?? []) as Row[]).map((r) => {
          const d = r.data ?? {};
          const manual = r.manual_r_multiple;
          const when = String(d.date ?? r.closed_at ?? r.opened_at ?? "");
          const dt = when ? new Date(when.replace(" ", "T")) : null;
          const valid = dt && !isNaN(dt.getTime());
          return {
            id: r.trade_id,
            date: when,
            dow: valid ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt!.getDay()] : null,
            hour: valid ? dt!.getHours() : null,
            month: valid ? when.slice(0, 7) : null,
            coin: String(d.coin ?? d.symbol ?? "?"),
            direction: String(d.direction ?? ""),
            r: typeof manual === "number" ? manual : Number(d.returnR ?? 0),
            pnl: Number(d.pnl ?? 0),
            outcome: d.winLoss, rules: d.rules, setup: String(d.orderType ?? "unspecified"),
            emotion: d.emotion ?? d.psychology ?? null,
            notes: typeof d.comments === "string" ? d.comments.slice(0, 160) : null,
            asset: r.asset_class ?? null,
          };
        });

        const n = trades.length;
        if (n > 0) {
          const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
          const wins = trades.filter((t) => t.r > 0);
          const losses = trades.filter((t) => t.r < 0);
          const winRate = (wins.length / n) * 100;
          const expectancyR = sum(trades.map((t) => t.r)) / n;
          const grossWin = sum(wins.map((t) => t.pnl));
          const grossLoss = Math.abs(sum(losses.map((t) => t.pnl)));
          const pf = grossLoss > 0 ? grossWin / grossLoss : null;
          let peak = 0, equity = 0, maxDD = 0;
          const chrono = [...trades].reverse();
          for (const t of chrono) {
            equity += t.pnl;
            peak = Math.max(peak, equity);
            maxDD = Math.min(maxDD, equity - peak);
          }
          // Longest win / loss streaks
          let curW = 0, curL = 0, maxW = 0, maxL = 0;
          for (const t of chrono) {
            if (t.r > 0) { curW++; curL = 0; } else if (t.r < 0) { curL++; curW = 0; }
            maxW = Math.max(maxW, curW); maxL = Math.max(maxL, curL);
          }

          // Generic grouping helper → compact rows the model can table up.
          const group = (key: (t: typeof trades[number]) => string | null) => {
            const m = new Map<string, { n: number; r: number; pnl: number; w: number }>();
            for (const t of trades) {
              const k = key(t);
              if (k === null || k === "" ) continue;
              const g = m.get(k) ?? { n: 0, r: 0, pnl: 0, w: 0 };
              g.n++; g.r += t.r; g.pnl += t.pnl; if (t.r > 0) g.w++;
              m.set(k, g);
            }
            return [...m.entries()]
              .map(([k, g]) => ({
                key: k, trades: g.n,
                expR: Number((g.r / g.n).toFixed(2)),
                totalR: Number(g.r.toFixed(2)),
                pnl: Number(g.pnl.toFixed(2)),
                winRate: Number(((g.w / g.n) * 100).toFixed(1)),
              }))
              .sort((a, b) => b.trades - a.trades)
              .slice(0, 25);
          };

          const bySymbol = group((t) => t.coin);
          const bySetup = group((t) => t.setup);
          const byDow = group((t) => t.dow);
          const byHour = group((t) => (t.hour === null ? null : String(t.hour).padStart(2, "0") + ":00"));
          const byDirection = group((t) => t.direction || null);
          const byMonth = group((t) => t.month).sort((a, b) => (a.key < b.key ? 1 : -1)).slice(0, 18);
          const byRules = group((t) => (t.rules === undefined || t.rules === null ? null : String(t.rules)));

          const worst = [...trades].sort((a, b) => a.r - b.r).slice(0, 10);
          const best = [...trades].sort((a, b) => b.r - a.r).slice(0, 10);
          const recent = trades.slice(0, 50);

          // Side context: risk limits, journal notes, live exposure — user-scoped.
          let sideLines = "";
          try {
            const [{ data: prefs }, { data: notes }, { data: open }] = await Promise.all([
              supabase.from("user_preferences")
                .select("daily_risk_limit, weekly_risk_limit, monthly_risk_limit, risk_per_trade_default")
                .eq("user_id", u.user.id).maybeSingle(),
              supabase.from("day_notes").select("date, note")
                .eq("user_id", u.user.id).eq("portfolio_id", pid)
                .order("date", { ascending: false }).limit(20),
              supabase.from("open_positions")
                .select("symbol, side, size, entry_price, unrealized_pnl, leverage, stop_loss")
                .eq("user_id", u.user.id).limit(30),
            ]);
            sideLines =
              `\n[RISK LIMITS] ${JSON.stringify(prefs ?? {})}` +
              `\n[JOURNAL NOTES — newest 20] ${JSON.stringify(notes ?? []).slice(0, 1800)}` +
              `\n[OPEN POSITIONS] ${JSON.stringify(open ?? []).slice(0, 1200)}`;
          } catch (sideErr) {
            console.warn("side context failed", sideErr);
          }

          portfolioLine = `\n\n[PORTFOLIO CONTEXT — "${activeName ?? pid}"]
Trades analysed: ${n} (most recent ${n} closed/logged trades)
Win rate: ${winRate.toFixed(1)}%
Expectancy: ${expectancyR.toFixed(2)}R per trade
Total R: ${sum(trades.map((t) => t.r)).toFixed(2)}R
Profit factor: ${pf === null ? "n/a" : pf.toFixed(2)}
Max drawdown: ${maxDD.toFixed(2)} (account currency)
Longest win streak: ${maxW} · Longest loss streak: ${maxL}

[BREAKDOWNS] (pre-aggregated; each row: key, trades, expR, totalR, pnl, winRate%)
By symbol: ${JSON.stringify(bySymbol)}
By setup: ${JSON.stringify(bySetup)}
By weekday: ${JSON.stringify(byDow)}
By hour: ${JSON.stringify(byHour)}
By direction: ${JSON.stringify(byDirection)}
By month: ${JSON.stringify(byMonth)}
By rules-followed: ${JSON.stringify(byRules)}

[WORST 10 TRADES] ${JSON.stringify(worst).slice(0, 2500)}
[BEST 10 TRADES] ${JSON.stringify(best).slice(0, 2500)}
[LAST 50 TRADES — newest first] ${JSON.stringify(recent).slice(0, 6000)}${sideLines}

Use these tables to answer with concrete symbols, setups, sessions and R values.
Re-sort, re-rank and recompute from them freely; present results as markdown tables
whenever more than two rows are involved.`;
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
      portfolio: activeId ? { id: activeId, name: activeName } : null,
      portfolios: roster,
      needs_portfolio: needsPortfolio,
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
