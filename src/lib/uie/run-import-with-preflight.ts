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
import { computeFingerprint, loadFingerprint, saveFingerprint } from './fingerprint';
import type { ImportResult } from './types';
import {
  getActivePortfolioIdGlobal,
  isActivePortfolioLockedGlobal,
} from '@/lib/active-portfolio-store';

export interface PreflightTargetPortfolio {
  id: string;
  name?: string | null;
  color?: string | null;
  currency?: string | null;
}

export interface PreflightOpenDetail {
  fileName: string;
  brokerId: string;
  result: ImportResult;
  /** Stage 2: re-run the engine with user mapping overrides (columnIndex → field|null). */
  rerun: (overrides: Record<number, string | null>) => Promise<ImportResult>;
  /** Stage 3: overrides remembered from a previous import of the same file shape. */
  initialOverrides?: Record<number, string | null>;
  fromMemory?: boolean;
  /** Stage 6 (Multi-Portfolio): the portfolio the trades will land in. */
  targetPortfolio?: PreflightTargetPortfolio | null;
  resolve: (decision: { confirm: boolean; result?: ImportResult; overrides?: Record<number, string | null> }) => void;
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

  // Stage 3: fingerprint lookup — if we've seen this shape before, re-run with the
  // remembered overrides automatically and show the modal with those choices applied.
  const fingerprint = computeFingerprint(result.structure.headers, brokerId);
  const remembered = loadFingerprint(fingerprint);
  let initialOverrides: Record<number, string | null> | undefined;
  if (remembered && remembered.overrides && Object.keys(remembered.overrides).length > 0) {
    try {
      result = runImport(sheets, { mappingOverrides: remembered.overrides });
      initialOverrides = remembered.overrides;
      console.info('[UIE] fingerprint match → re-ran with remembered overrides', {
        fp: fingerprint,
        overrides: Object.keys(remembered.overrides).length,
        savedAt: remembered.savedAt,
      });
    } catch (e) {
      console.warn('[UIE] remembered overrides re-run failed; falling back to auto-mapping', e);
    }
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

  const decision = await new Promise<{ confirm: boolean; result?: ImportResult; overrides?: Record<number, string | null> }>((resolve) => {
    const detail: PreflightOpenDetail = {
      fileName: file.name,
      brokerId,
      result,
      rerun,
      initialOverrides,
      fromMemory: !!initialOverrides,
      resolve,
    };
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent<PreflightOpenDetail>('orca:uie:preflight', { detail }));
      }, 0);
    } else {
      resolve({ confirm: false });
    }
  });
  console.info('[UIE] preflight resolved', { confirm: decision.confirm, hasResult: !!decision.result, hasOverrides: !!decision.overrides });
  if (decision.result) currentResult = decision.result;

  if (!decision.confirm) {
    return { ok: false, drafts: [], equityPointsAdded: 0, result: currentResult, reason: 'user_cancelled' };
  }

  // Stage 3: persist the user's final overrides under this file fingerprint.
  try {
    const finalOverrides = decision.overrides || initialOverrides || {};
    saveFingerprint(fingerprint, {
      overrides: finalOverrides,
      savedAt: Date.now(),
      fileName: file.name,
      brokerId,
    });
    console.info('[UIE] fingerprint saved', { fp: fingerprint, count: Object.keys(finalOverrides).length });
  } catch (e) {
    console.warn('[UIE] failed to save fingerprint', e);
  }



  const finalResult = currentResult;
  const drafts = finalResult.trades.map((t) => toLegacyTrade(t, { brokerId, accountLabel }));
  const eqPoints = toEquityPoints(finalResult.equityEvents);
  let added = 0;
  if (eqPoints.length > 0) {
    const merged = mergeEquityPoints(eqPoints);
    added = eqPoints.length;
    if (typeof console !== 'undefined') console.info('[UIE] equity points merged:', { added, total: merged.length });
  }

  return { ok: true, drafts, equityPointsAdded: added, result: finalResult };
}
