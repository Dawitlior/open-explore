/**
 * Orca Coach — AI trading performance coach.
 *
 * Institutional desk layout:
 *   ┌───────────────────────────────┬──────────────┐
 *   │ header strip (identity/state) │              │
 *   ├───────────────────────────────┤  context     │
 *   │ transcript (the product)      │  rail        │
 *   │ composer                      │              │
 *   └───────────────────────────────┴──────────────┘
 *
 * All model access happens server-side in the `orca-coach` edge function,
 * which injects the ACTIVE PORTFOLIO's trades/analytics and enforces the
 * free-tier meter (5 messages / calendar month).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowUp, Activity, Search, Target, Clock3, Layers, Infinity as InfinityIcon,
  Square, RotateCcw, Lock, ChevronDown,
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
  const { activePortfolioId, activePortfolio, portfolios, setActivePortfolioId } = useActivePortfolio();
  const { tier } = useEntitlement();
  const isPro = tier === 'pro';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const cancelled = useRef(false);
  const accent = infoColor(T);

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

  /* Composer stays focused during normal use. */
  useEffect(() => { if (!busy && !paywall) taRef.current?.focus(); }, [busy, paywall]);

  const autoGrow = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    if (!isPro && used >= FREE_LIMIT) { setPaywall(true); return; }
    setError(null);
    cancelled.current = false;
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    requestAnimationFrame(autoGrow);
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('orca-coach', {
        body: { messages: next, portfolio_id: activePortfolioId },
      });
      if (cancelled.current) return;
      if (fnErr) {
        const status = (fnErr as unknown as { context?: { status?: number } }).context?.status;
        if (status === 402) { setPaywall(true); return; }
        if (status === 429) { setError(isRTL ? 'יותר מדי בקשות — נסה שוב בעוד רגע.' : 'Too many requests — try again in a moment.'); return; }
        throw fnErr;
      }
      const payload = data as { reply?: string; usage?: { used?: number }; error?: string; paywall?: boolean };
      if (payload?.paywall) { setPaywall(true); return; }
      if (payload?.error) throw new Error(payload.error);
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
  }, [busy, messages, activePortfolioId, isPro, used, isRTL, autoGrow]);

  const STARTERS = useMemo(() => (isRTL
    ? ['מה הדליפה הגדולה ביותר בתיק שלי?', 'נתח את 10 העסקאות האחרונות שלי', 'באילו שעות אני מפסיד הכי הרבה?', 'מה הצעד הבא שכדאי לי לתקן?']
    : ['What is my single biggest leak?', 'Review my last 10 trades', 'Which sessions cost me the most?', 'What should I fix next?']), [isRTL]);

  const CARDS = [
    { Icon: Activity, he: 'איתור דליפות', en: 'Leak detection', dhe: 'מה פוגע בתוצאות — עם העסקאות, הסשנים והנכסים שמאחורי זה.', den: 'What is hurting results — with the trades, sessions and symbols behind it.' },
    { Icon: Search, he: 'ביקורת מבוססת ראיות', en: 'Evidence-based review', dhe: 'שולף הפסדים גדולים, עסקאות אחרונות והערות יומן ללא מעבר בין לשוניות.', den: 'Pulls worst trades, recent tables and journal notes without hunting tabs.' },
    { Icon: Target, he: 'צעדים ברי ביצוע', en: 'Coachable next steps', dhe: 'הופך שאלות רחבות לביקורת ממוקדת: מה לתקן, לבדוק ולנטר.', den: 'Turns broad questions into focused reviews: fix, test, watch.' },
    { Icon: Layers, he: 'סיכומים וטבלאות', en: 'Structured artifacts', dhe: 'סיכומים, השוואות ופילוחים שקל לפעול לפיהם.', den: 'Summaries, comparisons and breakdowns that are easy to act on.' },
    { Icon: Clock3, he: 'תזמון וסשנים', en: 'Timing & sessions', dhe: 'איך שעת היום והסשן מעצבים את התוצאות שלך.', den: 'How time of day and session choice shape your outcomes.' },
    { Icon: InfinityIcon, he: 'המשכיות הקשר', en: 'Context continuity', dhe: 'שאלות המשך על אותו תיק ותקופה — ההקשר נשמר.', den: 'Follow-ups on the same portfolio and period — context is kept.' },
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

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr', maxWidth: 1240, marginInline: 'auto', width: '100%', paddingBottom: 32 }}>
      {/* ─── HEADER STRIP ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '14px 18px', marginBottom: 14, ...panel,
        background: `linear-gradient(90deg, ${accent}12 0%, ${T.bg.card} 42%)`,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: `${accent}1F`, border: `1px solid ${accent}45`, color: accent, fontSize: 15, fontWeight: 700,
        }}>◈</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary, lineHeight: 1.2 }}>Orca Coach</div>
          <div style={{ fontSize: 11.5, color: T.text.secondary, marginTop: 2 }}>
            {isRTL ? 'ניתוח ביצועים על הנתונים שלך בלבד — לא פטפוט שוק כללי.' : 'Performance analysis on your own data — not generic market chat.'}
          </div>
        </div>

        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
            border: `1px solid ${T.border.subtle}`, color: busy ? accent : T.text.secondary, ...mono,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 999, background: busy ? accent : T.accent.green ?? accent,
              boxShadow: `0 0 0 3px ${accent}1A`,
            }} />
            {busy ? (isRTL ? 'מנתח' : 'Analyzing') : (isRTL ? 'מוכן' : 'Online')}
          </span>
          <span style={{ ...mono, color: isPro ? accent : T.text.muted }}>
            {isPro ? 'Pro · Unlimited' : `${remaining}/${FREE_LIMIT} ${isRTL ? 'הודעות' : 'left'}`}
          </span>
        </div>
      </div>

      {/* ─── WORKSPACE ─── */}
      <div className="orca-coach-grid" style={{ display: 'grid', gap: 14, marginBottom: 14 }}>
        {/* CONSOLE */}
        <div style={{ ...panel, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 560 }}>
          {/* console bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '9px 14px', borderBottom: `1px solid ${T.border.subtle}`, background: T.bg.secondary,
          }}>
            <span style={{ ...mono, color: T.text.muted }}>{isRTL ? 'קונסולת אימון' : 'Coaching console'}</span>
            <span style={{ width: 1, height: 14, background: T.border.subtle }} />
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={activePortfolioId ?? ''}
                onChange={e => setActivePortfolioId(e.target.value)}
                disabled={portfolios.length <= 1}
                style={{
                  appearance: 'none', background: 'transparent', color: T.text.primary,
                  border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm,
                  fontSize: 11, fontWeight: 600, padding: '4px 24px 4px 9px', cursor: portfolios.length > 1 ? 'pointer' : 'default',
                }}
              >
                {portfolios.length === 0 && <option value="">{isRTL ? 'אין תיק' : 'No portfolio'}</option>}
                {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', insetInlineEnd: 7, pointerEvents: 'none', color: T.text.muted }} />
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(null); }}
                style={{
                  marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                  borderRadius: T.radius.sm, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                }}
              ><RotateCcw size={11} />{isRTL ? 'שיחה חדשה' : 'New session'}</button>
            )}
          </div>

          {/* transcript */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {messages.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 460 }}>
                <div style={{ ...mono, color: accent, marginBottom: 10 }}>{isRTL ? 'התחילו תחקיר' : 'Start an investigation'}</div>
                <div style={{ color: T.text.secondary, fontSize: 12.5, lineHeight: 1.8 }}>
                  {isRTL
                    ? 'הקואצ׳ קורא את העסקאות, הסטטיסטיקות ואבחון תודעת הסוחר של התיק הפעיל. שאלו שאלה — או בחרו נקודת פתיחה.'
                    : 'The coach reads the active portfolio’s trades, statistics and Trader Mind diagnostic. Ask a question — or pick a starting point.'}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end', maxWidth: '78%' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 14,
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
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              )
            ))}

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

          {/* starters */}
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 16px 12px' }}>
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="orca-coach-chip"
                  style={{
                    background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                    borderRadius: 999, padding: '6px 13px', fontSize: 11.5, cursor: 'pointer',
                  }}
                >{s}</button>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              margin: '0 14px 10px', padding: '8px 12px', fontSize: 12,
              color: T.accent.red, background: `${T.accent.red}12`,
              border: `1px solid ${T.accent.red}33`, borderRadius: T.radius.sm,
            }}>{error}</div>
          )}

          {/* composer / paywall */}
          {paywall ? (
            <div style={{ borderTop: `1px solid ${T.border.subtle}`, padding: '20px 18px', textAlign: 'center' }}>
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
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); send(input); }}
              style={{ borderTop: `1px solid ${T.border.subtle}`, padding: 12, background: T.bg.secondary }}
            >
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                background: T.bg.card, border: `1px solid ${T.border.subtle}`,
                borderRadius: T.radius.md, padding: 8,
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
                    border: 'none', outline: 'none', padding: '6px 6px', fontSize: 13.5,
                    lineHeight: 1.6, fontFamily: 'inherit', maxHeight: 168, minHeight: 34,
                  }}
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={() => { cancelled.current = true; setBusy(false); }}
                    aria-label={isRTL ? 'עצור' : 'Stop'}
                    style={{
                      width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center',
                      background: 'transparent', border: `1px solid ${T.border.subtle}`,
                      color: T.text.secondary, borderRadius: 9, cursor: 'pointer',
                    }}
                  ><Square size={12} /></button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label={isRTL ? 'שליחה' : 'Send'}
                    style={{
                      width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center',
                      background: input.trim() ? accent : 'transparent',
                      border: input.trim() ? 'none' : `1px solid ${T.border.subtle}`,
                      color: input.trim() ? T.bg.primary : T.text.muted,
                      borderRadius: 9, cursor: input.trim() ? 'pointer' : 'default',
                      transition: 'background 140ms ease, color 140ms ease',
                    }}
                  ><ArrowUp size={15} /></button>
                )}
              </div>
              <div style={{ ...mono, color: T.text.muted, marginTop: 8, paddingInline: 2 }}>
                {isRTL ? 'Enter לשליחה · Shift+Enter לשורה חדשה' : 'Enter to send · Shift+Enter for a new line'}
              </div>
            </form>
          )}
        </div>

        {/* CONTEXT RAIL */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...panel, padding: 16 }}>
            <div style={{ ...mono, color: T.text.muted, marginBottom: 12 }}>{isRTL ? 'הקשר פעיל' : 'Active context'}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, marginBottom: 3 }}>
              {activePortfolio?.name ?? (isRTL ? 'לא נבחר תיק' : 'No portfolio selected')}
            </div>
            <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.65 }}>
              {isRTL ? 'עסקאות, סטטיסטיקות ואבחון תודעת הסוחר של תיק זה נשלחים לניתוח.' : 'This portfolio’s trades, statistics and Trader Mind diagnostic are sent for analysis.'}
            </div>

            <div style={{ height: 1, background: T.border.subtle, margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{ ...mono, color: T.text.muted }}>{isRTL ? 'מכסה חודשית' : 'Monthly quota'}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isPro ? accent : T.text.primary }}>
                {isPro ? (isRTL ? 'ללא הגבלה' : 'Unlimited') : `${remaining}/${FREE_LIMIT}`}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: T.border.subtle, overflow: 'hidden' }}>
              <div style={{ width: `${meterPct}%`, height: '100%', background: accent, transition: 'width 240ms ease' }} />
            </div>
          </div>

          <div style={{ ...panel, padding: 16 }}>
            <div style={{ ...mono, color: T.text.muted, marginBottom: 12 }}>{isRTL ? 'יכולות' : 'Capabilities'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {CARDS.map(({ Icon, ...c }) => (
                <div key={c.en} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
                    background: `${accent}14`, border: `1px solid ${accent}2E`, color: accent,
                  }}><Icon size={13} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text.primary, marginBottom: 2 }}>{isRTL ? c.he : c.en}</div>
                    <div style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.55 }}>{isRTL ? c.dhe : c.den}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isPro && (
            <div style={{
              ...panel, padding: 16,
              background: `linear-gradient(160deg, ${accent}14 0%, ${T.bg.card} 58%)`,
            }}>
              <div style={{ ...mono, color: T.text.muted, marginBottom: 8 }}>{isRTL ? 'ORCA PRO' : 'ORCA PRO'}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary, marginBottom: 6, lineHeight: 1.4 }}>
                {isRTL ? 'אימון ללא הגבלה על כל התיקים' : 'Unlimited coaching, every portfolio'}
              </div>
              <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.65, marginBottom: 14 }}>
                {isRTL ? 'כולל את האנליטיקה המתקדמת שמאחוריו: פילוחים, מעבדת קוונט והקשר מלא בין התיקים.' : 'Includes the premium analytics behind it: breakdowns, the quant lab and full portfolio context.'}
              </div>
              <button
                onClick={openUpgrade}
                style={{
                  width: '100%', background: accent, color: T.bg.primary, border: 'none',
                  borderRadius: T.radius.md, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                }}
              >{isRTL ? 'שדרוג ל-Pro' : 'Upgrade to Pro'}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
