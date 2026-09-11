/**
 * Orca Coach — AI trading performance coach.
 *
 * Layout mirrors an institutional AI-desk page:
 *   1. Hero      — badge, headline, sub-copy, primary CTA
 *   2. Console   — the live chat terminal (portfolio-scoped)
 *   3. Grid      — six capability cards
 *   4. Pro block — upgrade card for the metered free tier
 *
 * All model access happens server-side in the `orca-coach` edge function,
 * which injects the ACTIVE PORTFOLIO's trades/analytics and enforces the
 * free-tier meter (5 messages / calendar month).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    if (!isPro && used >= FREE_LIMIT) { setPaywall(true); return; }
    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('orca-coach', {
        body: { messages: next, portfolio_id: activePortfolioId },
      });
      if (fnErr) {
        // Edge function non-2xx: surface the paywall for the metered case.
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
      setError(isRTL ? 'הקואצ׳ לא הצליח להשיב כרגע. נסה שוב.' : 'The coach could not answer right now. Please try again.');
      console.error('orca-coach', e);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, activePortfolioId, isPro, used, isRTL]);

  const STARTERS = isRTL
    ? ['מה הדליפה הגדולה ביותר בתיק שלי?', 'נתח את 10 העסקאות האחרונות שלי', 'באילו שעות אני מפסיד הכי הרבה?', 'מה הצעד הבא שכדאי לי לתקן?']
    : ['What is my single biggest leak?', 'Review my last 10 trades', 'Which sessions cost me the most?', 'What should I fix next?'];

  const CARDS = [
    { icon: '📉', he: 'מצא את הדליפה הגדולה', en: 'Find your biggest leaks', dhe: 'שאל מה פוגע בתוצאות וראה את העסקאות, הסשנים והנכסים שמאחורי זה.', den: 'Ask what is hurting results and see the trades, sessions and symbols behind it.' },
    { icon: '🔎', he: 'ביקורת עסקאות עם ראיות', en: 'Review trades with evidence', dhe: 'שולף את ההפסדים הגדולים, העסקאות האחרונות והערות היומן — בלי לחפש בין לשוניות.', den: 'Pulls worst trades, recent tables and journal notes without hunting through tabs.' },
    { icon: '🎯', he: 'צעדים ברי ביצוע', en: 'Get coachable next steps', dhe: 'הופך שאלות רחבות לביקורת ממוקדת: מה לתקן, מה לבדוק, ומה לנטר.', den: 'Turns broad questions into focused reviews: what to fix, test, or watch next.' },
    { icon: '🧾', he: 'סיכומים וטבלאות', en: 'Generate rich artifacts', dhe: 'יוצר סיכומים, השוואות ופילוחים שקל לפעול לפיהם.', den: 'Creates summaries, comparisons and breakdowns that are easy to act on.' },
    { icon: '⏱', he: 'תזמון וסשנים', en: 'Understand timing & sessions', dhe: 'מראה איך שעת היום והסשן מעצבים את התוצאות שלך.', den: 'See how time of day and session choice shape your outcomes.' },
    { icon: '∞', he: 'המשך את החקירה', en: 'Continue the investigation', dhe: 'שאל שאלות המשך על אותו תיק ותקופה — ההקשר נשמר.', den: 'Ask follow-ups on the same portfolio and period — the context is kept.' },
  ];

  const remaining = Math.max(0, FREE_LIMIT - used);

  const card: React.CSSProperties = {
    background: T.bg.card,
    border: `1px solid ${T.border.subtle}`,
    borderRadius: T.radius.lg,
  };

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr', maxWidth: 1180, marginInline: 'auto', width: '100%', paddingBottom: 40 }}>
      {/* ─── HERO ─── */}
      <div style={{
        position: 'relative', overflow: 'hidden', ...card,
        padding: '46px 24px 40px', textAlign: 'center', marginBottom: 18,
        background: `radial-gradient(120% 140% at 50% 0%, ${accent}1A 0%, ${T.bg.card} 62%)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px',
          borderRadius: 999, border: `1px solid ${accent}55`, color: accent,
          fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 18,
        }}>◈ Orca Coach</div>
        <h1 style={{ fontSize: 'clamp(26px, 4.2vw, 46px)', lineHeight: 1.12, fontWeight: 800, color: T.text.primary, margin: '0 0 14px' }}>
          {isRTL ? 'הכירו את Orca Coach, ' : 'Meet Orca Coach, your '}
          <span style={{ color: accent }}>{isRTL ? 'מאמן הביצועים שלכם' : 'trading performance coach'}</span>
        </h1>
        <p style={{ maxWidth: 620, margin: '0 auto 22px', color: T.text.secondary, fontSize: 14, lineHeight: 1.65 }}>
          {isRTL
            ? 'בקשו ממנו לנתח עסקאות, לאתר דליפות, להשוות תקופות ולהסביר שינויים בביצועים — ולהפוך את היומן לצעדים ברורים. בנוי על הנתונים שלכם, לא על פטפוט שוק כללי.'
            : 'Ask it to review trades, find leaks, compare periods and explain performance changes — and turn your journal into clear next steps. Built on your data, not generic market chat.'}
        </p>
        <div style={{ fontSize: 11, color: T.text.muted }}>
          {isRTL ? 'תיק פעיל: ' : 'Active portfolio: '}
          <span style={{ color: T.text.primary, fontWeight: 600 }}>{activePortfolio?.name ?? (isRTL ? 'לא נבחר' : 'none')}</span>
        </div>
      </div>

      {/* ─── CONSOLE ─── */}
      <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
        {/* console header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${T.border.subtle}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text.secondary }}>
            {isRTL ? 'קונסולת אימון' : 'Coaching console'}
          </span>
          {portfolios.length > 1 && (
            <select
              value={activePortfolioId ?? ''}
              onChange={e => setActivePortfolioId(e.target.value)}
              style={{ background: T.bg.secondary, color: T.text.primary, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, fontSize: 11, padding: '4px 8px' }}
            >
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <span style={{ marginInlineStart: 'auto', fontSize: 11, color: isPro ? accent : T.text.muted }}>
            {isPro
              ? (isRTL ? 'Pro · ללא הגבלה' : 'Pro · unlimited')
              : (isRTL ? `${remaining} מתוך ${FREE_LIMIT} הודעות החודש` : `${remaining} of ${FREE_LIMIT} messages left this month`)}
          </span>
        </div>

        {/* transcript */}
        <div ref={scrollRef} style={{ height: 380, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: T.text.muted, fontSize: 12, maxWidth: 420, lineHeight: 1.7 }}>
              {isRTL ? 'שאלו כל דבר על התיק הפעיל. הקואצ׳ רואה את העסקאות, הסטטיסטיקות ואבחון תודעת הסוחר שלכם.' : 'Ask anything about the active portfolio. The coach sees your trades, stats and Trader Mind diagnostic.'}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
              <div style={{
                padding: m.role === 'user' ? '9px 13px' : 0,
                borderRadius: T.radius.lg,
                background: m.role === 'user' ? `${accent}22` : 'transparent',
                border: m.role === 'user' ? `1px solid ${accent}44` : 'none',
                color: T.text.primary, fontSize: 13, lineHeight: 1.7,
              }}>
                {m.role === 'assistant'
                  ? <div className="orca-coach-md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  : m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ alignSelf: 'flex-start', color: T.text.muted, fontSize: 12 }}>
              {isRTL ? 'הקואצ׳ חושב…' : 'Coach is thinking…'}
            </div>
          )}
        </div>

        {/* starters */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 14px 12px' }}>
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                background: 'transparent', border: `1px solid ${T.border.subtle}`, color: T.text.secondary,
                borderRadius: 999, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        )}

        {error && <div style={{ padding: '0 14px 10px', color: T.accent.red, fontSize: 12 }}>{error}</div>}

        {/* composer / paywall */}
        {paywall ? (
          <div style={{ borderTop: `1px solid ${T.border.subtle}`, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, marginBottom: 6 }}>
              {isRTL ? 'נגמרו ההודעות החינמיות לחודש הזה' : 'You have used your free messages this month'}
            </div>
            <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 14 }}>
              {isRTL ? 'שדרגו ל-Orca Pro לאימון ללא הגבלה על כל התיקים.' : 'Upgrade to Orca Pro for unlimited coaching across every portfolio.'}
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('orca:open-upgrade', { detail: { required: 'pro' } }))}
              style={{ background: accent, color: T.bg.primary, border: 'none', borderRadius: T.radius.md, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >{isRTL ? 'שדרוג ל-Orca Pro' : 'Upgrade to Orca Pro'}</button>
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); send(input); }}
            style={{ borderTop: `1px solid ${T.border.subtle}`, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={2}
              placeholder={isRTL ? 'שאלו את Orca Coach…' : 'Message Orca Coach…'}
              style={{
                flex: 1, resize: 'none', background: T.bg.secondary, color: T.text.primary,
                border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md,
                padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button type="submit" disabled={busy || !input.trim()} style={{
              background: busy || !input.trim() ? T.bg.secondary : accent,
              color: busy || !input.trim() ? T.text.muted : T.bg.primary,
              border: 'none', borderRadius: T.radius.md, padding: '10px 18px',
              fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
            }}>{isRTL ? 'שליחה' : 'Send'}</button>
          </form>
        )}
      </div>

      {/* ─── CAPABILITY GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 18 }}>
        {CARDS.map(c => (
          <div key={c.en} style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center',
                background: `${accent}18`, border: `1px solid ${accent}3A`, fontSize: 16,
              }}>{c.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary, marginBottom: 4 }}>{isRTL ? c.he : c.en}</div>
                <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.6 }}>{isRTL ? c.dhe : c.den}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── PRO BLOCK ─── */}
      {!isPro && (
        <div style={{ ...card, padding: '32px 20px', textAlign: 'center', background: `radial-gradient(120% 160% at 50% 0%, ${accent}14 0%, ${T.bg.card} 60%)` }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.text.muted, marginBottom: 10 }}>
            {isRTL ? 'כלול ב-ORCA PRO' : 'Included with ORCA PRO'}
          </div>
          <div style={{ fontSize: 'clamp(18px, 2.6vw, 26px)', fontWeight: 800, color: T.text.primary, marginBottom: 10 }}>
            {isRTL ? 'הפכו את Orca Coach לחלק מכל סקירה רצינית.' : 'Make Orca Coach part of every serious review.'}
          </div>
          <div style={{ maxWidth: 560, margin: '0 auto 18px', fontSize: 12.5, color: T.text.secondary, lineHeight: 1.7 }}>
            {isRTL ? 'שדרוג ל-Pro פותח אימון ללא הגבלה יחד עם האנליטיקה המתקדמת שמאחוריו: פילוחים, מעבדת קוונט והקשר מלא בין התיקים.' : 'Upgrading to Pro unlocks unlimited coaching plus the premium analytics behind it: breakdowns, the quant lab and full portfolio context.'}
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('orca:open-upgrade', { detail: { required: 'pro' } }))}
            style={{ background: accent, color: T.bg.primary, border: 'none', borderRadius: T.radius.md, padding: '11px 26px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >{isRTL ? 'שדרגו ופתחו את Orca Coach' : 'Upgrade to Pro and unlock Orca Coach'}</button>
        </div>
      )}
    </div>
  );
}
