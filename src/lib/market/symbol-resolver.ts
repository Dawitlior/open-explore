/**
 * Symbol resolution engine.
 * Turns a stored trade `coin` ("SOL", "AAPL", "EUR/USD", "NQ") into
 *  - a TradingView symbol (`BINANCE:SOLUSDT`, `NASDAQ:AAPL`, ...)
 *  - a Binance klines symbol for the local Trade Replay chart (crypto only)
 * Users can override the mapping once per symbol; the override is persisted.
 */

export type AssetClass = 'crypto' | 'stock' | 'forex' | 'futures' | 'index' | 'unknown';

export interface ResolvedSymbol {
  /** Raw symbol as stored on the trade. */
  raw: string;
  assetClass: AssetClass;
  /** Full TradingView symbol, e.g. `BINANCE:SOLUSDT`. */
  tvSymbol: string;
  /** Binance perp/spot symbol for candle replay, or null when unsupported. */
  klineSymbol: string | null;
  /** True when the user pinned this mapping manually. */
  overridden: boolean;
}

const OVERRIDE_KEY = 'orca:symbolMap:v1';

const FOREX = new Set([
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCHF', 'CADJPY', 'CHFJPY',
  'XAUUSD', 'XAGUSD',
]);

const FUTURES: Record<string, string> = {
  NQ: 'CME_MINI:NQ1!', ES: 'CME_MINI:ES1!', MNQ: 'CME_MINI:MNQ1!', MES: 'CME_MINI:MES1!',
  YM: 'CBOT_MINI:YM1!', RTY: 'CME_MINI:RTY1!', CL: 'NYMEX:CL1!', MCL: 'NYMEX:MCL1!',
  GC: 'COMEX:GC1!', MGC: 'COMEX:MGC1!', SI: 'COMEX:SI1!', NG: 'NYMEX:NG1!', ZB: 'CBOT:ZB1!',
};

const INDICES: Record<string, string> = {
  SPX: 'SP:SPX', SPX500: 'SP:SPX', US500: 'SP:SPX',
  NDX: 'NASDAQ:NDX', US100: 'NASDAQ:NDX', NAS100: 'NASDAQ:NDX',
  DJI: 'DJ:DJI', US30: 'DJ:DJI', DAX: 'XETR:DAX', GER40: 'XETR:DAX',
  VIX: 'CBOE:VIX', TA35: 'TASE:TA35', TA125: 'TASE:TA125',
};

/** Popular crypto bases — everything short & unlisted elsewhere also defaults to crypto. */
const CRYPTO = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'POL', 'LINK',
  'LTC', 'TRX', 'ATOM', 'NEAR', 'APT', 'ARB', 'OP', 'SUI', 'SEI', 'TIA', 'INJ', 'FIL',
  'ETC', 'BCH', 'UNI', 'AAVE', 'RUNE', 'PEPE', 'SHIB', 'WIF', 'BONK', 'FET', 'RNDR', 'TON',
  'HBAR', 'ICP', 'ALGO', 'FTM', 'GALA', 'SAND', 'MANA', 'CRV', 'LDO', 'ORDI', 'JUP', 'PYTH',
]);

const CRYPTO_QUOTES = ['USDT', 'USDC', 'USD', 'PERP', 'BUSD'];

const clean = (s: string) => (s || '').trim().toUpperCase().replace(/\s+/g, '');

function readOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch { return {}; }
}

export function setSymbolOverride(rawSymbol: string, tvSymbol: string) {
  try {
    const map = readOverrides();
    const key = clean(rawSymbol);
    if (!tvSymbol.trim()) delete map[key];
    else map[key] = clean(tvSymbol);
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('orca:symbol-map-changed', { detail: { key } }));
  } catch { /* storage disabled */ }
}

export function getSymbolOverride(rawSymbol: string): string | null {
  return readOverrides()[clean(rawSymbol)] ?? null;
}

/** Strip a quote currency off a crypto pair: "SOLUSDT" → { base: "SOL" }. */
function splitCrypto(sym: string): { base: string; quote: string } | null {
  const s = sym.replace(/[-_/:]/g, '');
  for (const q of CRYPTO_QUOTES) {
    if (s.length > q.length && s.endsWith(q)) return { base: s.slice(0, -q.length), quote: q === 'PERP' ? 'USDT' : q };
  }
  return null;
}

export function classify(rawSymbol: string): AssetClass {
  const s = clean(rawSymbol);
  if (!s) return 'unknown';
  const flat = s.replace(/[-_/:]/g, '');
  if (FUTURES[s] || /^[A-Z]{2,3}\d?!$/.test(s)) return 'futures';
  if (INDICES[flat]) return 'index';
  if (FOREX.has(flat) || (/^[A-Z]{3}\/[A-Z]{3}$/.test(s))) return 'forex';
  const pair = splitCrypto(flat);
  if (pair && (CRYPTO.has(pair.base) || pair.quote === 'USDT')) return 'crypto';
  if (CRYPTO.has(flat)) return 'crypto';
  if (/^[A-Z.]{1,6}$/.test(flat)) return 'stock';
  return 'unknown';
}

export function resolveSymbol(rawSymbol: string): ResolvedSymbol {
  const raw = clean(rawSymbol);
  const override = readOverrides()[raw];
  const assetClass = classify(raw);
  const flat = raw.replace(/[-_/:]/g, '');
  const pair = splitCrypto(flat);
  const base = pair?.base ?? flat;

  const klineSymbol = assetClass === 'crypto' ? `${base}USDT` : null;

  if (override) {
    return { raw, assetClass, tvSymbol: override, klineSymbol, overridden: true };
  }

  let tvSymbol: string;
  switch (assetClass) {
    case 'crypto': tvSymbol = `BINANCE:${base}USDT`; break;
    case 'forex': tvSymbol = `FX:${flat}`; break;
    case 'futures': tvSymbol = FUTURES[raw] ?? `CME_MINI:${flat}1!`; break;
    case 'index': tvSymbol = INDICES[flat] ?? flat; break;
    case 'stock': tvSymbol = `NASDAQ:${flat}`; break;
    default: tvSymbol = flat;
  }
  return { raw, assetClass, tvSymbol, klineSymbol, overridden: false };
}

/** Candle interval that best frames a trade of the given duration (ms). */
export function pickInterval(durationMs: number): string {
  const m = durationMs / 60000;
  if (!Number.isFinite(m) || m <= 0) return '15m';
  if (m <= 30) return '1m';
  if (m <= 180) return '5m';
  if (m <= 720) return '15m';
  if (m <= 60 * 24 * 3) return '1h';
  if (m <= 60 * 24 * 30) return '4h';
  return '1d';
}

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export type Interval = (typeof INTERVALS)[number];

/** TradingView widget interval codes. */
export const TV_INTERVAL: Record<string, string> = {
  '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D',
};
