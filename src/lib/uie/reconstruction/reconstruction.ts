// Archetype classification + FIFO position reconstruction with in-stream funding attribution
// + liquidation. Validated on GF-5 (Bybit): 985 fills -> 126 trades, 387/387 funding consistency.
import { CanonicalTrade, Archetype, FieldMatch, ColumnProfile } from '../types';

let _id = 0; const uid = () => 'uie_' + (++_id);

export interface StreamItem {
  symbol: string; date: string; seq: number;
  kind: 'trade' | 'funding';
  side?: 'buy' | 'sell'; price?: number; quantity?: number; fee?: number;
  amount?: number;                 // funding amount
  externalId?: string; liquidation?: boolean;
}

export function classifyArchetype(mapping: FieldMatch[], profiles: ColumnProfile[]): Archetype {
  const has = (f: string) => mapping.some(m => m.field === f);
  const prof = (f: string) => { const m = mapping.find(x => x.field === f); return m ? profiles[m.columnIndex] : undefined; };
  const hasExit = has('exitPrice') || has('exitDate');
  const hasPnl = has('pnl');
  const dirP = prof('direction'); const hasDir = !!dirP && dirP.d.directionValue > 0.6;
  const actP = prof('activityType'); const hasActsBeyondTrade = !!actP && actP.d.activityValue > 0.5 && actP.cardinality > 2;
  const hasCurrent = has('currentPrice') || has('portfolioWeight');
  if (hasActsBeyondTrade) return 'C_ACCOUNT_STATEMENT';
  if (hasCurrent && !hasExit && !hasPnl) return 'D_POSITIONS_SNAPSHOT';
  if (hasExit || hasPnl) return 'A_TRADES_LEDGER';
  if (hasDir && !hasExit) return 'B_FILLS_LOG';
  return 'AMBIGUOUS';
}

export interface ReconResult { trades: CanonicalTrade[]; open: CanonicalTrade[]; fundingApplied: number; fundingOrphan: number; }

// FIFO over a chronologically-ascending mixed stream (trades + funding), grouped by symbol.
export function reconstructFIFO(stream: StreamItem[]): ReconResult {
  const bySym: Record<string, StreamItem[]> = {};
  for (const it of stream) (bySym[it.symbol] ||= []).push(it);
  const trades: CanonicalTrade[] = []; const open: CanonicalTrade[] = [];
  let fundingApplied = 0, fundingOrphan = 0;

  for (const sym in bySym) {
    // stable sort by date; ties keep input order (caller passes chronological-ascending)
    const list = bySym[sym].map((x, i) => ({ x, i }))
      .sort((a, b) => (a.x.date < b.x.date ? -1 : a.x.date > b.x.date ? 1 : a.i - b.i)).map(o => o.x);
    let pos: any = null;
    const seal = (p: any, exitDate: string, closeQty = p.exitQty, exitVal = p.exitVal, exitFee = p.exitFee, entryVal = p.entryVal, entryFee = p.entryFee, funding = p.funding, fills = p.fills): CanonicalTrade => {
      const entry = entryVal / closeQty, exit = exitVal / closeQty;
      const sign = p.dir === 'long' ? 1 : -1;
      const gross = (exit - entry) * closeQty * sign;
      const fees = entryFee + exitFee;
      return { id: uid(), externalIds: p.ids, symbol: sym, symbolRaw: sym, direction: p.dir, status: 'closed',
        entryDate: p.entryDate, exitDate, entryPrice: entry, exitPrice: exit, quantity: closeQty,
        pnl: gross - fees - funding, pnlGross: gross, commission: fees, swapFunding: funding,
        liquidated: p.liq, fills, notes: '', derivedFields: ['pnl(reconstructed)'], warnings: [] } as any;
    };
    const fresh = (d: string, q: number, pr: number, fe: number, dt: string, liq: boolean, id?: string): any =>
      ({ dir: d, qty: q, entryVal: pr * q, entryQty: q, entryFee: fe, entryDate: dt,
         exitVal: 0, exitQty: 0, exitFee: 0, funding: 0, liq, fills: [], ids: id ? [id] : [] });

    for (const it of list) {
      if (it.kind === 'funding') { if (pos) { pos.funding += (it.amount || 0); fundingApplied++; } else fundingOrphan++; continue; }
      const sq = it.side === 'buy' ? (it.quantity || 0) : -(it.quantity || 0);
      const fee = it.fee || 0;
      if (!pos) { pos = fresh(sq > 0 ? 'long' : 'short', Math.abs(sq), it.price!, fee, it.date, !!it.liquidation, it.externalId); pos.fills.push(it); continue; }
      const same = (pos.dir === 'long') === (sq > 0);
      if (same) { pos.qty += Math.abs(sq); pos.entryVal += it.price! * Math.abs(sq); pos.entryQty += Math.abs(sq); pos.entryFee += fee; pos.fills.push(it); if (it.externalId) pos.ids.push(it.externalId); }
      else {
        const closeQ = Math.min(Math.abs(sq), pos.qty), rem = Math.abs(sq) - closeQ;
        const ratio = closeQ / pos.qty;
        const partEntryVal = pos.entryVal * ratio, partEntryFee = pos.entryFee * ratio, partFunding = pos.funding * ratio;
        const partExitVal = it.price! * closeQ, partExitFee = fee * (closeQ / Math.abs(sq));
        if (it.liquidation) pos.liq = true; pos.fills.push(it); if (it.externalId) pos.ids.push(it.externalId);
        trades.push(seal(pos, it.date, closeQ, partExitVal, partExitFee, partEntryVal, partEntryFee, partFunding, pos.fills.slice()));
        pos.qty -= closeQ; pos.entryQty -= closeQ; pos.entryVal -= partEntryVal; pos.entryFee -= partEntryFee; pos.funding -= partFunding;
        if (pos.qty <= 1e-9) pos = null;
        if (rem > 1e-9) { pos = fresh(sq > 0 ? 'long' : 'short', rem, it.price!, fee * (rem / Math.abs(sq)), it.date, false, it.externalId); pos.fills.push(it); }
      }
    }
    if (pos && pos.qty > 1e-9) open.push({ id: uid(), externalIds: pos.ids, symbol: sym, symbolRaw: sym, direction: pos.dir, status: 'open',
      entryDate: pos.entryDate, entryPrice: pos.entryVal / pos.entryQty, quantity: pos.qty, commission: pos.entryFee,
      swapFunding: pos.funding, liquidated: pos.liq, fills: pos.fills, notes: '', derivedFields: [], warnings: ['position still open at end of file'] } as any);
  }
  return { trades, open, fundingApplied, fundingOrphan };
}
