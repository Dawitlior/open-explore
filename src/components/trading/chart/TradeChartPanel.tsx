import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import {
  INTERVALS, type Interval, pickInterval, resolveSymbol, setSymbolOverride,
} from '@/lib/market/symbol-resolver';
import { frameWindow, useTradeCandles } from '@/lib/market/use-trade-candles';
import {
  getExitTimeOverride, inferExitTime, setExitTimeOverride, toLocalInput, tradeExitMs,
} from '@/lib/market/exit-time';

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

  const inferredExitSec = useMemo(
    () => (exitMs ? Math.floor(exitMs / 1000) : inferExitTime(candles, trade.exit, entryMs)),
    [candles, exitMs, trade.exit, entryMs],
  );
  const exitInferred = !exitMs && inferredExitSec != null;

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
    border: `1px solid ${active ? T.accent.cyan : T.border.subtle}`,
    background: active ? `${T.accent.cyan}1F` : T.bg.tertiary,
    color: active ? T.accent.cyan : T.text.muted,
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
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setIntervalState(iv)} className="orca-focus" style={{ ...chip(interval === iv), padding: '4px 8px', fontSize: 10 }}>
              {iv}
            </button>
          ))}
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

      {/* exit-time notice / editor */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 10px', borderRadius: T.radius.sm,
        border: `1px solid ${exitMs ? T.border.subtle : `${T.accent.orange}44`}`,
        background: exitMs ? T.bg.tertiary : `${T.accent.orange}0F`,
      }}>
        <span style={{ fontSize: 10.5, color: exitMs ? T.text.muted : T.accent.orange, lineHeight: 1.5 }}>
          {exitMs
            ? `${L('זמן יציאה', 'Exit time')}: ${new Date(exitMs).toLocaleString(isRTL ? 'he-IL' : 'en-US')}`
            : exitInferred
              ? L('זמן היציאה לא תועד — הוערך לפי הנר הראשון שנגע במחיר היציאה.',
                  'No exit time recorded — inferred from the first candle that touched the exit price.')
              : L('זמן היציאה לא תועד.', 'No exit time recorded for this trade.')}
        </span>
        <div style={{ flex: 1 }} />
        {editExit ? (
          <>
            <input
              type="datetime-local"
              value={exitDraft}
                min={toLocalInput(entryMs)}
              onChange={e => setExitDraft(e.target.value)}
              style={{
                padding: '6px 9px', borderRadius: 8, border: `1px solid ${T.border.medium}`,
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
          </>
        ) : (
          <>
            <button onClick={() => setEditExit(true)} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
              {exitMs ? L('ערוך זמן יציאה', 'Edit exit time') : L('הוסף זמן יציאה', 'Add exit time')}
            </button>
            {localOverride && !recordedExitMs && (
              <button
                onClick={() => { setExitTimeOverride(trade.id, null); setLocalOverride(null); }}
                className="orca-focus" style={{ ...chip(false), fontSize: 10 }}
              >{L('נקה', 'Clear')}</button>
            )}
          </>
        )}
      </div>

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
        <a href="https://www.tradingview.com" target="_blank" rel="noreferrer" style={{ color: T.accent.cyan }}>TradingView</a>
      </div>
    </div>
  );
}

export default TradeChartPanel;
