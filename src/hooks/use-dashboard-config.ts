import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

export type WidgetId =
  | 'equity-curve'
  | 'pnl-bars'
  | 'r-distribution'
  | 'orca-radar'
  | 'direction-pie'
  | 'confidence-scatter'
  | 'drawdown'
  | 'win-rate'
  | 'expectancy'
  | 'profit-factor';

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

export interface CustomKPI {
  id: string;
  label: string;
  // Formula uses tokens: totalTrades, wins, losses, winRate, totalPnl,
  // avgWin, avgLoss, expectancy, profitFactor, maxDrawdown, totalR
  formula: string;
  format: 'number' | 'currency' | 'percent' | 'r-multiple';
  color?: string;
}

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'equity-curve', visible: true },
  { id: 'pnl-bars', visible: true },
  { id: 'r-distribution', visible: true },
  { id: 'orca-radar', visible: true },
  { id: 'direction-pie', visible: true },
  { id: 'confidence-scatter', visible: true },
  { id: 'drawdown', visible: true },
];

const DEFAULT_KPIS: CustomKPI[] = [];

export const WIDGET_LABELS: Record<WidgetId, { he: string; en: string }> = {
  'equity-curve': { he: 'עקומת הון', en: 'Equity Curve' },
  'pnl-bars': { he: 'P&L יומי', en: 'Daily P&L' },
  'r-distribution': { he: 'התפלגות R', en: 'R-Distribution' },
  'orca-radar': { he: 'Orca Radar', en: 'Orca Radar' },
  'direction-pie': { he: 'Long/Short', en: 'Direction Pie' },
  'confidence-scatter': { he: 'ביטחון מול תוצאה', en: 'Confidence vs Outcome' },
  'drawdown': { he: 'Drawdown', en: 'Drawdown' },
  'win-rate': { he: 'אחוז זכייה', en: 'Win Rate' },
  'expectancy': { he: 'תוחלת', en: 'Expectancy' },
  'profit-factor': { he: 'Profit Factor', en: 'Profit Factor' },
};

export function useDashboardConfig() {
  const [layout, setLayoutState] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [kpis, setKpisState] = useState<CustomKPI[]>(DEFAULT_KPIS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting<WidgetConfig[]>('dashboardLayout'),
      getSetting<CustomKPI[]>('customKpis'),
    ]).then(([l, k]) => {
      if (l && Array.isArray(l) && l.length > 0) {
        // Merge: keep saved order/visibility, add any new defaults missing
        const savedIds = new Set(l.map(w => w.id));
        const merged = [...l, ...DEFAULT_LAYOUT.filter(w => !savedIds.has(w.id))];
        setLayoutState(merged);
      }
      if (k && Array.isArray(k)) setKpisState(k);
      setLoaded(true);
    });
  }, []);

  const setLayout = useCallback((l: WidgetConfig[]) => {
    setLayoutState(l);
    setSetting('dashboardLayout', l);
  }, []);

  const setKpis = useCallback((k: CustomKPI[]) => {
    setKpisState(k);
    setSetting('customKpis', k);
  }, []);

  const toggleWidget = useCallback((id: WidgetId) => {
    setLayoutState(prev => {
      const next = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
      setSetting('dashboardLayout', next);
      return next;
    });
  }, []);

  const moveWidget = useCallback((fromIdx: number, toIdx: number) => {
    setLayoutState(prev => {
      if (fromIdx < 0 || fromIdx >= prev.length || toIdx < 0 || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setSetting('dashboardLayout', next);
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayoutState(DEFAULT_LAYOUT);
    setSetting('dashboardLayout', DEFAULT_LAYOUT);
  }, []);

  const isWidgetVisible = useCallback((id: WidgetId) => {
    const w = layout.find(x => x.id === id);
    return w ? w.visible : true;
  }, [layout]);

  return {
    layout, setLayout, toggleWidget, moveWidget, resetLayout, isWidgetVisible,
    kpis, setKpis,
    loaded,
  };
}

// Safe formula evaluator — recursive-descent parser, NO code execution.
// Supports: numbers, whitelisted variables, + - * / % , parentheses, unary
// minus, and the math functions abs/min/max/round/floor/ceil/sqrt/pow
// (bare or Math.-prefixed). Anything else evaluates to null.
// Returns null on any error.
const KPI_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  pow: Math.pow,
};

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: string };

function tokenizeFormula(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = src.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);
      if (!m) return null;
      tokens.push({ kind: 'num', value: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const m = src.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (!m) return null;
      tokens.push({ kind: 'ident', name: m[0] });
      i += m[0].length;
      continue;
    }
    if ('+-*/%(),.'.includes(ch)) {
      tokens.push({ kind: 'op', op: ch });
      i++;
      continue;
    }
    return null; // any other character rejects the formula outright
  }
  return tokens;
}

export function evalCustomKPI(formula: string, ctx: Record<string, number>): number | null {
  try {
    if (!formula || formula.length > 500) return null;
    const tokens = tokenizeFormula(formula);
    if (!tokens) return null;

    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    const parseExpr = (): number => {
      let v = parseTerm();
      while (peek()?.kind === 'op' && ((peek() as { op: string }).op === '+' || (peek() as { op: string }).op === '-')) {
        const op = (next() as { op: string }).op;
        const rhs = parseTerm();
        v = op === '+' ? v + rhs : v - rhs;
      }
      return v;
    };

    const parseTerm = (): number => {
      let v = parseUnary();
      while (peek()?.kind === 'op' && ['*', '/', '%'].includes((peek() as { op: string }).op)) {
        const op = (next() as { op: string }).op;
        const rhs = parseUnary();
        v = op === '*' ? v * rhs : op === '/' ? v / rhs : v % rhs;
      }
      return v;
    };

    const parseUnary = (): number => {
      const t = peek();
      if (t?.kind === 'op' && t.op === '-') { next(); return -parseUnary(); }
      if (t?.kind === 'op' && t.op === '+') { next(); return parseUnary(); }
      return parsePrimary();
    };

    const parsePrimary = (): number => {
      const t = next();
      if (!t) throw new Error('unexpected end');
      if (t.kind === 'num') return t.value;
      if (t.kind === 'op' && t.op === '(') {
        const v = parseExpr();
        const close = next();
        if (!close || close.kind !== 'op' || close.op !== ')') throw new Error('missing )');
        return v;
      }
      if (t.kind === 'ident') {
        // Math.foo( — consume the dot-qualified name
        let name = t.name;
        if (name === 'Math') {
          const dot = next();
          const member = next();
          if (dot?.kind !== 'op' || dot.op !== '.' || member?.kind !== 'ident') throw new Error('bad Math ref');
          name = member.name;
        }
        const paren = peek();
        if (paren?.kind === 'op' && paren.op === '(') {
          next();
          const fn = KPI_FUNCTIONS[name];
          if (!fn) throw new Error('unknown fn');
          const args: number[] = [];
          if (!(peek()?.kind === 'op' && (peek() as { op: string }).op === ')')) {
            for (;;) {
              args.push(parseExpr());
              const sep = next();
              if (sep?.kind === 'op' && sep.op === ',') continue;
              if (sep?.kind === 'op' && sep.op === ')') break;
              throw new Error('bad args');
            }
          } else {
            next();
          }
          return fn(...args);
        }
        if (name in ctx) return ctx[name];
        throw new Error('unknown ident');
      }
      throw new Error('unexpected token');
    };

    const result = parseExpr();
    if (pos !== tokens.length) return null; // trailing garbage
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
