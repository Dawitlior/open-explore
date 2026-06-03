// Weekly Review — shared types (native rebuild).
// Mirrors the legacy iframe app's data shapes 1:1 so monthly archive
// snapshots survive the migration. Do not rename fields casually.

import type { Trade } from '@/data/trades';

export type WeekGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Setup {
  /** Stable id (uuid or timestamp) — used as React key. */
  id: string;
  /** Display name; doubles as the join key on trades[].setup. */
  name: string;
  /** Hex color for charts / borders. */
  color: string;
  /** Free-text rules / checklist. */
  rules?: string;
  createdAt: string; // ISO
}

export interface MindsetSnapshot {
  focus: number;        // 1-10
  confidence: number;   // 1-10
  discipline: number;   // 1-10
  emotion?: string;     // free text
  notes?: string;
}

export interface WeekRecord {
  /** Friday ISO date that closed the week (YYYY-MM-DD). */
  weekEndingISO: string;
  /** ISO week key, e.g. "2026-W23" — derived but stored for cheap grouping. */
  weekKey: string;
  /** Snapshot of all trades that belong to the week. */
  tradeLog: Trade[];
  /** Net R for the week (sum of returnR). */
  netR: number;
  /** Win count for the week. */
  wins: number;
  /** Loss count for the week. */
  losses: number;
  /** Grade A+ … F. */
  grade: WeekGrade;
  /** Mindset snapshot captured at close-week. */
  mindset?: MindsetSnapshot;
  /** Free-text weekly reflection. */
  reflection?: string;
  /** ISO timestamp of the close-week action. */
  closedAt: string;
  /** Optional, manually edited later. */
  editedAt?: string;
}

export interface MonthSummary {
  monthKey: string;        // "2026-06"
  netR: number;
  trades: number;
  wins: number;
  losses: number;
  bestWeekKey?: string;
  worstWeekKey?: string;
}

export interface MonthlyRecap {
  monthKey: string;
  markdown: string;
  updatedAt: string;
}

export interface WeeklyReviewState {
  archive: WeekRecord[];
  setups: Setup[];
  recaps: Record<string, MonthlyRecap>;
}
