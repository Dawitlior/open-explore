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

export const OpenPositionsPanel = ({ T, isRTL, onAddTrade, refreshKey }: Props) => {
  const auth = useAuth();
  const userId = auth.user?.id;
  const [rows, setRows] = useState<OpenPos[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState<OpenPos | null>(null);
  const [exitPrice, setExitPrice] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [editStopId, setEditStopId] = useState<string | null>(null);
  const [editStopVal, setEditStopVal] = useState<string>('');
  const [savingStop, setSavingStop] = useState(false);

  const beginEditStop = (p: OpenPos) => {
    setEditStopId(p.id);
    setEditStopVal(p.stop_loss ? String(p.stop_loss) : '');
  };
  const saveStop = async (p: OpenPos) => {
    const v = Number(editStopVal);
    if (!isFinite(v) || v <= 0) {
      toast.error(isRTL ? 'מחיר סטופ לא תקין' : 'Invalid stop price');
      return;
    }
    setSavingStop(true);
    const { error } = await supabase
      .from('open_positions')
      .update({ stop_loss: v, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    setSavingStop(false);
    if (error) { toast.error(error.message); return; }
    setRows(prev => prev.map(r => r.id === p.id ? { ...r, stop_loss: v } : r));
    setEditStopId(null);
    toast.success(isRTL ? 'סטופ-לוס נשמר' : 'Stop-loss saved');
  };

  const fetchRows = useCallback(async () => {
    if (!userId) { setRows([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('open_positions')
      .select('id, symbol, side, size, entry_price, stop_loss, unrealized_pnl, provider')
      .eq('user_id', userId);
    if (!error && data) setRows(data as OpenPos[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchRows(); }, [fetchRows, refreshKey]);

  // Realtime subscription so the panel stays fresh when other tabs/brokers update.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId) return;
    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => { fetchRows(); }, 250);
    };
    const ch = supabase
      .channel(`open_pos_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_positions', filter: `user_id=eq.${userId}` }, scheduleRefetch)
      .subscribe();
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(ch);
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

  if (!hasRows && !loading) return null;

  return (
    <div className="dash-section" style={{ marginBottom: 18 }}>
      <div className="dash-section-label" style={{ color: T.accent.orange, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>{isRTL ? '⚡ פוזיציות פתוחות' : '⚡ OPEN POSITIONS'} · {rows.length}</span>
        {totalUnreal !== 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: totalUnreal >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
            {isRTL ? 'לא ממומש' : 'Unrealized'}: {totalUnreal >= 0 ? '+' : ''}${totalUnreal.toFixed(2)}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {rows.map(p => {
          const isLong = String(p.side).toLowerCase().startsWith('l');
          const sideColor = isLong ? T.accent.green : T.accent.red;
          const isManual = p.provider === 'manual';
          return (
            <div key={p.id}
              style={{
                background: T.bg.tertiary,
                border: `1px solid ${T.border.medium}`,
                borderInlineStart: `3px solid ${sideColor}`,
                borderRadius: 12,
                padding: 14,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: T.text.primary, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.symbol}</span>
                  <span style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {isManual ? (isRTL ? 'ידני' : 'Manual') : p.provider} · {isLong ? (isRTL ? 'לונג' : 'LONG') : (isRTL ? 'שורט' : 'SHORT')}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${sideColor}18`, color: sideColor }}>
                  × {Number(p.size).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                <div>
                  <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 2 }}>{isRTL ? 'כניסה' : 'Entry'}</div>
                  <div style={{ fontSize: 14, color: T.text.primary, fontWeight: 600 }}>{Number(p.entry_price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span>{isRTL ? 'סטופ-לוס' : 'Stop Loss'}</span>
                    {isManual && editStopId !== p.id && (
                      <button
                        onClick={() => beginEditStop(p)}
                        style={{ background: 'transparent', border: 'none', color: T.accent.cyan, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: 0 }}>
                        {p.stop_loss ? (isRTL ? 'ערוך' : 'Edit') : (isRTL ? '+ הגדר' : '+ Set')}
                      </button>
                    )}
                  </div>
                  {editStopId === p.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="number" inputMode="decimal" autoFocus
                        value={editStopVal}
                        onChange={e => setEditStopVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveStop(p); if (e.key === 'Escape') setEditStopId(null); }}
                        style={{ width: '100%', minWidth: 0, padding: '4px 6px', background: T.bg.secondary, border: `1px solid ${T.accent.cyan}55`, borderRadius: 6, color: T.text.primary, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
                      />
                      <button disabled={savingStop} onClick={() => saveStop(p)}
                        style={{ padding: '4px 8px', background: T.accent.cyan, border: 'none', borderRadius: 6, color: T.bg.primary, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                        ✓
                      </button>
                      <button onClick={() => setEditStopId(null)}
                        style={{ padding: '4px 6px', background: 'transparent', border: `1px solid ${T.border.medium}`, borderRadius: 6, color: T.text.muted, fontSize: 11, cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, color: p.stop_loss ? T.accent.red : T.text.muted, fontWeight: 600 }}>
                      {p.stop_loss ? Number(p.stop_loss).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '—'}
                    </div>
                  )}
                </div>
              </div>

              {Number(p.unrealized_pnl) !== 0 && (
                <div style={{ fontSize: 12, color: p.unrealized_pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                  {isRTL ? 'לא ממומש' : 'Unrealized'}: {p.unrealized_pnl >= 0 ? '+' : ''}${Number(p.unrealized_pnl).toFixed(2)}
                </div>
              )}

              {isManual ? (
                <button
                  onClick={() => openClose(p)}
                  style={{
                    marginTop: 4,
                    padding: '9px 12px',
                    background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                    border: 'none', borderRadius: 8,
                    color: T.bg.primary, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  }}>
                  {isRTL ? 'נסגרה' : 'Closed'}
                </button>
              ) : (
                <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>
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
