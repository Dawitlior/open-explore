import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { TradingBadge } from './TradingUI';
import { generateDayInsights, generateDaySummary } from '@/lib/ai-engine';
import { getR, sumR, formatR } from '@/lib/r-multiple';
import { useMonthEconomicEvents } from '@/hooks/use-month-economic-events';
import { MACRO_TIER_COLOR, CURRENCY_FLAG } from '@/components/economic/MacroEventStrip';
import { formatISTTime } from '@/lib/economic';
import { supabase } from '@/integrations/supabase/client';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';


interface CalendarModalProps {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  day: number;
  month: number;
  year: number;
  trades: Trade[];
  isMobile?: boolean;
  onClose: () => void;
  onGenerateInsight?: () => void;
  onSetManualR?: (tradeId: number, value: number | null) => Promise<void> | void;
}

interface DayAIInsight {
  type: string;
  icon: string;
  title: string;
  text: string;
  severity: string;
}

export const CalendarModal = ({ T, isRTL, day, month, year, trades, isMobile, onClose, onSetManualR }: CalendarModalProps) => {
  const [dayInsights, setDayInsights] = useState<DayAIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Strategic Calendar — HIGH impact (T1) only, across all major macro currencies.
  // Window: only events from up to 7 days ago and forward (focus on this week + next).
  // Anything older than a week is noise for forward-looking planning.
  const MAJOR_CCY = new Set(['USD', 'CNY', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']);
  const { byDay: macroByDay } = useMonthEconomicEvents({ year, month, impacts: ['t1'] });
  const MACRO_WINDOW_START_MS = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 7); return d.getTime(); })();
  const dayMacros = (macroByDay.get(day) ?? [])
    .filter((e) => MAJOR_CCY.has((e.currency || '').toUpperCase()))
    .filter((e) => new Date(e.release_at).getTime() >= MACRO_WINDOW_START_MS)
    .slice()
    .sort((a, b) => new Date(a.release_at).getTime() - new Date(b.release_at).getTime());

  const lang: 'he' | 'en' = isRTL ? 'he' : 'en';


  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ============= Day Note (per-day journal entry) ============= */
  const { activePortfolioId } = useActivePortfolio();
  const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const [note, setNote] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteStatus, setNoteStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [editingNote, setEditingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNoteLoaded(false);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { if (!cancelled) { setNote(''); setNoteLoaded(true); } return; }
      const q = supabase.from('day_notes').select('note').eq('user_id', uid).eq('date', isoDate);
      const { data } = activePortfolioId
        ? await q.eq('portfolio_id', activePortfolioId).maybeSingle()
        : await q.is('portfolio_id', null).maybeSingle();
      if (cancelled) return;
      setNote(data?.note ?? '');
      setNoteLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [isoDate, activePortfolioId]);

  const saveNote = useCallback(async () => {
    setNoteSaving(true);
    setNoteStatus('idle');
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('not_authenticated');
      const { error } = await supabase
        .from('day_notes')
        .upsert(
          { user_id: uid, portfolio_id: activePortfolioId ?? null, date: isoDate, note: note.trim() },
          { onConflict: 'user_id,portfolio_id,date' },
        );
      if (error) throw error;
      setNoteStatus('saved');
      setEditingNote(false);
      window.setTimeout(() => setNoteStatus('idle'), 2200);
    } catch {
      setNoteStatus('error');
    } finally {
      setNoteSaving(false);
    }
  }, [note, isoDate, activePortfolioId]);


  const dayTrades = trades.filter(tr => {
    if (!tr.date) return false;
    const d = new Date(tr.date.replace(' ', 'T'));
    if (isNaN(d.getTime())) return false;
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });

  const totalPnl = dayTrades.reduce((s, tr) => s + tr.pnl, 0);
  const wins = dayTrades.filter(tr => tr.winLoss === 'Win').length;
  const losses = dayTrades.filter(tr => tr.winLoss === 'Loss').length;
  const rAgg = sumR(dayTrades);
  const totalR = rAgg.total;
  const rulesFollowed = dayTrades.filter(tr => tr.rules).length;
  const highDeviation = dayTrades.filter(tr => tr.deviation > 0.1);
  const allRulesFollowed = rulesFollowed === dayTrades.length;
  const isPos = totalPnl >= 0;
  const accent = isPos ? T.accent.green : T.accent.red;

  const dateStr = new Date(year, month, day).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const weekday = new Date(year, month, day).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'long' });
  const dayNum = day;
  const monthName = new Date(year, month, day).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'long' });

  const handleDayAI = useCallback(() => {
    if (dayTrades.length === 0) return;
    setAiLoading(true);
    setShowAI(true);
    setTimeout(() => {
      try {
        const insights = generateDayInsights(dayTrades, isRTL);
        setDayInsights(insights);
      } catch {
        setDayInsights([{
          type: 'alert', icon: '⚠️', title: isRTL ? 'שגיאה' : 'Error',
          text: isRTL ? 'לא ניתן לנתח יום זה' : 'Unable to analyze this day',
          severity: 'medium'
        }]);
      }
      setAiLoading(false);
    }, 600);
  }, [dayTrades, isRTL]);

  /* ============= Shared trade-row renderer ============= */
  const TradeRow = ({ tr }: { tr: Trade }) => {
    const r = getR(tr);
    const hasManual = tr.manual_r_multiple !== null && tr.manual_r_multiple !== undefined;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<string>(hasManual ? String(tr.manual_r_multiple) : (r !== null ? r.toFixed(2) : ''));
    const [saving, setSaving] = useState(false);

    const commit = async (clear: boolean) => {
      if (!onSetManualR) { setEditing(false); return; }
      let value: number | null = null;
      if (!clear) {
        const v = parseFloat(draft.replace(',', '.'));
        if (!Number.isFinite(v)) { setEditing(false); return; }
        value = v;
      }
      try {
        setSaving(true);
        await onSetManualR(tr.id, value);
      } finally {
        setSaving(false);
        setEditing(false);
      }
    };

    return (
      <div style={{
        padding: 14, background: T.bg.tertiary, borderRadius: T.radius.md, marginBottom: 8,
        border: `1px solid ${tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}20`,
        borderInlineStart: `3px solid ${tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{tr.coin}</span>
            <TradingBadge color={tr.direction === 'Long' ? T.accent.green : T.accent.red}>
              {tr.direction === 'Long' ? '↑' : '↓'} {tr.direction}
            </TradingBadge>
            <TradingBadge color={tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}>
              {tr.winLoss}
            </TradingBadge>
            {hasManual && (
              <span title={isRTL ? 'R ידני' : 'Manual R'} style={{
                fontSize: 9, fontWeight: 800, color: T.accent.purple,
                padding: '2px 6px', borderRadius: 999,
                background: `${T.accent.purple}18`, border: `1px solid ${T.accent.purple}40`,
                letterSpacing: '0.05em',
              }}>MANUAL</span>
            )}
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: tr.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
            {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
          <div><span style={{ color: T.text.muted }}>Entry </span><span style={{ color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{tr.entry}</span></div>
          <div><span style={{ color: T.text.muted }}>SL </span><span style={{ color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{tr.stopLoss || '—'}</span></div>
          <div><span style={{ color: T.text.muted }}>Exit </span><span style={{ color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{tr.exit}</span></div>
          <div><span style={{ color: T.text.muted }}>R </span><span style={{ color: r === null ? T.text.muted : r >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{formatR(r, 2)}</span></div>
        </div>
        {onSetManualR && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!editing ? (
              <button
                onClick={() => { setDraft(hasManual ? String(tr.manual_r_multiple) : (r !== null ? r.toFixed(2) : '')); setEditing(true); }}
                style={{
                  fontSize: 10.5, fontWeight: 700, padding: '5px 10px',
                  borderRadius: 999, cursor: 'pointer',
                  background: `${T.accent.cyan}12`, color: T.accent.cyan,
                  border: `1px solid ${T.accent.cyan}40`,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
                }}
              >
                ✎ {isRTL ? 'ערוך R-Multiple' : 'Override R'}
              </button>
            ) : (
              <>
                <input
                  autoFocus
                  type="number"
                  step="0.1"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void commit(false); if (e.key === 'Escape') setEditing(false); }}
                  placeholder="+3.5"
                  style={{
                    width: 86, padding: '5px 8px', borderRadius: 8,
                    border: `1px solid ${T.accent.cyan}55`, background: T.bg.secondary,
                    color: T.text.primary, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                    outline: 'none', textAlign: 'center', fontWeight: 700,
                  }}
                />
                <button disabled={saving} onClick={() => void commit(false)} style={{
                  fontSize: 10.5, fontWeight: 800, padding: '5px 12px', borderRadius: 8,
                  background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                  color: T.bg.primary, border: 'none', cursor: 'pointer',
                  boxShadow: `0 4px 12px ${T.accent.cyan}40`,
                }}>{saving ? '…' : (isRTL ? 'שמור' : 'Save')}</button>
                {hasManual && (
                  <button disabled={saving} onClick={() => void commit(true)} style={{
                    fontSize: 10.5, fontWeight: 700, padding: '5px 10px', borderRadius: 8,
                    background: 'transparent', color: T.accent.red,
                    border: `1px solid ${T.accent.red}50`, cursor: 'pointer',
                  }}>{isRTL ? 'נקה' : 'Clear'}</button>
                )}
                <button disabled={saving} onClick={() => setEditing(false)} style={{
                  fontSize: 10.5, fontWeight: 600, padding: '5px 8px', borderRadius: 8,
                  background: 'transparent', color: T.text.muted,
                  border: `1px solid ${T.border.subtle}`, cursor: 'pointer',
                }}>{isRTL ? 'ביטול' : 'Cancel'}</button>
              </>
            )}
          </div>
        )}
        {tr.comments && <div style={{ marginTop: 8, fontSize: 11, color: T.text.muted, fontStyle: 'italic' }}>"{tr.comments}"</div>}
      </div>
    );
  };

  /* ============= Macro economic events for the day ============= */
  const MacroSection = () => {
    if (dayMacros.length === 0) return null;
    const nowMs = Date.now();
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(244,63,94,0.06), rgba(245,158,11,0.04))',
        border: `1px solid ${T.border.subtle}`,
        borderRadius: T.radius.md,
        padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>📡</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.text.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isRTL ? 'אירועי מאקרו' : 'Macro Events'}
          </span>
          <span style={{ fontSize: 10, color: T.text.muted, marginInlineStart: 4 }}>· {dayMacros.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dayMacros.map((e) => {
            const past = new Date(e.release_at).getTime() < nowMs - 60_000;
            const color = MACRO_TIER_COLOR[e.impact];
            const flag = e.currency ? CURRENCY_FLAG[e.currency] : null;
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                background: T.bg.tertiary,
                borderRadius: T.radius.sm,
                borderInlineStart: `3px solid ${color}`,
                opacity: past ? 0.5 : 1,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, color, minWidth: 22,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {e.impact.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: T.text.muted, fontFamily: "'IBM Plex Mono', monospace", minWidth: 48 }}>
                  {formatISTTime(e.release_at, lang)}
                </span>
                {flag && <span style={{ fontSize: 13 }}>{flag}</span>}
                <span style={{ fontSize: 11, color: T.text.muted, minWidth: 30 }}>{e.currency || ''}</span>
                <span style={{ fontSize: 12, color: T.text.primary, fontWeight: 600, flex: 1 }}>{e.event_name}</span>
                {e.actual && (
                  <span style={{ fontSize: 11, color, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {e.actual}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ============= Day-note (persisted journal entry) =============
     IMPORTANT: keep this as a JSX constant (not a nested component) so the
     <textarea> stays mounted between renders and does not lose focus on
     every keystroke. */
  const hasNote = (note?.trim().length ?? 0) > 0;
  const showEditor = editingNote || (!hasNote && noteLoaded);
  const noteSection = (
    <div style={{
      background: `linear-gradient(135deg, ${T.accent.cyan}08, ${T.bg.tertiary})`,
      border: `1px solid ${T.border.subtle}`,
      borderRadius: T.radius.md, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📝</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.text.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isRTL ? 'הערה ליום' : 'Day Note'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {noteStatus === 'saved' && (
            <span style={{ fontSize: 10, color: T.accent.green, fontWeight: 700 }}>{isRTL ? '✓ נשמר' : '✓ Saved'}</span>
          )}
          {noteStatus === 'error' && (
            <span style={{ fontSize: 10, color: T.accent.red, fontWeight: 700 }}>{isRTL ? 'שגיאת שמירה' : 'Save failed'}</span>
          )}
          {hasNote && !showEditor && noteLoaded && (
            <button
              onClick={() => setEditingNote(true)}
              style={{
                fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                background: 'transparent', color: T.accent.cyan,
                border: `1px solid ${T.accent.cyan}55`, cursor: 'pointer', letterSpacing: '0.05em',
              }}
            >{isRTL ? '✎ עריכה' : '✎ Edit'}</button>
          )}
        </div>
      </div>

      {showEditor ? (
        <>
          <textarea
            value={note}
            maxLength={10000}
            onChange={(e) => {
              // Bug fix: when the auto-editor opened because the day had no note,
              // `editingNote` is false. The moment the user types one character
              // `hasNote` flips true → `showEditor` becomes false → textarea
              // unmounts and loses focus. Promote to explicit edit mode on the
              // first keystroke so the editor stays mounted.
              if (!editingNote) setEditingNote(true);
              setNote(e.target.value.slice(0, 10000));
            }}
            onFocus={() => { if (!editingNote) setEditingNote(true); }}
            disabled={!noteLoaded}
            autoFocus={editingNote}
            placeholder={isRTL ? 'מה קרה היום? תובנות, מצב רוח, החלטות…' : 'What happened today? Insights, mood, decisions…'}
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: T.bg.secondary, color: T.text.primary,
              border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm,
              padding: '10px 12px', fontSize: 13, lineHeight: 1.5,
              fontFamily: "'Poppins', system-ui, sans-serif", outline: 'none',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {hasNote && (
              <button
                onClick={() => { setEditingNote(false); setNoteStatus('idle'); }}
                disabled={noteSaving}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
                  background: 'transparent', color: T.text.muted,
                  border: `1px solid ${T.border.medium}`, cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >{isRTL ? 'בטל' : 'Cancel'}</button>
            )}
            <button
              onClick={() => void saveNote()}
              disabled={noteSaving || !noteLoaded}
              style={{
                fontSize: 11, fontWeight: 800, padding: '7px 16px', borderRadius: 999,
                background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                color: T.bg.primary, border: 'none',
                cursor: (noteSaving || !noteLoaded) ? 'wait' : 'pointer',
                boxShadow: `0 4px 14px ${T.accent.cyan}40`,
                letterSpacing: '0.05em',
              }}
            >{noteSaving ? '…' : (isRTL ? 'שמור הערה' : 'Save Note')}</button>
          </div>
        </>
      ) : (
        <div
          style={{
            background: T.bg.secondary, color: T.text.primary,
            border: `1px dashed ${T.border.subtle}`, borderRadius: T.radius.sm,
            padding: '10px 12px', fontSize: 13, lineHeight: 1.55,
            fontFamily: "'Poppins', system-ui, sans-serif",
            direction: isRTL ? 'rtl' : 'ltr', whiteSpace: 'pre-wrap',
            minHeight: 44,
          }}
        >
          {hasNote ? note : (
            <span style={{ color: T.text.muted, fontStyle: 'italic' }}>
              {isRTL ? 'אין הערה ליום זה.' : 'No note for this day.'}
            </span>
          )}
        </div>
      )}
    </div>
  );


  const AISection = () => (
    !showAI ? (
      <button onClick={handleDayAI} disabled={dayTrades.length === 0} style={{
        width: '100%', padding: '14px',
        background: `linear-gradient(135deg, ${T.accent.purple}20, ${T.accent.blue}15)`,
        border: `1px solid ${T.accent.purple}40`, borderRadius: T.radius.md,
        color: T.accent.purple, cursor: dayTrades.length === 0 ? 'default' : 'pointer',
        fontSize: 14, fontWeight: 700,
        opacity: dayTrades.length === 0 ? 0.5 : 1
      }}>
        🧠 {isRTL ? 'ניתוח AI ליום זה' : 'Analyze this day with AI'}
      </button>
    ) : (
      <div style={{
        background: `linear-gradient(135deg, ${T.accent.purple}08, ${T.accent.blue}08)`,
        border: `1px solid ${T.accent.purple}25`, borderRadius: T.radius.md,
        padding: 16
      }}>
        <div style={{ fontSize: 10, color: T.accent.purple, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          🧠 {isRTL ? 'ניתוח AI' : 'AI Day Analysis'}
        </div>
        <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 12 }}>
          {isRTL
            ? `ניתוח דינמי מבוסס ${dayTrades.length} עסקאות • ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`
            : `Dynamic analysis based on ${dayTrades.length} trades • ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
        </div>
        {aiLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8, animation: 'pulse 1.2s ease infinite' }}>🧠</div>
            <div style={{ fontSize: 12, color: T.text.muted }}>{isRTL ? 'מנתח את היום...' : 'Analyzing this day...'}</div>
          </div>
        ) : dayInsights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: T.text.muted, fontSize: 12 }}>
            {isRTL ? 'אין תובנות ליום זה' : 'No insights for this day'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayInsights.map((ins, i) => {
              const c = ins.type === 'strength' ? T.accent.green : ins.type === 'weakness' ? T.accent.red : ins.type === 'alert' ? T.accent.orange : ins.type === 'momentum' ? T.accent.purple : T.accent.cyan;
              return (
                <div key={i} style={{
                  padding: 12, borderRadius: T.radius.md, background: `${c}10`,
                  borderInlineStart: `3px solid ${c}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{ins.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{ins.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 4, lineHeight: 1.5 }}>{ins.text}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 4, padding: 12, background: T.bg.tertiary, borderRadius: T.radius.md, fontSize: 11, color: T.text.muted, lineHeight: 1.6 }}>
              {generateDaySummary(dayTrades, isRTL)}
            </div>
          </div>
        )}
      </div>
    )
  );

  /* ===========================================================
     MOBILE — iOS-style fullscreen sheet with back arrow
     =========================================================== */
  if (isMobile) {
    const backArrow = isRTL ? '→' : '←';
    return createPortal((
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: T.bg.primary,
          display: 'flex', flexDirection: 'column',
          animation: `${isRTL ? 'slideInLeft' : 'slideInRight'} 0.28s cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {/* iOS sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2,
          padding: '14px 16px 12px',
          background: `${T.bg.primary}f5`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${T.border.subtle}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: T.accent.cyan,
            fontSize: 26, fontWeight: 400, cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>{backArrow}</span>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{isRTL ? 'חזרה' : 'Back'}</span>
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: T.text.primary }}>
            {monthName}
          </div>
          <div style={{ width: 60 }} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Day hero */}
          <div style={{
            padding: '20px 18px 24px',
            background: `linear-gradient(180deg, ${accent}10, transparent)`,
          }}>
            <div style={{ fontSize: 13, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {weekday}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
              <div style={{ fontSize: 56, fontWeight: 800, color: T.text.primary, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.04em', lineHeight: 1 }}>
                {dayNum}
              </div>
              <div style={{ fontSize: 22, color: T.text.muted, fontWeight: 500 }}>{monthName}</div>
            </div>

            <div style={{
              marginTop: 18, padding: '14px 16px',
              background: `${accent}12`, border: `1px solid ${accent}30`,
              borderRadius: 16,
            }}>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                {isRTL ? 'רווח/הפסד יומי' : 'Daily P&L'}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: accent, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                {isPos ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 4 }}>
                {isPos ? '+' : ''}{totalR.toFixed(2)}R · {dayTrades.length} {isRTL ? 'עסקאות' : 'trades'} · {wins}W / {losses}L
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ padding: '0 16px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { l: isRTL ? 'אחוז זכייה' : 'Win Rate', v: `${dayTrades.length > 0 ? ((wins / dayTrades.length) * 100).toFixed(0) : 0}%`, c: T.accent.cyan },
              { l: isRTL ? 'משמעת' : 'Discipline', v: allRulesFollowed ? '✓' : '⚠︎', c: allRulesFollowed ? T.accent.green : T.accent.orange },
              { l: isRTL ? 'סטיות' : 'Deviations', v: `${highDeviation.length}`, c: highDeviation.length > 0 ? T.accent.orange : T.accent.green },
            ].map((s, i) => (
              <div key={i} style={{ padding: 12, background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Behavioral flags */}
          {(highDeviation.length > 0 || !allRulesFollowed || dayTrades.length >= 3) && (
            <div style={{ margin: '0 16px 18px', padding: 14, background: `${T.accent.orange}10`, border: `1px solid ${T.accent.orange}30`, borderRadius: 14 }}>
              <div style={{ fontSize: 10, color: T.accent.orange, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.06em' }}>
                🚩 {isRTL ? 'דגלים התנהגותיים' : 'Behavioral Flags'}
              </div>
              {dayTrades.length >= 3 && <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 4 }}>⚡ {isRTL ? 'מסחר יתר — 3+ עסקאות' : 'Overtrading — 3+ trades'}</div>}
              {!allRulesFollowed && <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 4 }}>⚠️ {isRTL ? 'כללים לא נשמרו' : 'Rules not followed'} ({rulesFollowed}/{dayTrades.length})</div>}
              {highDeviation.length > 0 && <div style={{ fontSize: 12, color: T.text.secondary }}>📊 {isRTL ? 'סטייה גבוהה' : 'High deviation'} ({highDeviation.length})</div>}
            </div>
          )}

          {/* Macro events */}
          {dayMacros.length > 0 && (
            <div style={{ padding: '0 16px 14px' }}>
              <MacroSection />
            </div>
          )}

          {/* Trade list */}
          <div style={{ padding: '0 16px' }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
              {isRTL ? 'פירוט עסקאות' : 'Trade Details'}
            </div>
            {dayTrades.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: T.text.muted, fontSize: 12 }}>
                {isRTL ? 'אין עסקאות ביום זה' : 'No trades this day'}
              </div>
            ) : (
              dayTrades.map(tr => <TradeRow key={tr.id} tr={tr} />)
            )}
          </div>


          {/* Day note */}
          <div style={{ padding: '0 16px 14px' }}>
            {noteSection}
          </div>

          {/* AI */}
          <div style={{ padding: '8px 16px 32px' }}>
            <AISection />
          </div>
        </div>

        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes slideInLeft  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        `}</style>
      </div>
    ), document.body);
  }

  /* ===========================================================
     DESKTOP — Immersive fullscreen split-screen experience
     =========================================================== */
  return createPortal((
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(2, 8, 20, 0.72)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          height: isMobile ? '92dvh' : '100%',
          maxWidth: 1600,
          maxHeight: isMobile ? '92dvh' : '95vh',
          background: `radial-gradient(circle at top ${isRTL ? 'right' : 'left'}, ${accent}10, transparent 50%), linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
          border: `1px solid ${T.border.medium}`,
          borderRadius: isMobile ? '20px 20px 0 0' : 24,
          boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px ${accent}20`,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
          animation: isMobile
            ? 'slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'scaleIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* LEFT: hero panel */}
        <div style={{
          padding: isMobile ? '18px 18px 14px' : '40px 36px',
          background: `linear-gradient(165deg, ${accent}10, transparent 60%)`,
          borderInlineEnd: isMobile ? 'none' : `1px solid ${T.border.subtle}`,
          borderBottom: isMobile ? `1px solid ${T.border.subtle}` : 'none',
          display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 22,
          overflowY: 'auto',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
              color: T.text.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <span style={{ fontSize: 18 }}>{isRTL ? '→' : '←'}</span>
              {isRTL ? 'חזרה ללוח' : 'Back to calendar'}
            </button>
            <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {weekday}
            </div>
          </div>

          {/* Massive date display */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div style={{
                fontSize: 140, fontWeight: 800, color: T.text.primary,
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 0.9, letterSpacing: '-0.06em',
                background: `linear-gradient(180deg, ${T.text.primary}, ${accent})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {dayNum}
              </div>
              <div>
                <div style={{ fontSize: 28, color: T.text.primary, fontWeight: 600, letterSpacing: '-0.02em' }}>{monthName}</div>
                <div style={{ fontSize: 16, color: T.text.muted, marginTop: 2 }}>{year}</div>
              </div>
            </div>
          </div>

          {/* P&L hero */}
          <div style={{
            padding: '22px 24px',
            background: `linear-gradient(135deg, ${accent}18, ${accent}06)`,
            border: `1px solid ${accent}35`,
            borderRadius: 18,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              {isRTL ? 'רווח/הפסד יומי' : 'Daily P&L'}
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, color: accent, fontFamily: "'JetBrains Mono', monospace", marginTop: 4, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {isPos ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
            </div>
            <div style={{ fontSize: 14, color: T.text.secondary, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
              {isPos ? '+' : ''}{totalR.toFixed(2)}R · {dayTrades.length} {isRTL ? 'עסקאות' : 'trades'} · {wins}W / {losses}L
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { l: isRTL ? 'אחוז זכייה' : 'Win Rate', v: `${dayTrades.length > 0 ? ((wins / dayTrades.length) * 100).toFixed(0) : 0}%`, c: T.accent.cyan },
              { l: isRTL ? 'סה״כ R' : 'Total R', v: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, c: totalR >= 0 ? T.accent.green : T.accent.red },
              { l: isRTL ? 'משמעת' : 'Discipline', v: `${rulesFollowed}/${dayTrades.length}`, c: allRulesFollowed ? T.accent.green : T.accent.orange },
              { l: isRTL ? 'סטיות גבוהות' : 'High Deviation', v: `${highDeviation.length}`, c: highDeviation.length > 0 ? T.accent.orange : T.accent.green },
            ].map((s, i) => (
              <div key={i} style={{
                padding: 16, background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
                borderRadius: 14,
              }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{s.l}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Behavioral flags */}
          {(highDeviation.length > 0 || !allRulesFollowed || dayTrades.length >= 3) && (
            <div style={{ padding: 16, background: `${T.accent.orange}10`, border: `1px solid ${T.accent.orange}30`, borderRadius: 14 }}>
              <div style={{ fontSize: 10, color: T.accent.orange, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.08em' }}>
                🚩 {isRTL ? 'דגלים התנהגותיים' : 'Behavioral Flags'}
              </div>
              {dayTrades.length >= 3 && <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 4 }}>⚡ {isRTL ? 'מסחר יתר — 3+ עסקאות' : 'Overtrading — 3+ trades'}</div>}
              {!allRulesFollowed && <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 4 }}>⚠️ {isRTL ? 'כללים לא נשמרו' : 'Rules not followed'}</div>}
              {highDeviation.length > 0 && <div style={{ fontSize: 12, color: T.text.secondary }}>📊 {isRTL ? 'סטייה גבוהה' : 'High deviation'} ({highDeviation.length})</div>}
            </div>
          )}
        </div>

        {/* RIGHT: trades + AI */}
        <div style={{
          padding: '36px 40px',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {dayMacros.length > 0 && <MacroSection />}

          <div>
            <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>
              {isRTL ? 'פירוט עסקאות' : 'Trade Log'} · {dayTrades.length}
            </div>
            {dayTrades.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: T.text.muted, fontSize: 13 }}>
                {isRTL ? 'אין עסקאות ביום זה' : 'No trades this day'}
              </div>
            ) : (
              dayTrades.map(tr => <TradeRow key={tr.id} tr={tr} />)
            )}
          </div>

          <div>
            {noteSection}
          </div>

          <div>
            <AISection />
          </div>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  );
};
