// UIE v1.2 — Phase 3 · Step 3 · Link-files
// Combines two related tables into one set of CanonicalTrades:
//   - trades.csv : one row per trade (Archetype A/B)
//   - fills.csv  : many rows per orderId (Archetype C)
// Linking key: externalId / orderId (case-insensitive, trimmed).
//
// If only fills.csv is supplied → derive trades via Archetype C.
// If only trades.csv is supplied → return as-is.

import type { CanonicalTrade } from '../canonical-trade';
import { runUIE } from '../archetypes/detect';
import { archetypeC } from '../archetypes/archetype-c';
import { classifyFills } from '../archetypes/fill-classify';

export interface FileInput {
  name: string;
  headers: string[];
  rows: unknown[][];
}

export interface LinkResult {
  trades: CanonicalTrade[];
  warnings: string[];
  diagnostics: {
    tradesFile?: string;
    fillsFile?: string;
    linkedCount: number;
    orphanTrades: number;
    orphanFills: number;
  };
}

function keyOf(t: CanonicalTrade): string {
  const id = (t.externalId ?? t.orderId ?? '') as string;
  return String(id).trim().toLowerCase();
}

export function linkFiles(files: FileInput[]): LinkResult {
  if (files.length === 0) {
    return { trades: [], warnings: ['no files'], diagnostics: { linkedCount: 0, orphanTrades: 0, orphanFills: 0 } };
  }

  // Detect role of each file via fill classifier.
  const roles = files.map((f) => ({
    file: f,
    isFills: classifyFills(f.headers, f.rows).isFills,
  }));

  const fillsFile = roles.find((r) => r.isFills);
  const tradesFile = roles.find((r) => !r.isFills);

  // ── Case 1: fills only → derive via archetype C ─────────────────────────
  if (fillsFile && !tradesFile) {
    const c = archetypeC(fillsFile.file.headers, fillsFile.file.rows);
    return {
      trades: c.trades,
      warnings: c.warnings,
      diagnostics: {
        fillsFile: fillsFile.file.name,
        linkedCount: c.trades.length,
        orphanTrades: 0,
        orphanFills: 0,
      },
    };
  }

  // ── Case 2: trades only → just run UIE ──────────────────────────────────
  if (tradesFile && !fillsFile) {
    const t = runUIE(tradesFile.file.headers, tradesFile.file.rows);
    return {
      trades: t.trades,
      warnings: t.warnings,
      diagnostics: {
        tradesFile: tradesFile.file.name,
        linkedCount: t.trades.length,
        orphanTrades: 0,
        orphanFills: 0,
      },
    };
  }

  // ── Case 3: both → link by externalId/orderId ───────────────────────────
  if (tradesFile && fillsFile) {
    const t = runUIE(tradesFile.file.headers, tradesFile.file.rows);
    const c = archetypeC(fillsFile.file.headers, fillsFile.file.rows);
    const fillsByKey = new Map<string, CanonicalTrade>();
    for (const ft of c.trades) {
      const k = keyOf(ft);
      if (k) fillsByKey.set(k, ft);
    }
    const used = new Set<string>();
    const linked: CanonicalTrade[] = [];
    let orphanTrades = 0;

    for (const tr of t.trades) {
      const k = keyOf(tr);
      const ft = k ? fillsByKey.get(k) : undefined;
      if (ft) {
        used.add(k);
        // Enrich: prefer trades.csv values, fill gaps from fills aggregation.
        const enriched: CanonicalTrade = { ...ft, ...tr };
        // Always trust fills VWAPs and totals when richer.
        if (tr.entry == null) enriched.entry = ft.entry;
        if (tr.exit == null) enriched.exit = ft.exit;
        if (tr.fees == null) enriched.fees = ft.fees;
        if (tr.positionSize == null) enriched.positionSize = ft.positionSize;
        linked.push(enriched);
      } else {
        orphanTrades++;
        linked.push(tr);
      }
    }
    // Fills with no matching trade row → include as standalone derived trades
    let orphanFills = 0;
    for (const [k, ft] of fillsByKey) {
      if (!used.has(k)) { linked.push(ft); orphanFills++; }
    }

    return {
      trades: linked,
      warnings: [...t.warnings, ...c.warnings],
      diagnostics: {
        tradesFile: tradesFile.file.name,
        fillsFile: fillsFile.file.name,
        linkedCount: linked.length - orphanTrades - orphanFills,
        orphanTrades,
        orphanFills,
      },
    };
  }

  return { trades: [], warnings: ['no recognizable trade or fill files'], diagnostics: { linkedCount: 0, orphanTrades: 0, orphanFills: 0 } };
}
