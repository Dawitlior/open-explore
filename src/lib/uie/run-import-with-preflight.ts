/**
 * runImportWithPreflight — orchestrator hooked from the two upload entry points
 * (Index.tsx XLSX/JSON button and ExchangesPanel.tsx CSV tile).
 *
 * Flow:
 *   1. fileToSheets(file) → SheetInput[]
 *   2. runImport(sheets)  → ImportResult (pure)
 *   3. dispatch 'orca:uie:preflight' with the result + callbacks → modal opens
 *   4. modal resolves with { confirm: true } → caller persists trades and equity points
 *
 * The engine core is never touched. Only this wrapper + the modal know each other.
 */

import { runImport } from './pipeline';
import { fileToSheets } from './io';
import { toLegacyTrade, toEquityPoints, type LegacyTradeDraft } from './adapters/to-journal';
import { mergeEquityPoints } from './equity-store';
import type { ImportResult } from './types';

export interface PreflightOpenDetail {
  fileName: string;
  brokerId: string;
  result: ImportResult;
  resolve: (decision: { confirm: boolean }) => void;
}

export interface PreflightOutcome {
  ok: boolean;
  drafts: LegacyTradeDraft[];
  equityPointsAdded: number;
  result: ImportResult | null;
  reason?: string;
}

/**
 * Read the file, run the engine, open the Preflight modal, and — only on confirm —
 * return drafts ready for `useTrades.importTrades(...)` plus persist file equity points.
 */
export async function runImportWithPreflight(
  file: File,
  opts: { brokerId?: string; accountLabel?: string | null } = {},
): Promise<PreflightOutcome> {
  const brokerId = opts.brokerId || 'import';
  const accountLabel = opts.accountLabel ?? null;

  let sheets;
  try {
    sheets = await fileToSheets(file);
  } catch (e) {
    return { ok: false, drafts: [], equityPointsAdded: 0, result: null, reason: e instanceof Error ? e.message : 'file_read_failed' };
  }

  let result: ImportResult;
  try {
    result = runImport(sheets);
  } catch (e) {
    return { ok: false, drafts: [], equityPointsAdded: 0, result: null, reason: e instanceof Error ? e.message : 'engine_failed' };
  }

  // Open the modal and await user decision.
  const decision = await new Promise<{ confirm: boolean }>((resolve) => {
    const detail: PreflightOpenDetail = { fileName: file.name, brokerId, result, resolve };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<PreflightOpenDetail>('orca:uie:preflight', { detail }));
    } else {
      resolve({ confirm: false });
    }
  });

  if (!decision.confirm) {
    return { ok: false, drafts: [], equityPointsAdded: 0, result, reason: 'user_cancelled' };
  }

  const drafts = result.trades.map((t) => toLegacyTrade(t, { brokerId, accountLabel }));
  const eqPoints = toEquityPoints(result.equityEvents);
  let added = 0;
  if (eqPoints.length > 0) {
    const merged = mergeEquityPoints(eqPoints);
    added = eqPoints.length;
    // log for trace; merged length tells the post-merge total
    if (typeof console !== 'undefined') console.info('[UIE] equity points merged:', { added, total: merged.length });
  }

  return { ok: true, drafts, equityPointsAdded: added, result };
}
