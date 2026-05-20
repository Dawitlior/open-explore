/**
 * Pure helpers that translate TradingView drawing payloads + symbols
 * into the existing Backtest Journal row shape (`orca-bt-v13`).
 *
 * Keeping this isolated means future TradingView API drift only touches
 * one file, and we can unit-test the mapping without mounting the widget.
 */

export interface TvPoint {
  /** epoch seconds, as TV reports them */
  time: number;
  price: number;
}

export interface DraftBacktestTrade {
  /** Stable id for the in-flight draft — usually the TV shape id. */
  lineId: string;
  coin: string;
  /** "DD/MM/YYYY HH:mm" — matches existing `parseDT` regex in BacktestDimension. */
  entryDT: string;
  exitDT: string;
  entry: string;
  sl: string;
  exit: string;
  mfeP: string;
  maeP: string;
  dir: 'Long' | 'Short' | '';
  notes: string;
  chartE: string;
  chartX: string;
  /** Lifecycle marker — modal opens automatically on 'ready_to_commit'. */
  status: 'drafting' | 'ready_to_commit';
}

/** Format an epoch-seconds value into the legacy "DD/MM/YYYY HH:mm" string. */
export function fmtDT(epochSec: number): string {
  if (!epochSec || !isFinite(epochSec)) return '';
  const d = new Date(epochSec * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Strip `EXCHANGE:` prefix and any perp suffix so it matches journal coin tags. */
export function normalizeSymbol(raw: string): string {
  if (!raw) return '';
  const noEx = raw.includes(':') ? raw.split(':').pop()! : raw;
  return noEx.replace(/\.P$|PERP$/i, '').replace(/USDT$|USD$/i, '').toUpperCase() || noEx.toUpperCase();
}

/**
 * Maps a TradingView Long/Short Position drawing into a draft row.
 *
 * TV's Long/Short Position tool exposes three points:
 *   points[0] — entry (price + time)
 *   points[1] — target/exit (price + time)
 *   points[2] — stop loss (price only matters)
 */
export function lineToolToDraft(opts: {
  lineId: string;
  toolName: string;
  points: TvPoint[];
  symbol: string;
  status?: DraftBacktestTrade['status'];
  prev?: Partial<DraftBacktestTrade>;
}): DraftBacktestTrade {
  const { lineId, toolName, points, symbol, status = 'drafting', prev = {} } = opts;
  const [pEntry, pTarget, pStop] = points;

  const explicitDir: DraftBacktestTrade['dir'] =
    /Short/i.test(toolName) ? 'Short' : /Long/i.test(toolName) ? 'Long' : '';

  const entry = pEntry?.price ?? NaN;
  const stop = pStop?.price ?? NaN;
  const dir: DraftBacktestTrade['dir'] =
    explicitDir || (entry > stop ? 'Long' : stop > entry ? 'Short' : '');

  return {
    lineId,
    coin: normalizeSymbol(symbol) || prev.coin || '',
    entryDT: pEntry ? fmtDT(pEntry.time) : prev.entryDT || '',
    exitDT: pTarget ? fmtDT(pTarget.time) : prev.exitDT || '',
    entry: isFinite(entry) ? String(entry) : prev.entry || '',
    sl: isFinite(stop) ? String(stop) : prev.sl || '',
    exit: pTarget && isFinite(pTarget.price) ? String(pTarget.price) : prev.exit || '',
    mfeP: prev.mfeP || '',
    maeP: prev.maeP || '',
    dir,
    notes: prev.notes || '',
    chartE: prev.chartE || '',
    chartX: prev.chartX || '',
    status,
  };
}

/** Quick R-multiple preview for the Commit Modal header. */
export function previewR(d: Pick<DraftBacktestTrade, 'entry' | 'sl' | 'exit'>): number | null {
  const e = parseFloat(d.entry), sl = parseFloat(d.sl), ex = parseFloat(d.exit);
  if (!e || !sl || !ex || e === sl) return null;
  return (ex - e) / (e - sl);
}
