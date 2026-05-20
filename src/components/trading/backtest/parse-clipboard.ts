/**
 * Smart Clipboard Parser — turns arbitrary pasted text into a partial
 * backtest draft. Handles:
 *
 *  1. TradingView "Long/Short Position" tool screen-copy lines
 *       Entry Price: 64250    Stop Loss: 63800    Target/Profit: 65700
 *  2. Loose key:value lines  (entry=64250, sl: 63800, exit 65700, mfe 66100)
 *  3. Symbol tokens          (BTC, BTCUSDT, BINANCE:BTCUSDT, BTC/USDT)
 *  4. Bare numbers           (3-5 numbers → entry/sl/exit[/mfe/mae])
 *
 * Pure + isolated — easy to unit-test, and the same shape is consumed by
 * both the manual adapter today and the TradingView Library adapter later.
 */

import { normalizeSymbol } from './tv-mapping';

export interface ParsedCapture {
  coin?: string;
  entry?: string;
  sl?: string;
  exit?: string;
  mfeP?: string;
  maeP?: string;
  /** How confident the parser is (0..1). Drives UI hint. */
  confidence: number;
  /** Human label for the matched format — shown as a toast. */
  source: string;
}

const NUM = /-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/g;

const clean = (s: string) => s.replace(/[,\s](?=\d{3}\b)/g, '').trim();

const KEY_MAP: Record<string, keyof ParsedCapture> = {
  entry: 'entry', enter: 'entry', long: 'entry', short: 'entry', buy: 'entry', sell: 'entry', open: 'entry', 'entry price': 'entry',
  sl: 'sl', stop: 'sl', 'stop loss': 'sl', 'stop-loss': 'sl', stoploss: 'sl', risk: 'sl',
  exit: 'exit', close: 'exit', target: 'exit', tp: 'exit', 'take profit': 'exit', 'take-profit': 'exit', profit: 'exit', 'target price': 'exit',
  mfe: 'mfeP', 'max favorable': 'mfeP', high: 'mfeP', best: 'mfeP',
  mae: 'maeP', 'max adverse': 'maeP', low: 'maeP', worst: 'maeP',
  symbol: 'coin', coin: 'coin', ticker: 'coin', pair: 'coin', asset: 'coin',
};

const SYMBOL_RE = /\b([A-Z]{2,6}):?([A-Z0-9]{2,10}?)(?:USDT|USDC|USD|PERP|\.P)?\b/g;

export function parseClipboard(raw: string): ParsedCapture {
  if (!raw || !raw.trim()) return { confidence: 0, source: 'empty' };
  const out: ParsedCapture = { confidence: 0, source: 'unknown' };
  const text = raw.replace(/\u00A0/g, ' ').trim();

  // ── 1. key:value pairs (highest confidence) ──
  const kvHits = new Set<keyof ParsedCapture>();
  // Match  key  separator  number   (separator = : = → or whitespace)
  const lines = text.split(/[\n,;|]+/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z\s\-]{0,18}?)\s*[:=>→\s]+\s*([\-\d.,\s]+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase().trim();
    const mapped = KEY_MAP[key];
    if (!mapped) continue;
    const numMatch = m[2].match(NUM);
    if (!numMatch) continue;
    const val = clean(numMatch[0]);
    if (mapped === 'coin') {
      out.coin = normalizeSymbol(m[2].trim()) || m[2].trim().toUpperCase();
    } else {
      (out as any)[mapped] = val;
    }
    kvHits.add(mapped);
  }

  if (kvHits.size >= 3) {
    out.confidence = Math.min(1, 0.6 + kvHits.size * 0.1);
    out.source = `key:value (${kvHits.size} fields)`;
  } else if (kvHits.size > 0) {
    out.confidence = 0.5;
    out.source = `partial key:value (${kvHits.size})`;
  }

  // ── 2. symbol fallback ──
  if (!out.coin) {
    const symMatch = text.match(SYMBOL_RE);
    if (symMatch && symMatch.length) {
      const first = symMatch[0];
      const norm = normalizeSymbol(first);
      if (norm && norm.length >= 2 && norm.length <= 8 && !/^\d+$/.test(norm)) {
        out.coin = norm;
        if (out.confidence < 0.3) out.confidence = 0.3;
      }
    }
  }

  // ── 3. bare numbers fallback ──
  if (!out.entry || !out.sl || !out.exit) {
    const nums = (text.match(NUM) || [])
      .map(clean)
      .map((n) => parseFloat(n))
      .filter((n) => isFinite(n) && Math.abs(n) > 0);
    if (nums.length >= 3 && kvHits.size === 0) {
      // Assume order: entry, sl, exit  (and optionally mfe, mae)
      out.entry = String(nums[0]);
      out.sl = String(nums[1]);
      out.exit = String(nums[2]);
      if (nums[3] != null) out.mfeP = String(nums[3]);
      if (nums[4] != null) out.maeP = String(nums[4]);
      out.confidence = 0.45;
      out.source = `${nums.length} bare numbers`;
    }
  }

  return out;
}

/** Read clipboard text safely (returns '' on permission denial). */
export async function readClipboardText(): Promise<string> {
  try {
    if (navigator?.clipboard?.readText) return await navigator.clipboard.readText();
  } catch {
    /* user denied — fall through */
  }
  return '';
}
