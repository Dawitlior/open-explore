import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DisplayModeProvider, useDisplayMode, useEffectiveDisplayMode, autoPickMode } from '@/lib/display-mode';
import { sanitizeTrade } from '@/lib/trade-sanitizer';

const rTrade = (id: number) => ({ id, date:'2025-01-01', day:'Mon', coin:'X', direction:'Long' as const, orderType:'Market', entry:100, stopLoss:95, exit:110, returnR:2, winLoss:'Win' as const, risk:5, expectedLoss:5, pnl:10, deviation:0, positionSize:1, leverage:1, balance:1000, riskPct:0.5, rules:true, comments:'' });
const mTrade = (id: number) => ({ ...rTrade(id), stopLoss: null as any, returnR: 0 });
const rOnlyTrade = (id: number) => ({ ...mTrade(id), pnl: 0, risk: 0, returnR: 0, manual_r_multiple: id % 2 ? 1.35 : -0.8, manualR: id % 2 ? 1.35 : -0.8 });

describe('autoPickMode', () => {
  it('R when R majority', () => {
    const t = [rTrade(1), rTrade(2), rTrade(3), mTrade(4)];
    expect(autoPickMode(t)).toBe('R_MULTIPLE');
  });
  it('MONEY when money majority', () => {
    const t = [rTrade(1), mTrade(2), mTrade(3), mTrade(4)];
    expect(autoPickMode(t)).toBe('MONEY');
  });
  it('R when trades are R-only manual values without stop-loss or money PnL', () => {
    const t = [rOnlyTrade(1), rOnlyTrade(2), rOnlyTrade(3)];
    expect(autoPickMode(t as any)).toBe('R_MULTIPLE');
  });
});

describe('provider follows trade majority on change', () => {
  it('flips to MONEY when trades change to money majority', () => {
    let trades: any[] = [rTrade(1), rTrade(2)];
    const wrapper = ({ children }: any) => <DisplayModeProvider trades={trades}>{children}</DisplayModeProvider>;
    const { result, rerender } = renderHook(() => useDisplayMode(), { wrapper });
    expect(result.current.displayMode).toBe('R_MULTIPLE');
    trades = [rTrade(1), mTrade(2), mTrade(3), mTrade(4)];
    rerender();
    expect(result.current.displayMode).toBe('MONEY');
  });

  it('keeps a manual R choice after provider remount/refresh', () => {
    localStorage.clear();
    sessionStorage.clear();
    const trades: any[] = [rTrade(1), rTrade(2), rTrade(3), mTrade(4)];
    const wrapper = ({ children }: any) => <DisplayModeProvider trades={trades}>{children}</DisplayModeProvider>;
    const first = renderHook(() => useDisplayMode(), { wrapper });
    act(() => first.result.current.setDisplayMode('MONEY'));
    expect(first.result.current.displayMode).toBe('MONEY');
    first.unmount();

    const second = renderHook(() => useDisplayMode(), { wrapper });
    expect(second.result.current.displayMode).toBe('MONEY');
    act(() => second.result.current.setDisplayMode('R_MULTIPLE'));
    second.unmount();

    const refreshed = renderHook(() => useDisplayMode(), { wrapper });
    expect(refreshed.result.current.displayMode).toBe('R_MULTIPLE');
  });
});

describe('useEffectiveDisplayMode follows trades', () => {
  it('reflects majority even without provider', () => {
    const { result, rerender } = renderHook(({ trades }: any) => useEffectiveDisplayMode(trades), { initialProps: { trades: [rTrade(1), rTrade(2)] as any[] } });
    expect(result.current.isR).toBe(true);
    rerender({ trades: [rTrade(1), mTrade(2), mTrade(3), mTrade(4)] });
    expect(result.current.isMoney).toBe(true);
  });

  it('stays R after refresh/hydration for sanitized R-only imports', () => {
    const hydrated = [1, 2, 3].map(id => sanitizeTrade(rOnlyTrade(id), id));
    const { result } = renderHook(() => useEffectiveDisplayMode(hydrated as any));
    expect(result.current.displayMode).toBe('R_MULTIPLE');
  });
});
