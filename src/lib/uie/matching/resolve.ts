// Disambiguation rules + content veto applied AFTER assignment.
// Each rule rewrites the mapping using profiles + which fields are already mapped.
import { ColumnProfile, FieldMatch } from '../types';
import { byCanonical, FIAT_CODES } from '../dictionary/canonical-fields';

function find(m: FieldMatch[], field: string) { return m.find(x => x.field === field); }
function setField(fm: FieldMatch, field: string | null, why: string) {
  fm.field = field; fm.destination = field ? byCanonical[field]?.destination : undefined;
  fm.evidence.push(why); fm.status = field ? 'auto' : 'unmapped';
}

export function resolve(mapping: FieldMatch[], profiles: ColumnProfile[]): FieldMatch[] {
  const P = (i: number) => profiles[i];

  // ROW_INDEX: a "#"/No. column that is a 1..n sequence is rowIndex (ignore), never externalId.
  for (const fm of mapping) {
    if (!fm.field) continue;
    const p = P(fm.columnIndex);
    if ((fm.field === 'externalId' || fm.field === 'quantity') && p.d.sequentialInteger && p.cardinalityRatio > 0.9) {
      setField(fm, 'rowIndex', 'ROW_INDEX: 1..n sequence');
    }
  }

  // HE_MATBEA: "מטבע" -> currency if values are FIAT codes (ILS/USD/EUR), else symbol (BTC/ETH/SOL are tickers).
  for (const fm of mapping) {
    const p = P(fm.columnIndex);
    if (/מטבע|currency|ccy/.test(p.headerNorm) || fm.field === 'currency' || fm.field === 'symbol') {
      const sample = p.sample.map(s => s.toLowerCase());
      const fiatShare = sample.length ? sample.filter(s => FIAT_CODES.indexOf(s) >= 0).length / sample.length : 0;
      if (fiatShare > 0.5 && p.cardinality <= 6) { if (fm.field !== 'currency') setField(fm, 'currency', 'HE_MATBEA: values are fiat currency codes'); }
      else if (p.d.tickerLike > 0.4 && fm.field === 'currency') { setField(fm, 'symbol', 'HE_MATBEA: values are tickers'); }
    }
  }

  // TYPE_DISAMBIG: a column mapped to direction/orderType decided by values.
  for (const fm of mapping) {
    if (!fm.field) continue;
    const p = P(fm.columnIndex);
    if (fm.field === 'direction' && p.d.directionValue < 0.5) {
      if (p.d.orderTypeValue > 0.5) setField(fm, 'orderType', 'TYPE_DISAMBIG: values are order types');
      else if (p.d.activityValue > 0.6) setField(fm, 'activityType', 'TYPE_DISAMBIG: values are activities');
    }
    if (fm.field === 'orderType' && p.d.directionValue > 0.7) setField(fm, 'direction', 'TYPE_DISAMBIG: values are long/short');
  }

  // QTY_CROSS / AMOUNT_RULE: positionSize vs quantity via cross-product with entryPrice.
  const price = find(mapping, 'entryPrice');
  const qty = find(mapping, 'quantity');
  const pos = find(mapping, 'positionSize');
  if (price) {
    const pp = P(price.columnIndex);
    const med = pp.stats?.median || 0;
    // if a column mapped to quantity actually looks like money (value ~ price*other), and no positionSize yet
    if (qty && !pos && med > 0) {
      const qp = P(qty.columnIndex);
      // heuristic: quantity median * price median should be a "money-sized" number; if quantity itself is already money-sized AND there is another size column, leave. Lightweight: skip unless clearly contradictory.
    }
  }

  // FEE_RATE: a "fee/עמלה" column whose values are all < 0.01 is a RATE, not an amount.
  for (const fm of mapping) {
    if (fm.field === 'commission') {
      const p = P(fm.columnIndex);
      if (p.d.smallFraction > 0.7) setField(fm, 'feeRate', 'FEE_RATE: values < 0.01 -> rate not amount');
    }
  }

  // DUPLICATE_FEE: if two columns map to commission, keep the larger-magnitude one, ignore the other.
  const fees = mapping.filter(x => x.field === 'commission');
  if (fees.length > 1) {
    fees.sort((a, b) => (P(b.columnIndex).stats?.median || 0) - (P(a.columnIndex).stats?.median || 0));
    for (let i = 1; i < fees.length; i++) setField(fees[i], null, 'DUPLICATE_FEE: duplicate commission column ignored');
  }

  // R_VS_PERCENT: "Return" -> rMultiple if a risk column exists & values in +-15; else pnlPercent.
  const hasRisk = !!(find(mapping, 'riskAmount') || find(mapping, 'riskPercent'));
  for (const fm of mapping) {
    const p = P(fm.columnIndex);
    if ((fm.field === 'rMultiple' || fm.field === 'pnlPercent') && /return|תשואה/.test(p.headerNorm)) {
      const within = Math.abs(p.stats?.max || 0) <= 15 && Math.abs(p.stats?.min || 0) <= 15;
      if (hasRisk && within) { if (fm.field !== 'rMultiple') setField(fm, 'rMultiple', 'R_VS_PERCENT: risk col present + small range'); }
    }
  }

  // DUPLICATE_HEADER: two identical headers mapped to same field -> second becomes suggested for *Net variant.
  const seen: Record<string, FieldMatch> = {};
  for (const fm of mapping) {
    if (!fm.field) continue;
    const key = fm.field;
    if (seen[key] && !byCanonical[key]?.multi) {
      fm.status = 'suggested'; fm.evidence.push('DUPLICATE_HEADER: needs user pick (gross/net?)');
    } else seen[key] = fm;
  }

  return mapping;
}
