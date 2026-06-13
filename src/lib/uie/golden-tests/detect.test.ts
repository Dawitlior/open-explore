// UIE v1.2 — Phase 2 · Step 5 · Detector tests
import { describe, it, expect } from 'vitest';
import { detectArchetype, runUIE } from '../archetypes/detect';

describe('detectArchetype', () => {
  it('picks A for single-row trade tables', () => {
    const d = detectArchetype(
      ['Date', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL'],
      [['2024-03-15', 'BTC', 'Long', '50000', '52000', '200']],
    );
    expect(d.archetype).toBe('A');
  });

  it('picks B when Action column has Open + Close', () => {
    const d = detectArchetype(
      ['Date', 'Action', 'Symbol', 'Side', 'Entry', 'Exit'],
      [
        ['2024-03-15 10:00', 'Open',  'BTC', 'Long', '50000', ''],
        ['2024-03-15 14:00', 'Close', 'BTC', 'Long', '', '52000'],
      ],
    );
    expect(d.archetype).toBe('B');
  });

  it('returns unknown for empty input', () => {
    expect(detectArchetype([], []).archetype).toBe('unknown');
  });
});

describe('runUIE', () => {
  it('runs the A pipeline end-to-end', () => {
    const r = runUIE(
      ['Date', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL'],
      [['2024-03-15', 'BTC', 'Long', '50000', '52000', '200']],
    );
    expect(r.detection.archetype).toBe('A');
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].symbol).toBe('BTC');
  });

  it('runs the B pipeline end-to-end', () => {
    const r = runUIE(
      ['Date', 'Action', 'Symbol', 'Side', 'Entry', 'Exit', 'PnL'],
      [
        ['2024-03-15 10:00', 'Open',  'BTC', 'Long', '50000', '',      ''],
        ['2024-03-15 14:00', 'Close', 'BTC', 'Long', '',      '52000', '200'],
      ],
    );
    expect(r.detection.archetype).toBe('B');
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].entry).toBe(50000);
    expect(r.trades[0].exit).toBe(52000);
  });
});
