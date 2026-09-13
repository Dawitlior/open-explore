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
  ArrowUp, Square, RotateCcw, Lock, Briefcase, Cog, MessageSquare, Trash2,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { scopedStorage } from '@/lib/scoped-storage';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useTraderMind } from '@/hooks/use-trader-mind';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor } from '@/lib/semantic-color';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  /** 'page' = full channel with a persistent conversation rail.
   *  'panel' = compact surface used by the floating Pro assistant. */
  variant?: 'page' | 'panel';
}

interface Msg { role: 'user' | 'assistant'; content: string }
interface Thread {
  id: string; title: string; messages: Msg[]; updatedAt: number;
  /** Compacted memory of turns older than the live window. */
  memory?: string;
}

const FREE_LIMIT = 5;
const MAX_THREADS = 5;
const THREADS_KEY = 'orca-coach-threads';
/** Compact once a conversation grows past this many turns. */
const COMPACT_AFTER = 12;
/** Turns kept verbatim after a compaction pass. */
const KEEP_VERBATIM = 6;

export default function OrcaCoachPage({ T, isRTL, variant = 'page' }: Props) {
  const isPanel = variant === 'panel';
  const isMobile = useIsMobile();
  const showRail = !isPanel && !isMobile;
  const { activePortfolioId, portfolios, setActivePortfolioId } = useActivePortfolio();
  const { tier } = useEntitlement();
  const { isCalibrated: tmDone, archetype: tmArchetype } = useTraderMind();
  const isPro = tier === 'pro';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [needsPortfolio, setNeedsPortfolio] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [threadNotice, setThreadNotice] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  /** Portfolio the trader picked inside this conversation (asked in chat). */
  const [chosenPortfolioId, setChosenPortfolioId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const msgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cancelled = useRef(false);
  /** Rolling memory of the active thread's older turns (server-compacted). */
  const memoryRef = useRef<string>('');
  const compacting = useRef(false);
  const accent = infoColor(T);

  const started = messages.length > 0;
  const atThreadLimit = threads.length >= MAX_THREADS;

  /* ── Saved conversations (max 5, per user, survive channel switches) ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await scopedStorage.getItem(THREADS_KEY);
        if (!raw || !alive) return;
        const parsed = JSON.parse(raw) as Thread[];
        if (!Array.isArray(parsed)) return;
        const clean = parsed
          .filter(t => t && typeof t.id === 'string' && Array.isArray(t.messages))
          .slice(0, MAX_THREADS);
        setThreads(clean);
        const last = clean[0];
        if (last && last.messages.length) {
          setThreads(clean);
          setActiveThreadId(last.id);
          setMessages(last.messages);
          memoryRef.current = last.memory ?? '';
        }
      } catch { /* corrupt cache — start fresh */ }
    })();
    return () => { alive = false; };
  }, []);

  const persistThreads = useCallback((next: Thread[]) => {
    setThreads(next);
    void scopedStorage.setItem(THREADS_KEY, JSON.stringify(next.slice(0, MAX_THREADS)));
  }, []);

  /* Keep the active thread in sync with the live transcript. */
  useEffect(() => {
    if (!messages.length) return;
    const id = activeThreadId ?? `t${Date.now()}`;
    if (!activeThreadId) setActiveThreadId(id);
    const title = (messages.find(m => m.role === 'user')?.content ?? '').slice(0, 60) || 'Chat';
    setThreads(prev => {
      const rest = prev.filter(t => t.id !== id);
      const next = [{ id, title, messages, updatedAt: Date.now(), memory: memoryRef.current || undefined }, ...rest].slice(0, MAX_THREADS);
      void scopedStorage.setItem(THREADS_KEY, JSON.stringify(next));
      return next;
    });
  }, [messages, activeThreadId]);

  const openThread = (t: Thread) => {
    setActiveThreadId(t.id);
    setMessages(t.messages);
    memoryRef.current = t.memory ?? '';
    setThreadsOpen(false);
    setThreadNotice(null);
    setError(null);
    setChosenPortfolioId(null);
    setNeedsPortfolio(false);
  };

  const deleteThread = (id: string) => {
    persistThreads(threads.filter(t => t.id !== id));
    setThreadNotice(null);
    if (id === activeThreadId) { setActiveThreadId(null); setMessages([]); memoryRef.current = ''; }
  };

  const startNewChat = () => {
    if (atThreadLimit && !threads.some(t => t.id === activeThreadId && t.messages.length === 0)) {
      setThreadsOpen(true);
      setThreadNotice(isRTL
        ? `אפשר לשמור עד ${MAX_THREADS} שיחות. מחקו שיחה כדי לפתוח חדשה.`
        : `You can keep up to ${MAX_THREADS} conversations. Delete one to start a new chat.`);
      return;
    }
    setActiveThreadId(null);
    setMessages([]);
    memoryRef.current = '';
    setError(null);
    setInput('');
    setNeedsPortfolio(false);
    setThreadNotice(null);
    setThreadsOpen(false);
    setChosenPortfolioId(null);
  };

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

  /* Scrolling: a new answer parks its first line at the top of the transcript
     (so the reply is read from its beginning), while sending a question or the
     thinking indicator follows the bottom. */
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant') {
      const el = msgRefs.current[messages.length - 1];
      if (el) {
        const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
        box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        return;
      }
    }
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => { if (!busy && !paywall) taRef.current?.focus(); }, [busy, paywall, started]);

  const thinkingPhrases = useMemo(() => (isRTL
    ? ['קורא את העסקאות שלך…', 'מזהה דפוסים בתיק…', 'משווה ביצועים וסיכון…', 'בונה תשובה מבוססת נתונים…']
    : ['Reading your trades…', 'Detecting portfolio patterns…', 'Comparing performance and risk…', 'Building an evidence-based answer…']), [isRTL]);

  useEffect(() => {
    if (!busy) { setThinkingIndex(0); return; }
    const interval = window.setInterval(() => {
      setThinkingIndex(index => (index + 1) % thinkingPhrases.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [busy, thinkingPhrases.length]);

  const autoGrow = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  const send = useCallback(async (text: string, overridePortfolioId?: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    // Saved-conversation cap: a brand-new chat needs a free slot.
    if (!activeThreadId && threads.length >= MAX_THREADS) {
      setThreadsOpen(true);
      const msg = isRTL
        ? `אפשר לשמור עד ${MAX_THREADS} שיחות. מחקו שיחה קיימת כדי לפתוח חדשה.`
        : `You can keep up to ${MAX_THREADS} conversations. Delete one to start a new chat.`;
      setThreadNotice(msg);
      setError(msg);
      return;
    }
    if (!isPro && used >= FREE_LIMIT) { setPaywall(true); return; }
    /* Ask which book to analyse INSIDE the conversation — once per chat, and
       only when the trader actually keeps more than one portfolio. */
    if (!overridePortfolioId && !chosenPortfolioId && portfolios.length > 1) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: clean },
        {
          role: 'assistant',
          content: isRTL
            ? 'לפני שנצלול — על איזה תיק נדבר?'
            : 'Before we dive in — which portfolio should we look at?',
        },
      ]);
      setInput('');
      requestAnimationFrame(autoGrow);
      setNeedsPortfolio(true);
      setError(null);
      return;
    }
    setError(null);
    setNeedsPortfolio(false);
    cancelled.current = false;
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    requestAnimationFrame(autoGrow);
    setBusy(true);
    try {
      const minimumThinkingTime = 5000 + Math.floor(Math.random() * 7001);
      const [{ data, error: fnErr }] = await Promise.all([
        supabase.functions.invoke('orca-coach', {
          body: {
            messages: next.slice(-KEEP_VERBATIM * 2),
            portfolio_id: overridePortfolioId ?? activePortfolioId,
            memory: memoryRef.current || undefined,
          },
        }),
        new Promise(resolve => window.setTimeout(resolve, minimumThinkingTime)),
      ]);
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
      const full: Msg[] = [...next, { role: 'assistant' as const, content: payload?.reply ?? '' }];
      setMessages(full);
      if (typeof payload?.usage?.used === 'number') setUsed(payload.usage.used);
      else setUsed(u => u + 1);

      /* Background compaction: once the thread outgrows the live window, fold
         the older turns into a rolling memory note. Not a metered message. */
      if (full.length > COMPACT_AFTER && !compacting.current) {
        compacting.current = true;
        const older = full.slice(0, full.length - KEEP_VERBATIM);
        void supabase.functions
          .invoke('orca-coach', { body: { action: 'compact', messages: older, memory: memoryRef.current || undefined } })
          .then(({ data: cd }) => {
            const mem = (cd as { memory?: string } | null)?.memory;
            if (mem) {
              memoryRef.current = mem;
              setThreads(prev => prev.map(t => (t.id === activeThreadId ? { ...t, memory: mem } : t)));
            }
          })
          .catch(err => console.warn('orca-coach compact', err))
          .finally(() => { compacting.current = false; });
      }
    } catch (e) {
      if (!cancelled.current) {
        setError(isRTL ? 'הקואצ׳ לא הצליח להשיב כרגע. נסה שוב.' : 'The coach could not answer right now. Please try again.');
      }
      console.error('orca-coach', e);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, activePortfolioId, setActivePortfolioId, isPro, used, isRTL, autoGrow, activeThreadId, threads.length, chosenPortfolioId, portfolios.length]);

  const STARTERS = useMemo(() => (isRTL
    ? ['מה הדליפה הגדולה ביותר בתיק שלי?', 'נתח את 10 העסקאות האחרונות שלי', 'באילו שעות אני מפסיד הכי הרבה?', 'מה הצעד הבא שכדאי לי לתקן?']
    : ['What is my single biggest leak?', 'Review my last 10 trades', 'Which sessions cost me the most?', 'What should I fix next?']), [isRTL]);

  /* Starred question — only for traders who finished the Trader Mind test. */
  const tmPrompt = isRTL
    ? 'מה המבחן של תודעת הסוחר אומר עליי? נתח את תוצאות האבחון שלי יחד עם העסקאות בפועל — איפה הפרופיל ההתנהגותי מופיע בנתונים, ומה כדאי לי לעשות עם זה.'
    : 'What does my Trader Mind test say about me? Analyse my diagnostic result together with my actual trades — where the behavioural profile shows up in the data, and what I should do about it.';

  const starredQuestion = tmDone ? (
    <button
      onClick={() => send(tmPrompt)}
      className="orca-coach-chip"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: `linear-gradient(110deg, ${T.accent.orange}1F, transparent 80%)`,
        border: `1px solid ${T.accent.orange}55`, color: T.text.primary,
        borderRadius: 999, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
        boxShadow: `0 0 22px -10px ${T.accent.orange}`,
      }}
    >
      <span aria-hidden style={{ color: T.accent.orange, textShadow: `0 0 8px ${T.accent.orange}` }}>★</span>
      {isRTL ? 'מה המבחן אומר עליי?' : 'What does my test say about me?'}
      {tmArchetype && (
        <span style={{ fontSize: 10, color: T.text.muted, fontWeight: 600 }}>· {tmArchetype.slice(0, 22)}</span>
      )}
    </button>
  ) : null;

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
          placeholder={busy ? thinkingPhrases[thinkingIndex] : (isRTL ? 'שאלו את Orca Coach…' : 'Message Orca Coach…')}
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

  /* ── Persistent conversation rail (desktop page mode) ─────────────── */
  const relTime = (ts: number) => {
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 1) return isRTL ? 'עכשיו' : 'now';
    if (mins < 60) return isRTL ? `לפני ${mins} ד׳` : `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return isRTL ? `לפני ${hrs} ש׳` : `${hrs}h ago`;
    return new Date(ts).toLocaleDateString(isRTL ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' });
  };

  const railList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {threads.length === 0 && (
        <div style={{ fontSize: 11.5, color: T.text.muted, lineHeight: 1.6, padding: '10px 8px' }}>
          {isRTL
            ? 'אין שיחות שמורות עדיין. כל שיחה שתתחילו תישמר כאן.'
            : 'No saved conversations yet. Anything you start is kept here.'}
        </div>
      )}
      {threads.map(th => {
        const active = th.id === activeThreadId;
        return (
          <div
            key={th.id}
            className="orca-coach-thread-row"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, borderRadius: T.radius.sm,
              background: active ? `${accent}16` : 'transparent',
              border: `1px solid ${active ? `${accent}33` : 'transparent'}`,
            }}
          >
            <button
              onClick={() => openThread(th)}
              style={{
                flex: 1, minWidth: 0, textAlign: isRTL ? 'right' : 'left', cursor: 'pointer',
                background: 'transparent', border: 'none', padding: '8px 9px', borderRadius: T.radius.sm,
              }}
            >
              <div style={{
                fontSize: 12.2, fontWeight: active ? 700 : 500, color: T.text.primary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{th.title}</div>
              <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>{relTime(th.updatedAt)}</div>
            </button>
            <button
              onClick={() => deleteThread(th.id)}
              aria-label={isRTL ? 'מחיקת שיחה' : 'Delete conversation'}
              style={{ background: 'transparent', border: 'none', color: T.text.muted, cursor: 'pointer', padding: 7, borderRadius: T.radius.sm }}
            ><Trash2 size={12} /></button>
          </div>
        );
      })}
    </div>
  );

  const railNotice = threadNotice ? (
    <div style={{
      marginTop: 8, padding: 8, fontSize: 11.5, borderRadius: T.radius.sm, lineHeight: 1.5,
      color: T.accent.orange, background: `${T.accent.orange}12`, border: `1px solid ${T.accent.orange}33`,
    }}>{threadNotice}</div>
  ) : null;

  /** Wraps a surface with the conversation rail on desktop page mode.
   *  The rail sits on the trailing edge (away from the app sidebar) and
   *  collapses to a slim strip with an animated width transition. */
  const withRail = (content: React.ReactNode) => {
    if (!showRail) return content;
    return (
      <div style={{
        direction: isRTL ? 'rtl' : 'ltr', display: 'flex',
        gap: 18, width: '100%', alignItems: 'stretch',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
        <aside
          className="orca-coach-rail"
          style={{
            ...panel,
            width: railOpen ? 244 : 56,
            flexShrink: 0, overflow: 'hidden',
            padding: railOpen ? 12 : '12px 8px',
            display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 150px)', minHeight: 520, position: 'sticky', top: 0,
            background: `linear-gradient(180deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
            boxShadow: `inset 0 1px 0 ${T.border.subtle}`,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            justifyContent: railOpen ? 'space-between' : 'center', marginBottom: 10,
          }}>
            {railOpen && (
              <span style={{ ...mono, color: T.text.muted }}>
                {isRTL ? `שיחות · ${threads.length}/${MAX_THREADS}` : `Chats · ${threads.length}/${MAX_THREADS}`}
              </span>
            )}
            <button
              onClick={() => setRailOpen(o => !o)}
              aria-label={railOpen ? (isRTL ? 'קיפול רשימת השיחות' : 'Collapse conversations') : (isRTL ? 'פתיחת רשימת השיחות' : 'Expand conversations')}
              aria-expanded={railOpen}
              style={{
                background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                borderRadius: 9, padding: 6, cursor: 'pointer', display: 'grid', placeItems: 'center',
              }}
            >{railOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}</button>
          </div>

          {railOpen ? (
            <>
              <button
                onClick={startNewChat}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
                  background: `${accent}14`, border: `1px solid ${accent}3A`, color: T.text.primary,
                  borderRadius: 999, padding: '9px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  marginBottom: 10,
                }}
              ><RotateCcw size={12} style={{ color: accent }} />{isRTL ? 'שיחה חדשה' : 'New chat'}</button>
              {railList}
              {railNotice}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <button
                onClick={startNewChat}
                aria-label={isRTL ? 'שיחה חדשה' : 'New chat'}
                style={{
                  width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer',
                  background: `${accent}14`, border: `1px solid ${accent}3A`, color: accent, borderRadius: 999,
                }}
              ><RotateCcw size={13} /></button>
              <button
                onClick={() => setRailOpen(true)}
                aria-label={isRTL ? 'שיחות שמורות' : 'Saved chats'}
                style={{
                  width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary, borderRadius: 999,
                }}
              ><MessageSquare size={13} /></button>
              <span style={{ ...mono, color: T.text.muted }}>{threads.length}</span>
            </div>
          )}
        </aside>
      </div>
    );
  };

  /* ══════════════════ STATE A · IDLE ══════════════════ */
  if (!started) {
    return withRail(
      <div style={{ direction: isRTL ? 'rtl' : 'ltr', maxWidth: 860, marginInline: 'auto', width: '100%', paddingBottom: isPanel ? 8 : 40 }}>
        {/* Compact chat drawer for mobile and the floating panel. */}
        {!showRail && threads.length > 0 && (
          <div style={{ paddingTop: 6 }}>
            <button
              onClick={() => setThreadsOpen(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                borderRadius: 999, padding: '5px 11px', fontSize: 11.5, cursor: 'pointer',
              }}
            ><MessageSquare size={11} />{isRTL ? 'שיחות' : 'Chats'} {threads.length}/{MAX_THREADS}</button>
            {threadsOpen && (
              <div style={{ ...panel, padding: 8, marginTop: 8, maxHeight: 230, overflowY: 'auto' }}>
                {railList}
                {railNotice}
              </div>
            )}
          </div>
        )}
        <div style={{ textAlign: 'center', paddingTop: isPanel ? 10 : 'clamp(24px, 6vh, 64px)', marginBottom: isPanel ? 16 : 26 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999, margin: '0 auto 18px', display: 'grid', placeItems: 'center',
            background: `radial-gradient(circle at 50% 45%, ${accent}26, transparent 72%)`,
            border: `1px solid ${accent}40`,
            boxShadow: `0 0 24px -4px ${accent}88`,
          }}><img src="/orcaIcon.ico" alt="" aria-hidden width={34} height={34} style={{ width: 34, height: 34, objectFit: 'contain', filter: `drop-shadow(0 0 6px ${accent}AA)` }} /></div>
          <h1 style={{ fontSize: isPanel ? 21 : 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px', color: T.text.primary }}>
            {isRTL ? 'במה נתחיל?' : 'Where should we start?'}
          </h1>
          <p style={{ maxWidth: 500, margin: '0 auto', fontSize: 13.5, lineHeight: 1.7, color: T.text.secondary }}>
            {isRTL
              ? 'Orca Coach קורא את העסקאות, הסטטיסטיקות ואבחון תודעת הסוחר שלכם. בחרו תיק — או פשוט שאלו, והוא ישאל אתכם על איזה תיק לדבר.'
              : 'Orca Coach reads your trades, statistics and Trader Mind diagnostic. Pick a portfolio — or just ask, and it will ask you which book to work on.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {errorBlock}
          {paywall ? paywallBlock : composer(true)}
        </div>

        {!paywall && starredQuestion && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>{starredQuestion}</div>
        )}

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

        {!isPro && (
          <div style={{ ...mono, color: T.text.muted, textAlign: 'center', marginTop: 22 }}>
            {isRTL ? `נותרו ${remaining} מתוך ${FREE_LIMIT} הודעות החודש` : `${remaining} of ${FREE_LIMIT} free messages left this month`}
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════ STATE B · ACTIVE CHAT ══════════════════ */
  return withRail(
    <div style={{
      direction: isRTL ? 'rtl' : 'ltr', width: '100%',
      display: 'flex', flexDirection: 'column',
      height: isPanel ? '100%' : 'calc(100vh - 150px)', minHeight: isPanel ? 0 : 520,
    }}>
      {/* slim top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '0 4px 10px', borderBottom: `1px solid ${T.border.subtle}`, marginBottom: 4,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: `radial-gradient(circle at 50% 45%, ${accent}26, transparent 72%)`,
          border: `1px solid ${accent}40`, boxShadow: `0 0 14px -4px ${accent}99`,
        }}><img src="/orcaIcon.ico" alt="" aria-hidden width={17} height={17} style={{ width: 17, height: 17, objectFit: 'contain' }} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>Orca Coach</span>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <span style={{ ...mono, color: isPro ? accent : T.text.muted }}>
            {isPro ? 'Pro · Fair use' : `${remaining}/${FREE_LIMIT}`}
          </span>
          {/* Compact drawer trigger — the desktop page uses the side rail instead. */}
          {!showRail && (
            <button
              onClick={() => { setThreadsOpen(o => !o); setThreadNotice(null); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                borderRadius: 999, padding: '5px 11px', fontSize: 11.5, cursor: 'pointer',
              }}
            ><MessageSquare size={11} />{isRTL ? 'שיחות' : 'Chats'} {threads.length}/{MAX_THREADS}</button>
          )}
          <button
            onClick={startNewChat}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
              borderRadius: 999, padding: '5px 11px', fontSize: 11.5, cursor: 'pointer',
            }}
          ><RotateCcw size={11} />{isRTL ? 'שיחה חדשה' : 'New chat'}</button>

          {threadsOpen && !showRail && (
            <div style={{
              position: 'absolute', top: '100%', insetInlineEnd: 0, marginTop: 8, zIndex: 40,
              width: 300, background: T.bg.card, border: `1px solid ${T.border.subtle}`,
              borderRadius: T.radius.md, padding: 8, boxShadow: '0 24px 60px -30px rgba(0,0,0,0.8)',
            }}>
              <div style={{ ...mono, color: T.text.muted, padding: '4px 6px 8px' }}>
                {isRTL ? `שיחות שמורות · ${threads.length}/${MAX_THREADS}` : `Saved chats · ${threads.length}/${MAX_THREADS}`}
              </div>
              {threads.length === 0 && (
                <div style={{ fontSize: 12, color: T.text.muted, padding: '6px' }}>
                  {isRTL ? 'אין שיחות שמורות עדיין.' : 'No saved conversations yet.'}
                </div>
              )}
              {threads.map(th => (
                <div key={th.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => openThread(th)}
                    style={{
                      flex: 1, minWidth: 0, textAlign: isRTL ? 'right' : 'left', cursor: 'pointer',
                      background: th.id === activeThreadId ? `${accent}14` : 'transparent',
                      border: 'none', color: T.text.primary, borderRadius: T.radius.sm,
                      padding: '8px 8px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >{th.title}</button>
                  <button
                    onClick={() => deleteThread(th.id)}
                    aria-label={isRTL ? 'מחיקה' : 'Delete'}
                    style={{
                      background: 'transparent', border: 'none', color: T.text.muted,
                      cursor: 'pointer', padding: 6, borderRadius: T.radius.sm,
                    }}
                  ><Trash2 size={12} /></button>
                </div>
              ))}
              {threadNotice && (
                <div style={{
                  marginTop: 6, padding: '8px', fontSize: 11.5, borderRadius: T.radius.sm,
                  color: T.accent.orange, background: `${T.accent.orange}12`, border: `1px solid ${T.accent.orange}33`,
                }}>{threadNotice}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* transcript */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '22px 4px' }}>
        <div style={{ maxWidth: 780, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} ref={el => { msgRefs.current[i] = el; }} style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                <div style={{
                  padding: '10px 15px', borderRadius: 18,
                  background: `${accent}1C`, border: `1px solid ${accent}3A`,
                  color: T.text.primary, fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                }}>{m.content}</div>
              </div>
            ) : (
              <div key={i} ref={el => { msgRefs.current[i] = el; }} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 999, flexShrink: 0, marginTop: 2, display: 'grid', placeItems: 'center',
                  background: `radial-gradient(circle at 50% 45%, ${accent}22, transparent 72%)`,
                  border: `1px solid ${accent}33`, boxShadow: `0 0 12px -4px ${accent}88`,
                }}><img src="/orcaIcon.ico" alt="" aria-hidden width={17} height={17} style={{ width: 17, height: 17, objectFit: 'contain' }} /></div>
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
                    setChosenPortfolioId(p.id);
                    setActivePortfolioId(p.id);
                    setNeedsPortfolio(false);
                    send(p.name ?? (isRTL ? 'התיק הזה' : 'this portfolio'), p.id);
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
            <div role="status" aria-live="polite" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', position: 'relative',
                background: `${accent}16`, border: `1px solid ${accent}33`, color: accent, fontSize: 11,
              }}>
                <Cog size={15} className="orca-coach-gear-main" />
                <Cog size={9} className="orca-coach-gear-small" style={{ position: 'absolute', insetInlineEnd: 1, bottom: 1 }} />
              </div>
              <span className="orca-coach-shimmer" style={{ fontSize: 12.5, color: T.text.secondary }}>
                {thinkingPhrases[thinkingIndex]}
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
