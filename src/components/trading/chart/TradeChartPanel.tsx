import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import {
  INTERVALS, type Interval, cryptoBase, pickInterval, resolveSymbol, setSymbolOverride,
} from '@/lib/market/symbol-resolver';
import { frameWindow, useTradeCandles } from '@/lib/market/use-trade-candles';
import { infoColor, neutralRamp } from '@/lib/semantic-color';
import {
  getExitTimeOverride, inferExitTime, setExitTimeOverride, toLocalInput, tradeExitMs,
} from '@/lib/market/exit-time';
import { formatHeaderInZone, useDisplayTimeZone } from '@/lib/market/display-timezone';
import type { ExitState } from './TradeReplayChart';

const TradeReplayChart = lazy(() => import('./TradeReplayChart'));


interface Props {
  T: TradingTheme;
  trade: Trade;
  isRTL: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
}

/**
 * Chart surface for the trade dossier: a themed replay chart with the exact
 * entry/stop/exit levels and the entry→exit trade line. The TradingView embed
 * was removed on purpose — the free widget cannot be scrolled to a historical
 * trade window, so it always landed on "today" and was misleading.
 */
export function TradeChartPanel({ T, trade, isRTL, isMobile, reducedMotion }: Props) {
  const resolved = useMemo(() => resolveSymbol(trade.coin), [trade.coin]);
  const entryMs = useMemo(() => {
    const t = new Date(trade.date).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }, [trade.date]);

  const [interval, setIntervalState] = useState<Interval>(() => pickInterval(60 * 60 * 1000) as Interval);
  const [editSymbol, setEditSymbol] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState(resolved.tvSymbol);
  const [mapVersion, setMapVersion] = useState(0);

  // exit-time: trade field → local override → inferred from candles
  const recordedExitMs = tradeExitMs(trade.exitDate);
  const [localOverride, setLocalOverride] = useState<number | null>(() => getExitTimeOverride(trade.id));
  const exitMs = recordedExitMs ?? localOverride;
  const [editExit, setEditExit] = useState(false);
  const [exitDraft, setExitDraft] = useState(() => toLocalInput(recordedExitMs ?? getExitTimeOverride(trade.id) ?? entryMs));

  useEffect(() => {
    setSymbolDraft(resolved.tvSymbol);
    setEditSymbol(false);
  }, [resolved.klineSymbol, resolved.tvSymbol, mapVersion]);

  useEffect(() => {
    const v = getExitTimeOverride(trade.id);
    setLocalOverride(v);
    setExitDraft(toLocalInput(tradeExitMs(trade.exitDate) ?? v ?? entryMs));
    setEditExit(false);
  }, [trade.id, trade.exitDate, entryMs]);

  const win = useMemo(
    () => frameWindow(entryMs, (exitMs && exitMs > entryMs ? exitMs : entryMs + 4 * 60 * 60 * 1000), interval),
    [entryMs, exitMs, interval],
  );

  const { candles, loading, error } = useTradeCandles(
    resolved.klineSymbol, interval, win, true,
  );

  const timeZone = useDisplayTimeZone();

  /** Exit time is exactly one of: exact | inferred | unknown. */
  const inferredExitSec = useMemo(
    () => (exitMs ? null : inferExitTime(candles, trade.exit, entryMs, trade.direction === 'Long', 500)),
    [candles, exitMs, trade.exit, trade.direction, entryMs],
  );
  const exitSec = exitMs ? Math.floor(exitMs / 1000) : inferredExitSec;
  const exitState: ExitState = exitMs ? 'exact' : inferredExitSec != null ? 'inferred' : 'unknown';
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  useEffect(() => { setNoticeDismissed(false); }, [trade.id]);


  /** Sanity guard: the entry price should live somewhere near the fetched candles. */
  const symbolMismatch = useMemo(() => {
    const tradeBase = cryptoBase(trade.coin);
    const labelBase = cryptoBase(resolved.tvSymbol);
    const feedBase = cryptoBase(resolved.klineSymbol ?? '');
    if (tradeBase && (labelBase !== tradeBase || feedBase !== tradeBase)) return true;
    if (!candles?.length || !Number.isFinite(trade.entry) || trade.entry <= 0) return false;
    const lo = Math.min(...candles.map(c => c.low));
    const hi = Math.max(...candles.map(c => c.high));
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0) return false;
    return trade.entry < lo / 3 || trade.entry > hi * 3;
  }, [candles, trade.coin, trade.entry, resolved.klineSymbol, resolved.tvSymbol]);

  const height = isMobile ? 300 : 420;
  const L = (he: string, en: string) => (isRTL ? he : en);


  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 11px',
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 0.5,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: 'pointer',
    border: `1px solid ${active ? infoColor(T) : T.border.subtle}`,
    background: active ? `${infoColor(T)}1F` : T.bg.tertiary,
    color: active ? infoColor(T) : T.text.muted,
    transition: reducedMotion ? 'none' : 'all .16s ease',
  });

  const shell: React.CSSProperties = {
    height,
    borderRadius: T.radius.md,
    border: `1px solid ${T.border.subtle}`,
    background: T.bg.tertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: T.text.muted,
    fontSize: 12,
    textAlign: 'center',
    padding: 20,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      {/* controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color: T.text.secondary, fontFamily: "'JetBrains Mono', monospace" }}>
          {L('שחזור טרייד', 'TRADE REPLAY')}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {INTERVALS.map(iv => {
            const active = interval === iv;
            return (
              <button
                key={iv}
                onClick={() => setIntervalState(iv)}
                aria-pressed={active}
                className="orca-focus"
                style={{
                  ...chip(active),
                  padding: '4px 8px',
                  fontSize: 10,
                  minWidth: 40,
                  textAlign: 'center',
                  background: active ? infoColor(T) : T.bg.tertiary,
                  color: active ? T.bg.primary : T.text.muted,
                }}
              >
                {iv}
              </button>
            );
          })}
        </div>

      </div>

      {/* symbol line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {editSymbol ? (
          <>
            <input
              value={symbolDraft}
              onChange={e => setSymbolDraft(e.target.value)}
              placeholder="BINANCE:SOLUSDT"
              style={{
                flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${T.border.medium}`, background: T.bg.card,
                color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5,
              }}
            />
            <button
              onClick={() => { setSymbolOverride(trade.coin, symbolDraft); setMapVersion(v => v + 1); }}
              className="orca-focus" style={{ ...chip(true), fontSize: 10 }}
            >{L('שמור', 'Save')}</button>
            <button onClick={() => { setEditSymbol(false); setSymbolDraft(resolved.tvSymbol); }} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
              {L('ביטול', 'Cancel')}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: T.text.secondary }}>
              {resolved.tvSymbol}
            </span>
            <span style={{ fontSize: 9.5, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              {resolved.assetClass}{resolved.overridden ? ` · ${L('מותאם', 'custom')}` : ''}
            </span>
            <button onClick={() => setEditSymbol(true)} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
              {L('שנה סימבול', 'Change symbol')}
            </button>
          </>
        )}
      </div>

      {/* symbol sanity guard */}
      {symbolMismatch && !editSymbol && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '7px 10px', borderRadius: T.radius.sm,
          border: `1px solid ${T.state.warn}55`, background: `${T.state.warn}12`,
          fontSize: 10.5, color: T.state.warn, lineHeight: 1.5,
        }}>
          <span>{L('ייתכן שהסימבול אינו תואם לעסקה הזו — טווח המחירים בגרף רחוק ממחיר הכניסה.',
            'Symbol may not match this trade — the chart price range is far from the entry price.')}</span>
          <button onClick={() => setEditSymbol(true)} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
            {L('שנה סימבול', 'Change symbol')}
          </button>
        </div>
      )}

      {/* exit-time line */}
      {editExit ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="datetime-local"
            value={exitDraft}
            min={toLocalInput(entryMs)}
            onChange={e => setExitDraft(e.target.value)}
            style={{
              padding: '6px 9px', borderRadius: T.radius.sm, border: `1px solid ${T.border.medium}`,
              background: T.bg.card, color: T.text.primary, fontSize: 11.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          <button
            onClick={() => {
              const ms = new Date(exitDraft).getTime();
              if (Number.isFinite(ms) && ms >= entryMs) { setExitTimeOverride(trade.id, ms); setLocalOverride(ms); }
              setEditExit(false);
            }}
            disabled={new Date(exitDraft).getTime() < entryMs}
            className="orca-focus" style={{ ...chip(true), fontSize: 10 }}
          >{L('שמור', 'Save')}</button>
          <button onClick={() => setEditExit(false)} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
            {L('ביטול', 'Cancel')}
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          fontSize: 10.5, lineHeight: 1.5, color: exitMs ? T.text.muted : T.state.warn,
        }}>
          <span>
            {exitMs
              ? `${L('זמן יציאה', 'Exit time')}: ${new Date(exitMs).toLocaleString(isRTL ? 'he-IL' : 'en-US')}`
              : exitInferred
                ? L('זמן היציאה הוערך לפי הנר הראשון שנגע במחיר היציאה.',
                    'Exit time inferred from the first candle touching the exit price.')
                : L('זמן היציאה לא תועד.', 'No exit time recorded.')}
          </span>
          <button
            onClick={() => setEditExit(true)}
            className="orca-focus"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: infoColor(T), fontSize: 10.5, fontWeight: 700, textDecoration: 'underline',
            }}
          >
            {exitMs ? L('ערוך', 'Edit') : L('הוסף', 'Add')}
          </button>
          {localOverride && !recordedExitMs && (
            <button
              onClick={() => { setExitTimeOverride(trade.id, null); setLocalOverride(null); }}
              className="orca-focus"
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: T.text.muted, fontSize: 10.5, textDecoration: 'underline',
              }}
            >{L('נקה', 'Clear')}</button>
          )}
        </div>
      )}


      {/* chart */}
      <Suspense fallback={<div style={shell}>{L('טוען גרף…', 'Loading chart…')}</div>}>
        {loading ? (
          <div style={shell}>{L('טוען נרות…', 'Loading candles…')}</div>
        ) : resolved.klineSymbol && candles && candles.length ? (
          <div style={{ borderRadius: T.radius.md, overflow: 'hidden', border: `1px solid ${T.border.subtle}`, background: T.bg.tertiary }}>
            <TradeReplayChart
              T={T}
              candles={candles}
              entry={trade.entry}
              stop={trade.stopLoss}
              exit={trade.exit}
              target={Number.isFinite((trade as unknown as { target?: number }).target as number)
                ? (trade as unknown as { target?: number }).target
                : null}
              rMultiple={Number.isFinite(trade.returnR) ? trade.returnR : null}
              pnl={Number.isFinite(trade.pnl) ? trade.pnl : null}
              isLong={trade.direction === 'Long'}
              entryTime={Math.floor(entryMs / 1000)}
              exitTime={inferredExitSec ?? undefined}
              exitInferred={exitInferred}
              height={height}
              reducedMotion={reducedMotion}
              isRTL={isRTL}
            />
          </div>
        ) : (
          <div style={shell}>
            {resolved.klineSymbol
              ? L(`אין נתוני נרות ל-${resolved.klineSymbol}${error ? '' : ''}`,
                  `No candle data available for ${resolved.klineSymbol}`)
              : L('שחזור נרות זמין כרגע לקריפטו בלבד.',
                  'Candle replay currently covers crypto markets only.')}
          </div>
        )}
      </Suspense>

      <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: 0.4 }}>
        {L('גרפים באדיבות', 'Charts by')}{' '}
        <a href="https://www.tradingview.com" target="_blank" rel="noreferrer" style={{ color: infoColor(T) }}>TradingView</a>
      </div>
    </div>
  );
}

export default TradeChartPanel;
