/**
 * Orca Coach — AI trading performance coach.
 *
 * Two distinct states, Gemini-style:
 *   IDLE   → centred greeting, one large composer, portfolio picker,
 *            suggestion chips and capability cards. No chat chrome.
 *   ACTIVE → the whole surface becomes a transcript with a slim top bar
 *            and a sticky composer. Cards and hero disappear.
 *
 * All model access happens server-side in the `orca-coach` edge function,
 * which resolves the portfolio (including in-chat switches by name), injects
 * that portfolio's trades/analytics plus the Trader Mind diagnostic, and
 * enforces the free-tier meter (5 messages / calendar month).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp, Activity, Search, Target, Clock3, Layers, Infinity as InfinityIcon,
  Square, RotateCcw, Lock, ChevronDown, Briefcase,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import { useEntitlement } from '@/hooks/use-entitlement';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor } from '@/lib/semantic-color';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
}

interface Msg { role: 'user' | 'assistant'; content: string }

const FREE_LIMIT = 5;

export default function OrcaCoachPage({ T, isRTL }: Props) {
  const { activePortfolioId, portfolios, setActivePortfolioId } = useActivePortfolio();
  const { tier } = useEntitlement();
  const isPro = tier === 'pro';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [needsPortfolio, setNeedsPortfolio] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const cancelled = useRef(false);
  const accent = infoColor(T);

  const started = messages.length > 0;

  /* Load this month's usage so the meter is honest before the first send. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const period = new Date().toISOString().slice(0, 7);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from('ai_chat_usage')
        .select('message_count')
        .eq('user_id', auth.user.id)
        .eq('period', period)
        .maybeSingle();
      if (alive) setUsed(Number((data as { message_count?: number } | null)?.message_count ?? 0));
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => { if (!busy && !paywall) taRef.current?.focus(); }, [busy, paywall, started]);

  const autoGrow = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  const send = useCallback(async (text: string, overridePortfolioId?: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    if (!isPro && used >= FREE_LIMIT) { setPaywall(true); return; }
    setError(null);
    setNeedsPortfolio(false);
    cancelled.current = false;
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    requestAnimationFrame(autoGrow);
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('orca-coach', {
        body: { messages: next, portfolio_id: overridePortfolioId ?? activePortfolioId },
      });
      if (cancelled.current) return;
      if (fnErr) {
        const ctx = (fnErr as unknown as { context?: { status?: number; body?: unknown } }).context;
        const status = ctx?.status;
        let code = '';
        let resetAt: string | null = null;
        try {
          const parsed = typeof ctx?.body === 'string' ? JSON.parse(ctx.body) : (ctx?.body as Record<string, unknown> | undefined);
          code = String(parsed?.error ?? '');
          resetAt = (parsed?.reset_at as string | undefined) ?? null;
        } catch { /* body may not be JSON */ }

        if (status === 402) { setPaywall(true); return; }
        if (status === 403) {
          setError(isRTL ? 'התיק הזה אינו זמין בחשבון שלך.' : 'That portfolio is not available on your account.');
          return;
        }
        if (status === 429) {
          const until = resetAt
            ? new Date(resetAt).toLocaleTimeString(isRTL ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
            : null;
          if (code === 'session_cap') {
            setError(isRTL
              ? `הגעת למכסת ההודעות של הסשן הזה. אפשר להמשיך${until ? ` בסביבות ${until}` : ' בעוד כמה שעות'}.`
              : `You have reached this session's message allowance. You can continue${until ? ` around ${until}` : ' in a few hours'}.`);
          } else if (code === 'daily_cap') {
            setError(isRTL ? 'הגעת למכסת ההודעות היומית. נתראה מחר.' : 'You have reached today’s message allowance. Back tomorrow.');
          } else if (code === 'monthly_cap') {
            setError(isRTL ? 'הגעת למכסה החודשית של השימוש ההוגן.' : 'You have reached the monthly fair-use allowance.');
          } else {
            setError(isRTL ? 'המאמן עמוס כרגע — נסה שוב בעוד רגע.' : 'The coach is busy right now — try again in a moment.');
          }
          return;
        }
        if (status === 503) {
          setError(isRTL ? 'המאמן עמוס כרגע — נסה שוב בעוד רגע.' : 'The coach is busy right now — try again in a moment.');
          return;
        }
        throw fnErr;
      }
      const payload = data as {
        reply?: string;
        portfolio?: { id: string; name: string | null } | null;
        usage?: { used?: number };
        error?: string;
        paywall?: boolean;
        needs_portfolio?: boolean;
      };
      if (payload?.paywall) { setPaywall(true); return; }
      if (payload?.error) throw new Error(payload.error);
      setNeedsPortfolio(Boolean(payload?.needs_portfolio));
      // The coach may switch portfolio in-chat ("look at my swing book") —
      // mirror that choice in the app so the rest of the UI stays in sync.
      if (payload?.portfolio?.id && payload.portfolio.id !== activePortfolioId) {
        setActivePortfolioId(payload.portfolio.id);
      }
      setMessages(m => [...m, { role: 'assistant', content: payload?.reply ?? '' }]);
      if (typeof payload?.usage?.used === 'number') setUsed(payload.usage.used);
      else setUsed(u => u + 1);
    } catch (e) {
      if (!cancelled.current) {
        setError(isRTL ? 'הקואצ׳ לא הצליח להשיב כרגע. נסה שוב.' : 'The coach could not answer right now. Please try again.');
      }
      console.error('orca-coach', e);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, activePortfolioId, setActivePortfolioId, isPro, used, isRTL, autoGrow]);

  const STARTERS = useMemo(() => (isRTL
    ? ['מה הדליפה הגדולה ביותר בתיק שלי?', 'נתח את 10 העסקאות האחרונות שלי', 'באילו שעות אני מפסיד הכי הרבה?', 'מה הצעד הבא שכדאי לי לתקן?']
    : ['What is my single biggest leak?', 'Review my last 10 trades', 'Which sessions cost me the most?', 'What should I fix next?']), [isRTL]);

  const CARDS = [
    { Icon: Activity, he: 'איתור דליפות', en: 'Leak detection', dhe: 'מה פוגע בתוצאות — עם העסקאות, הסשנים והנכסים שמאחורי זה.', den: 'What is hurting results — with the trades, sessions and symbols behind it.' },
    { Icon: Search, he: 'ביקורת מבוססת ראיות', en: 'Evidence-based review', dhe: 'הפסדים גדולים, עסקאות אחרונות והערות יומן — בלי מעבר בין לשוניות.', den: 'Worst trades, recent tables and journal notes without hunting tabs.' },
    { Icon: Target, he: 'צעדים ברי ביצוע', en: 'Coachable next steps', dhe: 'שאלות רחבות הופכות לביקורת ממוקדת: מה לתקן, לבדוק ולנטר.', den: 'Broad questions become focused reviews: fix, test, watch.' },
    { Icon: Layers, he: 'סיכומים וטבלאות', en: 'Structured artifacts', dhe: 'סיכומים, השוואות ופילוחים שקל לפעול לפיהם.', den: 'Summaries, comparisons and breakdowns that are easy to act on.' },
    { Icon: Clock3, he: 'תזמון וסשנים', en: 'Timing & sessions', dhe: 'איך שעת היום והסשן מעצבים את התוצאות שלך.', den: 'How time of day and session choice shape your outcomes.' },
    { Icon: InfinityIcon, he: 'החלפת תיקים בצ׳אט', en: 'Switch books in chat', dhe: 'בקשו "תעבור לתיק הסווינג" והקואצ׳ יטען את הנתונים של אותו תיק.', den: 'Say “switch to my swing book” and the coach loads that portfolio’s data.' },
  ];

  const remaining = Math.max(0, FREE_LIMIT - used);
  const meterPct = isPro ? 100 : Math.round((remaining / FREE_LIMIT) * 100);

  const panel: React.CSSProperties = {
    background: T.bg.card,
    border: `1px solid ${T.border.subtle}`,
    borderRadius: T.radius.lg,
  };
  const mono: React.CSSProperties = {
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  };

  const openUpgrade = () => window.dispatchEvent(new CustomEvent('orca:open-upgrade', { detail: { required: 'pro' } }));

  /* ── Portfolio picker (shared by both states) ─────────────────────── */
  const portfolioPicker = (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Briefcase size={12} style={{ position: 'absolute', insetInlineStart: 10, pointerEvents: 'none', color: T.text.muted }} />
      <select
        value={activePortfolioId ?? ''}
        onChange={e => setActivePortfolioId(e.target.value)}
        aria-label={isRTL ? 'תיק פעיל' : 'Active portfolio'}
        style={{
          appearance: 'none', background: 'transparent', color: T.text.primary,
          border: `1px solid ${T.border.subtle}`, borderRadius: 999,
          fontSize: 11.5, fontWeight: 600, padding: '5px 26px 5px 28px',
          cursor: portfolios.length > 1 ? 'pointer' : 'default',
        }}
      >
        {portfolios.length === 0 && <option value="">{isRTL ? 'אין תיק' : 'No portfolio'}</option>}
        {portfolios.length > 1 && <option value="">{isRTL ? 'שאל אותי איזה תיק' : 'Let the coach ask'}</option>}
        {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <ChevronDown size={12} style={{ position: 'absolute', insetInlineEnd: 9, pointerEvents: 'none', color: T.text.muted }} />
    </div>
  );

  /* ── Composer (shared, sized per state) ───────────────────────────── */
  const composer = (big: boolean) => (
    <form
      onSubmit={e => { e.preventDefault(); send(input); }}
      style={{ width: '100%' }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: T.bg.card, border: `1px solid ${T.border.subtle}`,
        borderRadius: big ? 22 : 16, padding: big ? '10px 10px 10px 14px' : 8,
        boxShadow: big ? `0 18px 44px -28px ${accent}66` : 'none',
      }}>
        <textarea
          ref={taRef}
          value={input}
          onChange={e => { setInput(e.target.value); autoGrow(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          placeholder={isRTL ? 'שאלו את Orca Coach…' : 'Message Orca Coach…'}
          style={{
            flex: 1, resize: 'none', background: 'transparent', color: T.text.primary,
            border: 'none', outline: 'none', padding: big ? '8px 4px' : '6px 6px',
            fontSize: big ? 14.5 : 13.5, lineHeight: 1.6, fontFamily: 'inherit',
            maxHeight: 168, minHeight: big ? 38 : 34,
          }}
        />
        {busy ? (
          <button
            type="button"
            onClick={() => { cancelled.current = true; setBusy(false); }}
            aria-label={isRTL ? 'עצור' : 'Stop'}
            style={{
              width: big ? 38 : 34, height: big ? 38 : 34, flexShrink: 0, display: 'grid', placeItems: 'center',
              background: 'transparent', border: `1px solid ${T.border.subtle}`,
              color: T.text.secondary, borderRadius: 999, cursor: 'pointer',
            }}
          ><Square size={12} /></button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label={isRTL ? 'שליחה' : 'Send'}
            style={{
              width: big ? 38 : 34, height: big ? 38 : 34, flexShrink: 0, display: 'grid', placeItems: 'center',
              background: input.trim() ? accent : 'transparent',
              border: input.trim() ? 'none' : `1px solid ${T.border.subtle}`,
              color: input.trim() ? T.bg.primary : T.text.muted,
              borderRadius: 999, cursor: input.trim() ? 'pointer' : 'default',
              transition: 'background 140ms ease, color 140ms ease',
            }}
          ><ArrowUp size={15} /></button>
        )}
      </div>
    </form>
  );

  const paywallBlock = (
    <div style={{ ...panel, padding: '20px 18px', textAlign: 'center', width: '100%' }}>
      <Lock size={16} style={{ color: accent, marginBottom: 8 }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, marginBottom: 6 }}>
        {isRTL ? 'נגמרו ההודעות החינמיות לחודש הזה' : 'You have used your free messages this month'}
      </div>
      <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 14 }}>
        {isRTL ? 'שדרגו ל-Orca Pro לאימון ללא הגבלה על כל התיקים.' : 'Upgrade to Orca Pro for unlimited coaching across every portfolio.'}
      </div>
      <button
        onClick={openUpgrade}
        style={{ background: accent, color: T.bg.primary, border: 'none', borderRadius: T.radius.md, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >{isRTL ? 'שדרוג ל-Orca Pro' : 'Upgrade to Orca Pro'}</button>
    </div>
  );

  const errorBlock = error ? (
    <div style={{
      padding: '8px 12px', fontSize: 12, width: '100%',
      color: T.accent.red, background: `${T.accent.red}12`,
      border: `1px solid ${T.accent.red}33`, borderRadius: T.radius.sm,
    }}>{error}</div>
  ) : null;

  /* ══════════════════ STATE A · IDLE ══════════════════ */
  if (!started) {
    return (
      <div style={{ direction: isRTL ? 'rtl' : 'ltr', maxWidth: 860, marginInline: 'auto', width: '100%', paddingBottom: 40 }}>
        <div style={{ textAlign: 'center', paddingTop: 'clamp(24px, 6vh, 64px)', marginBottom: 26 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: '0 auto 18px', display: 'grid', placeItems: 'center',
            background: `${accent}1C`, border: `1px solid ${accent}40`, color: accent, fontSize: 19,
          }}>◈</div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px', color: T.text.primary }}>
            {isRTL ? 'במה נתחיל?' : 'Where should we start?'}
          </h1>
          <p style={{ maxWidth: 500, margin: '0 auto', fontSize: 13.5, lineHeight: 1.7, color: T.text.secondary }}>
            {isRTL
              ? 'Orca Coach קורא את העסקאות, הסטטיסטיקות ואבחון תודעת הסוחר שלכם. בחרו תיק — או פשוט שאלו, והוא ישאל אתכם על איזה תיק לדבר.'
              : 'Orca Coach reads your trades, statistics and Trader Mind diagnostic. Pick a portfolio — or just ask, and it will ask you which book to work on.'}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{portfolioPicker}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {errorBlock}
          {paywall ? paywallBlock : composer(true)}
        </div>

        {!paywall && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {STARTERS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="orca-coach-chip"
                style={{
                  background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                  borderRadius: 999, padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                }}
              >{s}</button>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: T.border.subtle, margin: '34px 0 22px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {CARDS.map(({ Icon, ...c }) => (
            <div key={c.en} style={{ ...panel, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
                background: `${accent}14`, border: `1px solid ${accent}2E`, color: accent,
              }}><Icon size={13} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text.primary, marginBottom: 3 }}>{isRTL ? c.he : c.en}</div>
                <div style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.55 }}>{isRTL ? c.dhe : c.den}</div>
              </div>
            </div>
          ))}
        </div>

        {!isPro && (
          <div style={{ ...mono, color: T.text.muted, textAlign: 'center', marginTop: 22 }}>
            {isRTL ? `נותרו ${remaining} מתוך ${FREE_LIMIT} הודעות החודש` : `${remaining} of ${FREE_LIMIT} free messages left this month`}
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════ STATE B · ACTIVE CHAT ══════════════════ */
  return (
    <div style={{
      direction: isRTL ? 'rtl' : 'ltr', width: '100%',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', minHeight: 520,
    }}>
      {/* slim top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '0 4px 10px', borderBottom: `1px solid ${T.border.subtle}`, marginBottom: 4,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: `${accent}1C`, border: `1px solid ${accent}40`, color: accent, fontSize: 11,
        }}>◈</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>Orca Coach</span>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...mono, color: isPro ? accent : T.text.muted }}>
            {isPro ? 'Pro · Fair use' : `${remaining}/${FREE_LIMIT}`}
          </span>
          <button
            onClick={() => { setMessages([]); setError(null); setInput(''); setNeedsPortfolio(false); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
              borderRadius: 999, padding: '5px 11px', fontSize: 11.5, cursor: 'pointer',
            }}
          ><RotateCcw size={11} />{isRTL ? 'שיחה חדשה' : 'New chat'}</button>
        </div>
      </div>

      {/* transcript */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '22px 4px' }}>
        <div style={{ maxWidth: 780, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                <div style={{
                  padding: '10px 15px', borderRadius: 18,
                  background: `${accent}1C`, border: `1px solid ${accent}3A`,
                  color: T.text.primary, fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                }}>{m.content}</div>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 2, display: 'grid', placeItems: 'center',
                  background: `${accent}16`, border: `1px solid ${accent}33`, color: accent, fontSize: 11,
                }}>◈</div>
                <div className="orca-coach-md" style={{ color: T.text.primary, fontSize: 13.5, lineHeight: 1.78, minWidth: 0, flex: 1 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            )
          ))}

          {/* Click-to-choose portfolio chips — shown when the coach asks which book. */}
          {needsPortfolio && !busy && portfolios.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginInlineStart: 36 }}>
              {portfolios.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePortfolioId(p.id);
                    send(isRTL ? `בוא ננתח את התיק "${p.name}"` : `Let's analyse the "${p.name}" portfolio`, p.id);
                  }}
                  className="orca-coach-chip"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    background: `${accent}12`, border: `1px solid ${accent}3A`, color: T.text.primary,
                    borderRadius: 999, padding: '8px 15px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  }}
                ><Briefcase size={12} style={{ color: accent }} />{p.name}</button>
              ))}
            </div>
          )}


          {busy && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center',
                background: `${accent}16`, border: `1px solid ${accent}33`, color: accent, fontSize: 11,
              }}>◈</div>
              <span className="orca-coach-shimmer" style={{ fontSize: 12.5, color: T.text.secondary }}>
                {isRTL ? 'הקואצ׳ מנתח את הנתונים…' : 'Coach is analyzing your data…'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* sticky composer */}
      <div style={{ paddingTop: 10 }}>
        <div style={{ maxWidth: 780, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errorBlock}
          {paywall ? paywallBlock : composer(false)}
          <div style={{ ...mono, color: T.text.muted, textAlign: 'center' }}>
            {isRTL ? 'Enter לשליחה · Shift+Enter לשורה חדשה' : 'Enter to send · Shift+Enter for a new line'}
          </div>
        </div>
      </div>
    </div>
  );
}
