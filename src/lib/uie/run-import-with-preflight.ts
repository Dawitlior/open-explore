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
  /** Stage 2: re-run the engine with user mapping overrides (columnIndex → field|null). */
  rerun: (overrides: Record<number, string | null>) => Promise<ImportResult>;
  resolve: (decision: { confirm: boolean; result?: ImportResult }) => void;
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

  console.info('[UIE] runImportWithPreflight: start', { file: file.name, size: file.size, brokerId });

  let sheets;
  try {
    const t0 = performance.now();
    sheets = await fileToSheets(file);
    console.info('[UIE] fileToSheets: done', { sheets: sheets.length, ms: Math.round(performance.now() - t0), shapes: sheets.map((s) => ({ name: s.name, rows: s.matrix.length, cols: s.matrix[0]?.length || 0 })) });
  } catch (e) {
    console.error('[UIE] fileToSheets: failed', e);
    return { ok: false, drafts: [], equityPointsAdded: 0, result: null, reason: e instanceof Error ? e.message : 'file_read_failed' };
  }

  let result: ImportResult;
  try {
    const t1 = performance.now();
    result = runImport(sheets);
    console.info('[UIE] runImport: done', {
      ms: Math.round(performance.now() - t1),
      trades: result.trades.length,
      equityEvents: result.equityEvents.length,
      readiness: result.gap?.readiness,
      archetype: result.archetype,
      sheet: result.sheetName,
    });
  } catch (e) {
    console.error('[UIE] runImport: failed', e);
    return { ok: false, drafts: [], equityPointsAdded: 0, result: null, reason: e instanceof Error ? e.message : 'engine_failed' };
  }

  // Open the modal and await user decision.
  console.info('[UIE] dispatching orca:uie:preflight — awaiting user decision');
  // Signal the caller's loading overlay can step aside so the modal is visible.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orca:uie:preflight-will-open'));
  }
  // Stage 2: user may re-run engine with mapping overrides; latest result wins.
  let currentResult: ImportResult = result;
  const rerun = async (overrides: Record<number, string | null>): Promise<ImportResult> => {
    const t = performance.now();
    const next = runImport(sheets, { mappingOverrides: overrides });
    console.info('[UIE] rerun: done', { ms: Math.round(performance.now() - t), trades: next.trades.length, readiness: next.gap?.readiness });
    currentResult = next;
    return next;
  };

  const decision = await new Promise<{ confirm: boolean; result?: ImportResult }>((resolve) => {
    const detail: PreflightOpenDetail = { fileName: file.name, brokerId, result, rerun, resolve };
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent<PreflightOpenDetail>('orca:uie:preflight', { detail }));
      }, 0);
    } else {
      resolve({ confirm: false });
    }
  });
  console.info('[UIE] preflight resolved', { confirm: decision.confirm, hasResult: !!decision.result });
  if (decision.result) currentResult = decision.result;

  if (!decision.confirm) {
    return { ok: false, drafts: [], equityPointsAdded: 0, result: currentResult, reason: 'user_cancelled' };
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
