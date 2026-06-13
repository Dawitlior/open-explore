// UIE v1.2 — Phase 2 · Step 5 · Archetype Detector
// Picks the right archetype for a (headers, rows) input.
// Currently routes between A (single-row) and B (open/close pair).
// C (fills aggregation) and D (equity statements) land in Phase 3/4.

import type { CanonicalTrade } from '../canonical-trade';
import { archetypeA, type ArchetypeAResult } from './archetype-a';
import { archetypeB, looksLikeArchetypeB, type ArchetypeBResult } from './archetype-b';
import { archetypeC, type ArchetypeCResult } from './archetype-c';
import { classifyFills } from './fill-classify';

export type ArchetypeKind = 'A' | 'B' | 'C' | 'D' | 'unknown';

export interface DetectResult {
  archetype: ArchetypeKind;
  confidence: number;          // 0..1
  reason: string;
}

export interface RunResult {
  detection: DetectResult;
  trades: CanonicalTrade[];
  warnings: string[];
  source: ArchetypeAResult | ArchetypeBResult | ArchetypeCResult;
}

/**
 * Decide archetype from shape signals only. Pure, side-effect free.
 */
export function detectArchetype(headers: string[], rows: unknown[][]): DetectResult {
  if (!rows.length) return { archetype: 'unknown', confidence: 0, reason: 'empty input' };

  // Archetype C signal: fills classifier returns true.
  const cls = classifyFills(headers, rows);
  if (cls.isFills) {
    return { archetype: 'C', confidence: Math.max(0.7, cls.confidence), reason: `fills detected: ${cls.signals.join(',')}` };
  }

  // Archetype B signal: explicit Open/Close action column with both tokens.
  if (looksLikeArchetypeB(headers, rows)) {
    return { archetype: 'B', confidence: 0.9, reason: 'open/close action column present' };
  }

  // Archetype A default.
  const joined = headers.join(' ').toLowerCase();
  const aHints = ['entry', 'exit', 'pnl', 'symbol', 'ticker', 'מטבע', 'תאריך', 'side', 'r multiple'];
  const hits = aHints.filter((h) => joined.includes(h)).length;
  if (hits >= 2) {
    return { archetype: 'A', confidence: 0.85, reason: `single-row signals (${hits} hints)` };
  }
  if (hits === 1) {
    return { archetype: 'A', confidence: 0.55, reason: 'weak single-row signal' };
  }

  return { archetype: 'unknown', confidence: 0.2, reason: 'no clear trade-table signals' };
}

/**
 * One-stop runner: detect + execute. Use this from xlsx-engine.
 */
export function runUIE(headers: string[], rows: unknown[][]): RunResult {
  const detection = detectArchetype(headers, rows);

  if (detection.archetype === 'C') {
    const res = archetypeC(headers, rows);
    return { detection, trades: res.trades, warnings: res.warnings, source: res };
  }
  if (detection.archetype === 'B') {
    const res = archetypeB(headers, rows);
    return { detection, trades: res.trades, warnings: res.warnings, source: res };
  }
  const res = archetypeA(headers, rows);
  return { detection, trades: res.trades, warnings: res.warnings, source: res };
}
