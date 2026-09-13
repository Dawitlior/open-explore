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

/* ── Cost-governed usage caps ──────────────────────────────────────────
   Measured cost per coach message on gpt-4o-mini with the full portfolio
   context: ~12k input + ~700 output tokens ≈ $0.0022.
   Budget guard-rail: token spend must stay under 10% of a $10 Pro seat,
   i.e. ≤ $1.00 / user / month ≈ 450 messages.
   Caps below sit safely inside that envelope:
     · session  = 25 messages per rolling 5 hours (Claude-style cooldown)
     · daily    = 60 messages per rolling 24 hours
     · monthly  = 400 messages per calendar month  (≈ $0.88 worst case)   */
const PRO_SESSION_LIMIT = 25;
const PRO_SESSION_HOURS = 5;
const PRO_DAILY_LIMIT = 60;
const PRO_MONTHLY_LIMIT = 400;

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    // Service-role client: all reads below are explicitly scoped with
    // `.eq("user_id", <authenticated uid>)`, never with a client-supplied id.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: u } = await supabase.auth.getUser(auth.replace(/^Bearer /, ""));
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const uid = u.user.id;

    const { messages, model, portfolio_id, memory, action } = await req.json() as {
      messages: ChatMsg[]; model?: string; portfolio_id?: string | null;
      memory?: string | null; action?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages required");
    }
    // Bounded input: a conversation can never push an unbounded prompt upstream.
    const safeMessages: ChatMsg[] = messages
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-60)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
    const priorMemory = typeof memory === "string" ? memory.slice(0, 4000) : "";

    // ── Model routing (shared by chat + compaction) ─────────────────────
    const aiOpenAiKey = Deno.env.get("OPENAI_API_KEY");
    const aiGatewayKey = Deno.env.get("LOVABLE_API_KEY");
    const aiUseOpenAI = Boolean(aiOpenAiKey);
    const aiEndpoint = aiUseOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    /* ── Context compaction ───────────────────────────────────────────────
       A long conversation is folded into a compact rolling memory so later
       turns keep continuity without an ever-growing prompt. This is
       background housekeeping, so it is NOT metered as a user message. */
    if (action === "compact") {
      if (!aiOpenAiKey && !aiGatewayKey) throw new Error("no AI credentials configured");
      const transcript = safeMessages
        .map((m) => `${m.role === "user" ? "TRADER" : "COACH"}: ${m.content}`)
        .join("\n\n")
        .slice(0, 24000);
      const compactRes = await fetch(aiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiUseOpenAI ? aiOpenAiKey : aiGatewayKey}`,
        },
        body: JSON.stringify({
          model: model ?? (aiUseOpenAI ? "gpt-4o-mini" : "google/gemini-3.8-flash"),
          messages: [
            {
              role: "system",
              content:
                "Compress this coaching conversation into durable memory notes for the coach. " +
                "Keep: the trader's goals, the portfolio discussed, findings and numbers already " +
                "established, commitments, and open threads. Drop pleasantries and anything " +
                "recomputable from raw data. Max 220 words, terse bullets, same language as the trader.",
            },
            {
              role: "user",
              content: (priorMemory ? `EXISTING MEMORY:\n${priorMemory}\n\n` : "") + `CONVERSATION:\n${transcript}`,
            },
          ],
          ...(aiUseOpenAI ? { temperature: 0.2, max_tokens: 500 } : {}),
        }),
      });
      if (!compactRes.ok) {
        return new Response(JSON.stringify({ error: "compact_failed" }), {
          status: 503, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const compactJson = await compactRes.json();
      const summary = String(compactJson?.choices?.[0]?.message?.content ?? "").slice(0, 4000);
      return new Response(JSON.stringify({ memory: summary }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Freemium meter — 5 messages / calendar month for free users ──────
    const FREE_MONTHLY_LIMIT = 5;
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    let isPro = false;
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", uid)
        .maybeSingle();
      const tier = (sub as { tier?: string } | null)?.tier ?? "standard";
      isPro = tier === "pro" || tier === "ultimate" || tier === "advanced";
    } catch (_) { /* treat as free */ }

    // Atomic consume — increments and returns the new count, or NULL when the
    // cap was already reached. This closes the double-click race: two parallel
    // requests can never both pass the same last free slot.
    const monthlyCap = isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
    const { data: consumed, error: consumeErr } = await supabase.rpc(
      "consume_ai_chat_message",
      { p_user: uid, p_period: period, p_limit: monthlyCap },
    );
    if (consumeErr) throw consumeErr;
    const used = Number(consumed ?? monthlyCap);
    const blocked = consumed === null || consumed === undefined;

    // Refund the slot whenever the request does not produce an answer.
    const refund = async () => {
      if (blocked) return;
      try {
        await supabase
          .from("ai_chat_usage")
          .update({ message_count: Math.max(0, used - 1), updated_at: new Date().toISOString() })
          .eq("user_id", uid).eq("period", period);
      } catch (_) { /* best effort */ }
    };

    if (blocked) {
      if (!isPro) {
        return new Response(JSON.stringify({
          error: "quota_exceeded", paywall: true, used: FREE_MONTHLY_LIMIT, limit: FREE_MONTHLY_LIMIT,
        }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        error: "monthly_cap", scope: "month", limit: PRO_MONTHLY_LIMIT,
      }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Rolling session + daily caps (Pro fair use, audit F-06) ─────────
    // Counted from the ai_runs telemetry trail. Fail-open on query errors.
    try {
      const now = Date.now();
      const sessionSince = new Date(now - PRO_SESSION_HOURS * 3600_000).toISOString();
      const daySince = new Date(now - 24 * 3600_000).toISOString();
      const countRuns = async (since: string) => {
        const { count } = await supabase
          .from("ai_runs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid).eq("feature", "coach")
          .gte("created_at", since);
        return count ?? 0;
      };
      const [sessionCount, dayCount] = await Promise.all([
        countRuns(sessionSince), countRuns(daySince),
      ]);
      const sessionCap = isPro ? PRO_SESSION_LIMIT : FREE_MONTHLY_LIMIT;
      if (sessionCount >= sessionCap) {
        // Cooldown = time until the oldest call in the window ages out.
        const { data: oldest } = await supabase
          .from("ai_runs").select("created_at")
          .eq("user_id", uid).eq("feature", "coach")
          .gte("created_at", sessionSince)
          .order("created_at", { ascending: true }).limit(1).maybeSingle();
        const oldestAt = oldest?.created_at ? new Date(oldest.created_at).getTime() : now;
        const resetAt = new Date(oldestAt + PRO_SESSION_HOURS * 3600_000).toISOString();
        await refund();
        return new Response(JSON.stringify({
          error: "session_cap", scope: "session", limit: sessionCap, reset_at: resetAt,
        }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (isPro && dayCount >= PRO_DAILY_LIMIT) {
        await refund();
        return new Response(JSON.stringify({
          error: "daily_cap", scope: "day", limit: PRO_DAILY_LIMIT,
          reset_at: new Date(now + 3600_000).toISOString(),
        }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
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

    let mindLine =
      "\n\n[TRADER MIND] The trader has NOT completed the Trader Mind diagnostic. " +
      "You have zero behavioural-profile data. If asked what the test says about them, or about their " +
      "archetype/psychological profile, you MUST say plainly that the diagnostic has not been taken yet " +
      "and point them to the 'Test Yourself' channel in the sidebar. NEVER invent, guess, or infer an " +
      "archetype, test result, or diagnostic wording. You may still discuss behaviour visible in actual trade data, " +
      "clearly labelled as coming from trades, not from the test.";
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

    // Hard ownership gate: a client-supplied portfolio_id is only honoured when
    // it appears in this trader's own roster. A foreign id is rejected outright
    // rather than silently ignored, so cross-account probing is impossible.
    if (portfolio_id && !roster.some((p) => p.id === portfolio_id)) {
      await refund();
      return new Response(JSON.stringify({ error: "forbidden_portfolio" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

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

    // Conversation memory: keep the thread coherent for follow-up questions
    // ("and that trade you mentioned?") without letting the prompt balloon.
    // Six turns is the sweet spot between continuity and token spend; each
    // request also carries the full pre-aggregated portfolio context anyway.
    const HISTORY_TURNS = 6;
    const history = messages.filter((m) => m.role !== "system").slice(-HISTORY_TURNS);
    const finalMessages: ChatMsg[] = [
      { role: "system", content: BASE_PROMPT + rosterLine + mindLine + portfolioLine },
      ...history,
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

    // Upstream failures must never leave the client spinning: every branch
    // below refunds the metered slot and returns a friendly, typed error.
    let aiRes: Response;
    try {
      aiRes = await fetch(endpoint, {
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
    } catch (netErr) {
      console.error("AI transport failure", netErr);
      await refund();
      return new Response(JSON.stringify({ error: "ai_unavailable", retryable: true }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (aiRes.status === 429) {
      await refund();
      return new Response(JSON.stringify({ error: "upstream_busy", scope: "provider", retryable: true }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      await refund();
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 401 || aiRes.status === 403) {
      console.error("AI auth rejected", useOpenAI ? "openai" : "gateway", await aiRes.text());
      await refund();
      return new Response(JSON.stringify({ error: "ai_auth_failed" }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      console.error("AI upstream error", aiRes.status, await aiRes.text());
      await refund();
      return new Response(JSON.stringify({ error: "ai_unavailable", retryable: true }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const reply: string = aiJson.choices?.[0]?.message?.content ?? "";
    const latencyMs = Date.now() - startedAt;
    if (!reply.trim()) {
      await refund();
      return new Response(JSON.stringify({ error: "ai_unavailable", retryable: true }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Admin Console telemetry · ai_runs ──
    // Fire-and-forget: a failed insert must never break the chat response.
    // Costs are estimates and also drive the rolling session/daily caps.
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
        user_id: uid,
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

    return new Response(JSON.stringify({
      reply,
      portfolio: activeId ? { id: activeId, name: activeName } : null,
      portfolios: roster,
      needs_portfolio: needsPortfolio,
      usage: {
        used,
        limit: isPro ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT,
        pro: isPro,
        session_limit: isPro ? PRO_SESSION_LIMIT : FREE_MONTHLY_LIMIT,
        daily_limit: isPro ? PRO_DAILY_LIMIT : FREE_MONTHLY_LIMIT,
      },
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Never leak internals to the client — log server-side, answer generically.
    console.error("orca-coach failure", e);
    return new Response(JSON.stringify({ error: "coach_unavailable", retryable: true }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}));
