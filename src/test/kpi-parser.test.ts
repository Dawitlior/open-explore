import { describe, it, expect } from 'vitest';
import { evalCustomKPI } from '@/hooks/use-dashboard-config';

const ctx = { totalTrades: 10, wins: 6, losses: 4, winRate: 60, totalPnl: 1500, expectancy: 0.4, profitFactor: 1.8 };

describe('evalCustomKPI safe parser', () => {
  it('evaluates arithmetic and functions', () => {
    expect(evalCustomKPI('wins / totalTrades * 100', ctx)).toBe(60);
    expect(evalCustomKPI('Math.round(winRate)', ctx)).toBe(60);
    expect(evalCustomKPI('max(expectancy, 0) * 100', ctx)).toBe(40);
    expect(evalCustomKPI('-(losses) + wins', ctx)).toBe(2);
    expect(evalCustomKPI('(totalPnl / totalTrades)', ctx)).toBe(150);
    expect(evalCustomKPI('pow(2, 3)', ctx)).toBe(8);
    expect(evalCustomKPI('winRate % 7', ctx)).toBe(4);
  });
  it('rejects injection and unsupported syntax', () => {
    expect(evalCustomKPI('expectancy > 0 ? 1 : 0', ctx)).toBeNull();
    expect(evalCustomKPI('process.exit(1)', ctx)).toBeNull();
    expect(evalCustomKPI('constructor.constructor("return 1")()', ctx)).toBeNull();
    expect(evalCustomKPI('winRate; alert(1)', ctx)).toBeNull();
    expect(evalCustomKPI('unknownVar + 1', ctx)).toBeNull();
    expect(evalCustomKPI('sqrt(-1)', ctx)).toBeNull();
    expect(evalCustomKPI('1 / 0', ctx)).toBeNull();
  });
});
