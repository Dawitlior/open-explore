import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/lib/display-mode', () => ({ useEffectiveDisplayMode: () => ({ isR: false }) }));

import { CalendarZoomProvider } from '@/components/calendar/CalendarZoomProvider';
import { YearView } from '@/components/calendar/views/YearView';
import { getTheme } from '@/lib/trading-theme';

const trades = [{
  id: 1, date: '2026-02-03 10:00', day: 'Tue', coin: 'BTC', direction: 'Long' as const,
  orderType: 'Market', entry: 1, stopLoss: 0.9, exit: 1.2, returnR: 1, winLoss: 'Win' as const,
  risk: 1, expectedLoss: 1, pnl: 100, deviation: 0, positionSize: 1, leverage: 1,
  balance: 100, riskPct: 1, rules: true, comments: '',
}, {
  id: 2, date: '2026-02-10 10:00', day: 'Tue', coin: 'BTC', direction: 'Long' as const,
  orderType: 'Market', entry: 1, stopLoss: 0.9, exit: 0.8, returnR: -1, winLoss: 'Loss' as const,
  risk: 1, expectedLoss: 1, pnl: -80, deviation: 0, positionSize: 1, leverage: 1,
  balance: 20, riskPct: 1, rules: true, comments: '',
}];

describe('YearView mobile grid', () => {
  it('uses two-column-capable mobile grid and keeps trade dots in-cell', () => {
    render(
      <CalendarZoomProvider defaultZoom="year">
        <YearView T={getTheme('midnight')} isRTL trades={trades} year={2026} />
      </CalendarZoomProvider>
    );

    const grid = screen.getByText('ינואר').parentElement?.parentElement as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain('160px');
    expect(grid.style.gridTemplateColumns).toContain('auto-fit');

    const feb3 = screen.getByTitle(/3: \+\$100/);
    expect(feb3.style.overflow).toBe('hidden');
    const dot = feb3.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.width).toBe('3px');
    expect(dot.style.bottom).toBe('1px');
  });
});
