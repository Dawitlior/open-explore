// UIE v1.2 — Phase 2 · Step 3 · Archetype A · Single-row trade
// Each input row = one complete (closed) trade. The simplest and most common
// import shape. Combines: Phase 1 header matching → Phase 2 content profiling
// → value normalization → CanonicalTrade.

import type { CanonicalField, CanonicalTrade, MatchResult } from '../canonical-trade';
import { mapHeaderToField } from '../matching/tiers';
import { profileColumn, confirmsPendingField, type ContentProfile } from '../content/profile';
import {
  normalizeNumber,
  normalizePercent,
  normalizeRMultiple,
  normalizeDirection,
  normalizeDateColumn,
  isNull,
} from '../content/normalize-values';

export interface ColumnPlan {
  rawHeader: string;
  index: number;
  match: MatchResult;
  profile: ContentProfile;
  finalField: CanonicalField | null;     // null = dropped (unmapped or unconfirmed)
  reason?: 'unmapped' | 'content_rejected' | 'mapped' | 'pending_unresolved';
}

export interface ArchetypeAResult {
  trades: CanonicalTrade[];
  plan: ColumnPlan[];
  warnings: string[];                    // e.g. date_conflict, date_ambiguous
  diagnostics: {
    totalRows: number;
    mappedColumns: number;
    droppedColumns: number;
    dateColumns: number;
  };
}

type Cell = unknown;
type Row = Cell[];

const PENDING_FIELDS = new Set<CanonicalField>(['rMultiple', 'riskAmount', 'riskPct', 'returnPct']);

/**
 * Build a column-by-column plan: header match + content profile + final field decision.
 */
export function planColumns(headers: string[], rows: Row[]): ColumnPlan[] {
  return headers.map((rawHeader, index) => {
    const columnValues = rows.map((r) => r?.[index]);
    const match = mapHeaderToField(rawHeader);
    const profile = profileColumn(columnValues, rawHeader);

    let finalField: CanonicalField | null = match.field;
    let reason: ColumnPlan['reason'] = 'mapped';

    if (!match.field) {
      finalField = null;
      reason = 'unmapped';
    } else if (match.status === 'pending-content') {
      // pending field — confirm via content profile
      const pending = match.field as 'rMultiple' | 'riskAmount' | 'riskPct' | 'returnPct';
      if (confirmsPendingField(pending, profile)) {
        finalField = match.field;
        reason = 'mapped';
      } else {
        finalField = null;
        reason = 'content_rejected';
      }
    }

    // Defensive: if engine returned a pending field but didn't flag it, still
    // require profile confirmation.
    if (finalField && PENDING_FIELDS.has(finalField) && match.status !== 'pending-content') {
      const pending = finalField as 'rMultiple' | 'riskAmount' | 'riskPct' | 'returnPct';
      if (!confirmsPendingField(pending, profile)) {
        finalField = null;
        reason = 'pending_unresolved';
      }
    }

    return { rawHeader, index, match, profile, finalField, reason };
  });
}

/**
 * Normalize a single cell based on its column's resolved type.
 */
function normalizeCell(
  field: CanonicalField,
  value: Cell,
  profile: ContentProfile,
): unknown {
  if (isNull(value)) return null;

  // Direction
  if (field === 'direction') return normalizeDirection(value);

  // Symbol / textual passthroughs
  if (field === 'symbol' || field === 'orderType' || field === 'comments' ||
      field === 'status' || field === 'externalId' || field === 'durationStr') {
    return String(value).trim();
  }

  // Boolean-ish: liquidated
  if (field === 'liquidated') {
    const s = String(value).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'נוזל' || s === 'כן';
  }

  // Percent-like fields
  if (field === 'riskPct' || field === 'returnPct') {
    return normalizePercent(value);
  }

  // R-multiple
  if (field === 'rMultiple') return normalizeRMultiple(value);

  // Numeric default (prices, sizes, pnl, fees, leverage, balance, mfe, mae, risk amount, etc.)
  return normalizeNumber(value);
}

/**
 * Convert a 2D table (headers + rows) into CanonicalTrade[] via Archetype A.
 */
export function archetypeA(headers: string[], rows: Row[]): ArchetypeAResult {
  const plan = planColumns(headers, rows);
  const warnings: string[] = [];

  // Pre-normalize date columns (one-pass detection per column).
  const dateColumnIdx = new Map<number, { fmtFlag?: string; values: (string | null)[] }>();
  for (const p of plan) {
    if (!p.finalField) continue;
    const isDateField = p.finalField === 'date' || p.finalField === 'entryDate' || p.finalField === 'exitDate' || p.finalField === 'time';
    if (!isDateField) continue;
    const colValues = rows.map((r) => r?.[p.index]);
    const det = normalizeDateColumn(colValues);
    dateColumnIdx.set(p.index, { fmtFlag: det.flag, values: det.values });
    if (det.flag) warnings.push(`Column "${p.rawHeader}" → ${det.flag}`);
  }

  const trades: CanonicalTrade[] = [];

  rows.forEach((row, rowIdx) => {
    const trade: CanonicalTrade = { rowIndex: rowIdx + 1 };
    let hasAnyValue = false;

    for (const p of plan) {
      if (!p.finalField) continue;
      const raw = row?.[p.index];

      let value: unknown;
      const dateCol = dateColumnIdx.get(p.index);
      if (dateCol) {
        value = dateCol.values[rowIdx];
      } else {
        value = normalizeCell(p.finalField, raw, p.profile);
      }

      if (value !== null && value !== undefined && value !== '') {
        trade[p.finalField] = value;
        hasAnyValue = true;
      }
    }

    if (hasAnyValue) trades.push(trade);
  });

  return {
    trades,
    plan,
    warnings,
    diagnostics: {
      totalRows: rows.length,
      mappedColumns: plan.filter((p) => p.finalField).length,
      droppedColumns: plan.filter((p) => !p.finalField).length,
      dateColumns: dateColumnIdx.size,
    },
  };
}
