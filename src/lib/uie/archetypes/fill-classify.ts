// UIE v1.2 — Phase 3 · Step 1 · Fill row classifier
// Detects whether a (headers, rows) input is a FILLS table (many tiny rows
// per orderId), not a one-row-per-trade table.
//
// Signals (any 2 of 3 → likely fills):
//   1. presence of fill-id / exec-id column
//   2. orderId column whose values repeat (avg fills per order ≥ 1.5)
//   3. price varies within the same orderId (partial fills at different prices)

import { mapHeaderToField } from '../matching/tiers';
import { normalizeHeader } from '../matching/normalize';

const FILL_ID_RE = /(fill\s*id|exec(ution)?\s*id|trade\s*ref|מזהה\s*ביצוע)/i;
const ORDER_ID_RE = /(order\s*id|order\s*ref|client\s*order|מזהה\s*הוראה)/i;
const PRICE_RE = /(price|מחיר)/i;

export interface FillClassifyResult {
  isFills: boolean;
  confidence: number;
  signals: string[];
  columns: {
    fillIdIdx: number;
    orderIdIdx: number;
    priceIdx: number;
    qtyIdx: number;
    sideIdx: number;
  };
}

function findColumn(headers: string[], re: RegExp): number {
  for (let i = 0; i < headers.length; i++) {
    if (re.test(headers[i])) return i;
  }
  return -1;
}

function findCanonical(headers: string[], target: string): number {
  for (let i = 0; i < headers.length; i++) {
    const m = mapHeaderToField(headers[i]);
    if (m.status === 'mapped' && m.field === target) return i;
  }
  return -1;
}

export function classifyFills(headers: string[], rows: unknown[][]): FillClassifyResult {
  const signals: string[] = [];
  const fillIdIdx = findColumn(headers, FILL_ID_RE);
  const orderIdIdx = findColumn(headers, ORDER_ID_RE);
  const priceIdx = findColumn(headers, PRICE_RE) >= 0
    ? findColumn(headers, PRICE_RE)
    : findCanonical(headers, 'entry');
  const qtyIdx = findCanonical(headers, 'positionSize');
  const sideIdx = findCanonical(headers, 'direction');

  if (fillIdIdx >= 0) signals.push('fill_id_column');

  let avgFillsPerOrder = 1;
  let pricesVaryWithinOrder = false;

  if (orderIdIdx >= 0 && rows.length > 0) {
    const groups = new Map<string, { count: number; prices: Set<string> }>();
    for (const r of rows.slice(0, 1000)) {
      const oid = String(r?.[orderIdIdx] ?? '').trim();
      if (!oid) continue;
      const g = groups.get(oid) ?? { count: 0, prices: new Set() };
      g.count++;
      if (priceIdx >= 0) {
        const p = String(r?.[priceIdx] ?? '').trim();
        if (p) g.prices.add(p);
      }
      groups.set(oid, g);
    }
    if (groups.size > 0) {
      let totalFills = 0;
      let varying = 0;
      for (const g of groups.values()) {
        totalFills += g.count;
        if (g.prices.size > 1) varying++;
      }
      avgFillsPerOrder = totalFills / groups.size;
      pricesVaryWithinOrder = varying / groups.size >= 0.2;

      if (avgFillsPerOrder >= 1.5) signals.push('orderId_repeats');
      if (pricesVaryWithinOrder) signals.push('price_varies_within_order');
    }
  }

  const confidence = Math.min(1, signals.length / 3 + (avgFillsPerOrder - 1) * 0.2);
  const isFills = signals.length >= 2;

  return {
    isFills,
    confidence,
    signals,
    columns: { fillIdIdx, orderIdIdx, priceIdx, qtyIdx, sideIdx },
  };
}

// Silence unused import (kept for future header-name normalization).
void normalizeHeader;
