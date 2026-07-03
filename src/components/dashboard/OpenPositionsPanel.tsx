/**
 * OpenPositionsPanel
 * ──────────────────
 * Shown above "Trading Health" on the dashboard whenever the user has at least
 * one open position (manual or synced from a broker).
 *
 * Each card surfaces: symbol · side · size · entry · stop · unrealized P&L.
 * A primary "Closed" button opens a small modal that lets the trader either:
 *   1. Type the exact exit price, or
 *   2. Tap "Closed at stop loss" to use the stored stop as the exit.
 *
 * On confirm we:
 *   • Build a fully-formed closed-trade record (R, PnL, win/loss, risk)
 *   • Push it through the standard `onAddTrade` pipeline (so analytics,
 *     equity curve, calendar, journal and limits all stay consistent).
 *   • Delete the row from `public.open_positions`.
 *
 * Manual provider rows are always closeable. Broker-synced rows are read-only
 * (they close automatically on the next sync) and show a hint instead.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';

interface OpenPos {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  stop_loss: number | null;
  unrealized_pnl: number;
  provider: string;
  leverage?: number | null;
  account_label?: string | null;
  updated_at?: string | null;
}

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  onAddTrade: (trade: Omit<Trade, 'id' | 'balance'>) => Promise<any> | any;
  /** Bump this any time a trade is added/removed so we re-fetch. */
  refreshKey?: number;
}

const fmtDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const DAY_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/** Compact "label · value" cell for the open-position technical-details grid. */
const DetailField = ({
  label, value, color, mono, T,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
  T: TradingTheme;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <span style={{
      fontSize: 9, color: T.text.muted, marginBottom: 2,
      textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600,
    }}>{label}</span>
    <span style={{
      fontSize: 13, fontWeight: 700,
      color: color ?? T.text.primary,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "'Poppins', system-ui, sans-serif",
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{value}</span>
  </div>
);

export const OpenPositionsPanel = ({ T, isRTL, onAddTrade, refreshKey }: Props) => {
  const auth = useAuth();
  const userId = auth.user?.id;
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<OpenPos[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [closing, setClosing] = useState<OpenPos | null>(null);
  const [exitPrice, setExitPrice] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchRows = useCallback(async () => {
    if (!userId) { setRows([]); setInitialized(true); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('open_positions')
      .select('id, symbol, side, size, entry_price, stop_loss, unrealized_pnl, provider, leverage, account_label, updated_at')
      .eq('user_id', userId);
    if (!error && data) setRows(data as OpenPos[]);
    setLoading(false);
    setInitialized(true);
  }, [userId]);

  useEffect(() => { fetchRows(); }, [fetchRows, refreshKey]);

  // Realtime subscription so the panel stays fresh when other tabs/brokers update.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId) return;
    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => { fetchRows(); }, 150);
    };
    const ch = supabase
      .channel(`open_pos_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_positions', filter: `user_id=eq.${userId}` }, scheduleRefetch)
      .subscribe();
    // Instant local signal — dispatched by TradeForm right after upsert so the
    // panel updates without waiting for the postgres_changes round-trip.
    const onLocal = () => scheduleRefetch();
    window.addEventListener('orca:open-position-changed', onLocal);
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(ch);
      window.removeEventListener('orca:open-position-changed', onLocal);
    };
  }, [userId, fetchRows]);

  const openClose = (p: OpenPos) => {
    setClosing(p);
    setExitPrice('');
  };

  const submitClose = async (useStop: boolean) => {
    if (!closing) return;
    const exit = useStop
      ? Number(closing.stop_loss)
      : Number(exitPrice);
    if (!isFinite(exit) || exit <= 0) {
      toast.error(isRTL ? 'מחיר סגירה לא תקין' : 'Invalid close price');
      return;
    }
    if (useStop && (!closing.stop_loss || closing.stop_loss <= 0)) {
      toast.error(isRTL ? 'אין סטופ-לוס שמור לפוזיציה' : 'No stop-loss saved for this position');
      return;
    }
    setBusy(true);
    try {
      const isLong = String(closing.side).toLowerCase().startsWith('l');
      const direction: 'Long' | 'Short' = isLong ? 'Long' : 'Short';
      const entry = Number(closing.entry_price);
      const stop = closing.stop_loss && closing.stop_loss > 0 ? Number(closing.stop_loss) : entry;
      const size = Number(closing.size);
      const move = isLong ? exit - entry : entry - exit;
      const riskPerUnit = Math.abs(entry - stop);
      const riskUsd = riskPerUnit * size;          // $ risked (1R)
      const returnR = riskPerUnit > 0 ? move / riskPerUnit : 0;
      const pnl = move * size;
      const winLoss: Trade['winLoss'] = pnl > 0.05 ? 'Win' : pnl < -0.05 ? 'Loss' : 'Break Even';
      const now = new Date();
      const trade: Omit<Trade, 'id' | 'balance'> = {
        date: fmtDateTime(now),
        day: DAY_EN[now.getDay()],
        coin: closing.symbol,
        direction,
        orderType: 'Market',
        entry,
        stopLoss: closing.stop_loss && closing.stop_loss > 0 ? closing.stop_loss : null,
        exit,
        returnR,
        winLoss,
        risk: riskUsd,
        expectedLoss: riskUsd * 0.975,
        pnl,
        deviation: returnR < 0 ? Math.max(0, Math.abs(returnR) - 1) : 0,
        positionSize: size,
        leverage: 1,
        riskPct: 0,
        rules: true,
        comments: isRTL
          ? `נסגרה מלוח הפוזיציות הפתוחות${useStop ? ' (סטופ-לוס)' : ''}`
          : `Closed from Open Positions panel${useStop ? ' (stop-loss)' : ''}`,
      };
      await onAddTrade(trade);
      // Remove the open position only after the closed trade was saved.
      await supabase.from('open_positions').delete().eq('id', closing.id);
      toast.success(isRTL ? `נסגרה: ${closing.symbol}` : `Closed: ${closing.symbol}`);
      setClosing(null);
      setExitPrice('');
      fetchRows();
    } catch (e: any) {
      toast.error(isRTL ? `שגיאה בסגירה: ${e?.message || e}` : `Close failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const hasRows = rows.length > 0;
  const totalUnreal = useMemo(() => rows.reduce((s, r) => s + (Number(r.unrealized_pnl) || 0), 0), [rows]);

  // Wait for first fetch before deciding what to render — prevents the
  // "empty flash → pop-in" the user reported.
  if (!initialized) return null;

  const sectionAnim: React.CSSProperties = {
    marginBottom: 18,
    animation: 'orcaOpenPosReveal 720ms cubic-bezier(0.22, 1, 0.36, 1) both',
  };

  const keyframes = (
    <style>{`
      @keyframes orcaOpenPosReveal {
        0%   { opacity: 0; filter: blur(14px); transform: translateY(10px) scale(0.985); }
        45%  { opacity: 0.85; filter: blur(4px); transform: translateY(3px) scale(0.995); }
        100% { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
      }
      @keyframes orcaOpenPosCardIn {
        0%   { opacity: 0; filter: blur(8px); transform: translateY(8px); }
        100% { opacity: 1; filter: blur(0); transform: translateY(0); }
      }
    `}</style>
  );

  if (!hasRows) {
    return (
      <div className="dash-section" style={sectionAnim}>
        {keyframes}
        <div className="dash-section-label" style={{ color: T.accent.orange }}>
          {isRTL ? '⚡ פוזיציות פתוחות · 0' : '⚡ OPEN POSITIONS · 0'}
        </div>
        <div style={{
          padding: '20px 18px',
          background: T.bg.tertiary,
          border: `1px dashed ${T.border.medium}`,
          borderRadius: 12,
          color: T.text.muted,
          fontSize: 13,
          textAlign: 'center',
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}>
          {isRTL ? 'כרגע אין פוזיציות פתוחות' : 'No open positions right now'}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section" style={sectionAnim}>
      {keyframes}
      <div className="dash-section-label" style={{ color: T.accent.orange, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>{isRTL ? '⚡ פוזיציות פתוחות' : '⚡ OPEN POSITIONS'} · {rows.length}</span>
        {totalUnreal !== 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: totalUnreal >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
            {isRTL ? 'לא ממומש' : 'Unrealized'}: {totalUnreal >= 0 ? '+' : ''}${totalUnreal.toFixed(2)}
          </span>
        )}
      </div>

      {isMobile && rows.length > 1 && (
        <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left', letterSpacing: 0.3 }}>
          {isRTL ? `← החלק להחלפת פוזיציות (${rows.length})` : `Swipe → to browse (${rows.length})`}
        </div>
      )}
      <div
        className={isMobile && rows.length > 1 ? 'orca-openpos-carousel' : undefined}
        style={
          isMobile && rows.length > 1
            ? {
                display: 'flex', gap: 12, overflowX: 'auto', overflowY: 'hidden',
                scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x',
                overscrollBehaviorX: 'contain',
                scrollBehavior: 'smooth',
                paddingBottom: 8, marginInline: -4, paddingInline: 4,
                scrollbarWidth: 'none',
              }
            : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }
        }>
        <style>{`.orca-openpos-carousel::-webkit-scrollbar{display:none}.orca-openpos-carousel>*{will-change:transform}`}</style>

        {rows.map((p, idx) => {
          const isLong = String(p.side).toLowerCase().startsWith('l');
          const sideColor = isLong ? T.accent.green : T.accent.red;
          const isManual = p.provider === 'manual';
          const entry = Number(p.entry_price) || 0;
          const size = Number(p.size) || 0;
          const stop = p.stop_loss && p.stop_loss > 0 ? Number(p.stop_loss) : null;
          const leverage = Math.max(1, Number(p.leverage) || 1);
          // Notional = full position value. Margin = what the trader actually put up.
          const notionalUsd = entry * size;
          const marginUsd   = notionalUsd / leverage;
          const riskUsd     = stop ? Math.abs(entry - stop) * size : null; // 1R in $
          const fmtUsd = (n: number) =>
            `$${n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : 2 })}`;
          const isExpanded = !!expandedIds[p.id];
          const isCarousel = isMobile && rows.length > 1;
          return (
            <div key={p.id}
              style={{
                background: T.bg.tertiary,
                border: `1px solid ${T.border.medium}`,
                borderInlineStart: `3px solid ${sideColor}`,
                borderRadius: 12,
                padding: 14,
                display: 'flex', flexDirection: 'column', gap: 12,
                animation: `orcaOpenPosCardIn 520ms cubic-bezier(0.22, 1, 0.36, 1) ${180 + idx * 80}ms both`,
                ...(isCarousel ? { flex: '0 0 88%', scrollSnapAlign: 'center', minWidth: 0 } : {}),
              }}>
              {/* Header: symbol + side pill + expand toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontWeight: 800, color: T.text.primary, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.symbol}</span>
                  <span style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {isManual ? (isRTL ? 'ידני' : 'Manual') : p.provider}
                    {leverage > 1 && <span style={{ marginInlineStart: 6, color: T.accent.orange, fontWeight: 700 }}>· {leverage}x</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: `${sideColor}22`, color: sideColor, letterSpacing: 0.5 }}>
                    {isLong ? (isRTL ? 'לונג' : 'LONG') : (isRTL ? 'שורט' : 'SHORT')}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(p.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? (isRTL ? 'כווץ' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: T.bg.secondary, border: `1px solid ${T.border.subtle}`,
                      color: T.text.secondary, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800,
                      transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1), background 180ms',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    }}>
                    ▾
                  </button>
                </div>
              </div>

              {/* Money row: Risk Management (At Risk + stop distance) + Trade Execution (Position Value) */}
              {(() => {
                const stopPct = stop ? Math.abs((entry - stop) / entry) * 100 : null;
                return (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                background: T.bg.secondary, border: `1px solid ${T.border.subtle}`,
                borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ borderInlineEnd: `1px solid ${T.border.subtle}`, paddingInlineEnd: 10 }}>
                  <div style={{ fontSize: 9, color: T.accent.red, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    {isRTL ? '· ניהול סיכון' : '· Risk Management'}
                  </div>
                  <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {isRTL ? 'בסיכון' : 'At Risk'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: riskUsd ? T.accent.red : T.text.muted }}>
                    {riskUsd != null ? fmtUsd(riskUsd) : '—'}
                  </div>
                  {stopPct != null && (
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3, lineHeight: 1.3 }}>
                      {isRTL ? `לפי מרחק סטופ ${stopPct.toFixed(2)}%` : `Based on ${stopPct.toFixed(2)}% stop distance`}
                    </div>
                  )}
                </div>
                <div style={{ paddingInlineStart: 4 }}>
                  <div style={{ fontSize: 9, color: T.accent.cyan, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    {isRTL ? '· ביצוע עסקה' : '· Trade Execution'}
                  </div>
                  <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {isRTL ? 'שווי פוזיציה' : 'Position Value'}
                  </div>
                  <div style={{ fontSize: 15, color: T.text.primary, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtUsd(notionalUsd)}
                  </div>
                  {leverage > 1 ? (
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                      {isRTL ? `מרג'ין ${fmtUsd(marginUsd)} · ${leverage}x` : `Margin ${fmtUsd(marginUsd)} · ${leverage}x`}
                    </div>
                  ) : (
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3, lineHeight: 1.3 }}>
                      {isRTL ? 'שווי שוק כולל של הפוזיציה' : 'Total market value of position'}
                    </div>
                  )}
                </div>
              </div>
                );
              })()}



              {/* Technical details grid — collapsed by default; expand via ▾ toggle. */}
              {isExpanded && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                border: `1px solid ${T.border.subtle}`, borderRadius: 10,
                padding: '10px 12px', background: `${T.bg.secondary}66`,
                animation: 'orcaOpenPosCardIn 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
              }}>
                <DetailField label={isRTL ? 'סוג' : 'Side'} value={isLong ? (isRTL ? 'לונג' : 'Long') : (isRTL ? 'שורט' : 'Short')} color={sideColor} T={T} />
                <DetailField label={isRTL ? 'כמות' : 'Quantity'} value={size.toLocaleString(undefined, { maximumFractionDigits: 6 })} mono T={T} />
                <DetailField label={isRTL ? 'מחיר כניסה' : 'Entry Price'} value={entry.toLocaleString(undefined, { maximumFractionDigits: 6 })} mono T={T} />
                <DetailField
                  label={isRTL ? 'מחיר סטופ' : 'Stop Price'}
                  value={stop ? stop.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'}
                  mono color={stop ? T.accent.red : T.text.muted} T={T}
                />
                <DetailField label={isRTL ? 'מינוף' : 'Leverage'} value={`${leverage}x`} mono color={leverage > 1 ? T.accent.orange : T.text.secondary} T={T} />
                <DetailField
                  label={isRTL ? 'מרחק לסטופ' : 'Stop Distance'}
                  value={stop ? `${(Math.abs((entry - stop) / entry) * 100).toFixed(2)}%` : '—'}
                  mono T={T}
                />
                {p.account_label && (
                  <DetailField label={isRTL ? 'חשבון' : 'Account'} value={p.account_label} T={T} />
                )}
                <DetailField
                  label={isRTL ? 'סטטוס' : 'Status'}
                  value={isRTL ? 'פוזיציה פתוחה' : 'Open'}
                  color={T.accent.cyan} T={T}
                />
              </div>
              )}

              {/* Live P&L row — only when broker reports an unrealized value */}
              {Number(p.unrealized_pnl) !== 0 && (() => {
                const pnl = Number(p.unrealized_pnl);
                const pnlPct = marginUsd > 0 ? (pnl / marginUsd) * 100 : 0;
                const rRealized = riskUsd && riskUsd > 0 ? pnl / riskUsd : null;
                const pnlColor = pnl >= 0 ? T.accent.green : T.accent.red;
                return (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline',
                    padding: '10px 12px', borderRadius: 10,
                    background: `${pnlColor}10`, border: `1px solid ${pnlColor}30`,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.3 }}>{isRTL ? 'תוצאה כרגע' : 'Live P&L'}</span>
                      <span style={{ color: pnlColor, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        <span style={{ fontSize: 11, marginInlineStart: 6, opacity: 0.85 }}>({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                      </span>
                    </div>
                    {rRealized != null && (
                      <div style={{ display: 'flex', flexDirection: 'column', marginInlineStart: 'auto' }}>
                        <span style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.3 }}>{isRTL ? 'R ממומש' : 'Realized R'}</span>
                        <span style={{ color: pnlColor, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                          {rRealized >= 0 ? '+' : ''}{rRealized.toFixed(2)}R
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isExpanded && p.updated_at && (
                <div style={{ fontSize: 10, color: T.text.muted, textAlign: isRTL ? 'right' : 'left', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3 }}>
                  {isRTL ? 'עדכון אחרון' : 'Last update'}: {new Date(p.updated_at).toLocaleString(isRTL ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </div>
              )}

              {isManual ? (
                <button
                  onClick={() => openClose(p)}
                  style={{
                    marginTop: 2,
                    padding: '10px 12px',
                    background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                    border: 'none', borderRadius: 8,
                    color: T.bg.primary, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  }}>
                  {isRTL ? 'סגור פוזיציה' : 'Close position'}
                </button>
              ) : (
                <div style={{ fontSize: 11, color: T.text.muted, marginTop: 2 }}>
                  {isRTL ? 'סגירה אוטומטית בסנכרון הבא מהבורסה' : 'Auto-closes on next broker sync'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {closing && (
        <div
          role="dialog" aria-modal="true"
          onClick={() => !busy && setClosing(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)',
          }}>
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
            style={{
              background: T.bg.secondary, border: `1px solid ${T.border.medium}`,
              borderRadius: 14, padding: 22, width: '100%', maxWidth: 420,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, marginBottom: 4 }}>
              {isRTL ? `סגירת פוזיציה — ${closing.symbol}` : `Close position — ${closing.symbol}`}
            </div>
            <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 16 }}>
              {isRTL ? 'באיזה מחיר נסגרה הפוזיציה?' : 'At what price did the position close?'}
            </div>

            <label style={{ display: 'block', fontSize: 12, color: T.text.primary, fontWeight: 600, marginBottom: 6 }}>
              {isRTL ? 'מחיר סגירה' : 'Exit price'}
            </label>
            <input
              type="number"
              value={exitPrice}
              onChange={e => setExitPrice(e.target.value)}
              autoFocus
              inputMode="decimal"
              placeholder={String(closing.entry_price)}
              style={{
                width: '100%', padding: '12px 14px',
                background: T.bg.tertiary, border: `1.5px solid ${T.border.medium}`,
                borderRadius: 10, color: T.text.primary, fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace", outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button
                disabled={busy || !closing.stop_loss}
                onClick={() => submitClose(true)}
                title={!closing.stop_loss ? (isRTL ? 'לא הוגדר סטופ' : 'No stop saved') : ''}
                style={{
                  flex: '1 1 160px', padding: '10px 12px',
                  background: closing.stop_loss ? `${T.accent.red}18` : T.bg.tertiary,
                  border: `1px solid ${closing.stop_loss ? T.accent.red + '55' : T.border.medium}`,
                  borderRadius: 10, color: closing.stop_loss ? T.accent.red : T.text.muted,
                  fontWeight: 700, fontSize: 12, cursor: closing.stop_loss && !busy ? 'pointer' : 'not-allowed',
                }}>
                {isRTL ? 'נסגרה בסטופ-לוס' : 'Closed at stop loss'}
                {closing.stop_loss ? ` (${closing.stop_loss})` : ''}
              </button>
              <button
                disabled={busy || !exitPrice}
                onClick={() => submitClose(false)}
                style={{
                  flex: '1 1 140px', padding: '10px 12px',
                  background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                  border: 'none', borderRadius: 10, color: T.bg.primary,
                  fontWeight: 800, fontSize: 13, cursor: busy || !exitPrice ? 'not-allowed' : 'pointer',
                  opacity: busy || !exitPrice ? 0.6 : 1,
                }}>
                {busy ? (isRTL ? 'שומר…' : 'Saving…') : (isRTL ? 'אישור סגירה' : 'Confirm close')}
              </button>
            </div>

            <button
              disabled={busy}
              onClick={() => setClosing(null)}
              style={{
                marginTop: 10, width: '100%', padding: '8px',
                background: 'transparent', border: 'none',
                color: T.text.muted, fontSize: 12, cursor: 'pointer',
              }}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenPositionsPanel;
