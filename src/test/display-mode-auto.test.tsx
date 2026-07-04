import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DisplayModeProvider, useDisplayMode, useEffectiveDisplayMode, autoPickMode } from '@/lib/display-mode';

const rTrade = (id: number) => ({ id, date:'2025-01-01', day:'Mon', coin:'X', direction:'Long' as const, orderType:'Market', entry:100, stopLoss:95, exit:110, returnR:2, winLoss:'Win' as const, risk:5, expectedLoss:5, pnl:10, deviation:0, positionSize:1, leverage:1, balance:1000, riskPct:0.5, rules:true, comments:'' });
const mTrade = (id: number) => ({ ...rTrade(id), stopLoss: null as any });

describe('autoPickMode', () => {
  it('R when R majority', () => {
    const t = [rTrade(1), rTrade(2), rTrade(3), mTrade(4)];
    expect(autoPickMode(t)).toBe('R_MULTIPLE');
  });
  it('MONEY when money majority', () => {
    const t = [rTrade(1), mTrade(2), mTrade(3), mTrade(4)];
    expect(autoPickMode(t)).toBe('MONEY');
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
});

describe('useEffectiveDisplayMode follows trades', () => {
  it('reflects majority even without provider', () => {
    const { result, rerender } = renderHook(({ trades }: any) => useEffectiveDisplayMode(trades), { initialProps: { trades: [rTrade(1), rTrade(2)] as any[] } });
    expect(result.current.isR).toBe(true);
    rerender({ trades: [rTrade(1), mTrade(2), mTrade(3), mTrade(4)] });
    expect(result.current.isMoney).toBe(true);
  });
});
