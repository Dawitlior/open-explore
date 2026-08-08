import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import {
  INTERVALS, type Interval, pickInterval, resolveSymbol, setSymbolOverride,
} from '@/lib/market/symbol-resolver';
import { frameWindow, useTradeCandles } from '@/lib/market/use-trade-candles';
import { getExitTimeOverride, inferExitTime, setExitTimeOverride, toLocalInput } from '@/lib/market/exit-time';

const TradeReplayChart = lazy(() => import('./TradeReplayChart'));
const TradingViewPanel = lazy(() => import('./TradingViewPanel'));

interface Props {
  T: TradingTheme;
  trade: Trade;
  isRTL: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
}

type Source = 'replay' | 'tv';

/**
 * Chart surface for the trade dossier: a themed replay chart with the exact
 * entry/stop/exit levels, plus the free TradingView Advanced Chart for any
 * ticker. Everything below loads only when this component mounts.
 */
export function TradeChartPanel({ T, trade, isRTL, isMobile, reducedMotion }: Props) {
  const resolved = useMemo(() => resolveSymbol(trade.coin), [trade.coin]);
  const entryMs = useMemo(() => {
    const t = new Date(trade.date).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }, [trade.date]);

  const [source, setSource] = useState<Source>(resolved.klineSymbol ? 'replay' : 'tv');
  const [interval, setIntervalState] = useState<Interval>(() => pickInterval(60 * 60 * 1000) as Interval);
  const [editSymbol, setEditSymbol] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState(resolved.tvSymbol);
  const [mapVersion, setMapVersion] = useState(0);

  // exit-time: user override → inferred from candles
  const [exitOverride, setExitOverride] = useState<number | null>(() => getExitTimeOverride(trade.id));
  const [editExit, setEditExit] = useState(false);
  const [exitDraft, setExitDraft] = useState(() => toLocalInput(getExitTimeOverride(trade.id) ?? entryMs));

  useEffect(() => {
    setSource(resolved.klineSymbol ? 'replay' : 'tv');
    setSymbolDraft(resolved.tvSymbol);
    setEditSymbol(false);
  }, [resolved.klineSymbol, resolved.tvSymbol, mapVersion]);

  useEffect(() => {
    const v = getExitTimeOverride(trade.id);
    setExitOverride(v);
    setExitDraft(toLocalInput(v ?? entryMs));
    setEditExit(false);
  }, [trade.id, entryMs]);

  const win = useMemo(
    () => frameWindow(entryMs, (exitOverride ?? entryMs + 4 * 60 * 60 * 1000), interval),
    [entryMs, exitOverride, interval],
  );

  const { candles, loading, error } = useTradeCandles(
    resolved.klineSymbol, interval, win, source === 'replay',
  );

  const inferredExitSec = useMemo(
    () => (exitOverride ? Math.floor(exitOverride / 1000) : inferExitTime(candles, trade.exit, entryMs)),
    [candles, exitOverride, trade.exit, entryMs],
  );
  const exitInferred = !exitOverride && inferredExitSec != null;

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
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setSource('replay')}
            disabled={!resolved.klineSymbol}
            className="orca-focus"
            style={{ ...chip(source === 'replay'), opacity: resolved.klineSymbol ? 1 : 0.4, cursor: resolved.klineSymbol ? 'pointer' : 'not-allowed' }}
          >{L('שחזור טרייד', 'Trade replay')}</button>
          <button onClick={() => setSource('tv')} className="orca-focus" style={chip(source === 'tv')}>
            TradingView
          </button>
        </div>

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
        border: `1px solid ${exitOverride ? T.border.subtle : `${T.accent.orange}44`}`,
        background: exitOverride ? T.bg.tertiary : `${T.accent.orange}0F`,
      }}>
        <span style={{ fontSize: 10.5, color: exitOverride ? T.text.muted : T.accent.orange, lineHeight: 1.5 }}>
          {exitOverride
            ? `${L('זמן יציאה', 'Exit time')}: ${new Date(exitOverride).toLocaleString(isRTL ? 'he-IL' : 'en-US')}`
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
                if (Number.isFinite(ms)) { setExitTimeOverride(trade.id, ms); setExitOverride(ms); }
                setEditExit(false);
              }}
              className="orca-focus" style={{ ...chip(true), fontSize: 10 }}
            >{L('שמור', 'Save')}</button>
            <button onClick={() => setEditExit(false)} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
              {L('ביטול', 'Cancel')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditExit(true)} className="orca-focus" style={{ ...chip(false), fontSize: 10 }}>
              {exitOverride ? L('ערוך זמן יציאה', 'Edit exit time') : L('הוסף זמן יציאה', 'Add exit time')}
            </button>
            {exitOverride && (
              <button
                onClick={() => { setExitTimeOverride(trade.id, null); setExitOverride(null); }}
                className="orca-focus" style={{ ...chip(false), fontSize: 10 }}
              >{L('נקה', 'Clear')}</button>
            )}
          </>
        )}
      </div>

      {/* chart */}
      <Suspense fallback={<div style={shell}>{L('טוען גרף…', 'Loading chart…')}</div>}>
        {source === 'tv' ? (
          <TradingViewPanel
            T={T}
            tvSymbol={resolved.tvSymbol}
            interval={interval}
            height={height}
            isRTL={isRTL}
            tradeMs={entryMs}
            exitMs={exitOverride ?? (inferredExitSec ? inferredExitSec * 1000 : undefined)}
          />
        ) : loading ? (
          <div style={shell}>{L('טוען נרות…', 'Loading candles…')}</div>
        ) : candles && candles.length ? (
          <div style={{
            borderRadius: T.radius.md, border: `1px solid ${T.border.subtle}`,
            background: T.bg.tertiary, overflow: 'hidden', padding: 4,
          }}>
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
              ? L(`אין נתוני נרות ל-${resolved.klineSymbol}${error ? '' : ''} — נסה את לשונית TradingView`,
                  `No candle data for ${resolved.klineSymbol} — try the TradingView tab`)
              : L('שחזור נרות זמין כרגע לקריפטו. פתח את לשונית TradingView לכל נכס אחר.',
                  'Candle replay currently covers crypto. Use the TradingView tab for any other market.')}
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
