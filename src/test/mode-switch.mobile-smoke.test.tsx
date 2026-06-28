import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/hooks/use-entitlement', () => ({
  useEntitlement: () => ({
    tier: 'standard',
    loading: false,
    allows: (required: string) => required === 'standard',
  }),
}));

describe('ModeSwitch mobile touch smoke', () => {
  beforeEach(() => {
    localStorage.removeItem('orca:tier-preview');
    vi.useFakeTimers();
  });

  it('opens above settings and switches tier from touch pointer events', async () => {
    const { ModeSwitch } = await import('@/components/trading/ModeSwitch');
    const { getTheme } = await import('@/lib/trading-theme');

    render(<ModeSwitch T={getTheme('midnight')} isRTL />);

    const touchUp = (el: HTMLElement) => {
      const event = new Event('pointerup', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      fireEvent(el, event);
    };

    await act(async () => touchUp(screen.getByRole('button', { name: 'אולטימייט' })));
    const confirm = screen.getByRole('button', { name: 'אישור החלפה' });

    const zIndexes = Array.from(document.body.querySelectorAll('div'))
      .map((el) => Number((el as HTMLElement).style.zIndex || 0))
      .filter(Boolean);
    expect(Math.max(...zIndexes)).toBeGreaterThan(9999);

    await act(async () => touchUp(confirm));
    await act(async () => { vi.advanceTimersByTime(1300); });

    expect(localStorage.getItem('orca:tier-preview')).toBe('ultimate');
  });
});