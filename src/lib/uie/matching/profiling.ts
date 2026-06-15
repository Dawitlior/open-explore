// Content profiler — gives each column a "fingerprint" used for content-score & vetoes.
import { ColumnProfile } from '../types';
import { cleanCell, isNullToken } from './normalize';
import { looksNumeric, parseNumber, isTimeOnly } from './values';
import { DIRECTION_VALUES, ACTIVITY_VALUES, ORDER_TYPE_VALUES, OUTCOME_VALUES, BOOLEAN_VALUES, CURRENCY_CODES, WEEKDAYS } from '../dictionary/canonical-fields';

const inSet = (s: string, set: string[]) => set.indexOf(s.toLowerCase()) >= 0;
const URL_RE = /^https?:\/\//i;
const ISO_OR_SLASH = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d{1,2}:\d{2}\s+\d{4}-\d{2}-\d{2})/;
const DUR_RE = /^\d+\s*[dhm]/i;
const TICKER_RE = /^[A-Z]{1,6}([\/\-]?[A-Z]{2,6})?(\.P)?$/;

export function profileColumn(index: number, headerRaw: string, headerNorm: string, col: string[]): ColumnProfile {
  const vals = col.map(cleanCell);
  const nonNull = vals.filter(v => !isNullToken(v));
  const N = nonNull.length || 1;
  const uniq = new Set(nonNull);
  let date = 0, number = 0, neg = 0, pct = 0, ticker = 0, ccy = 0, dir = 0, act = 0, ot = 0, url = 0, dur = 0, free = 0, bool = 0;
  const nums: number[] = [];
  let seq = true, seqExpected = 1, smallFrac = 0;
  nonNull.forEach((v, i) => {
    const low = v.toLowerCase();
    if (ISO_OR_SLASH.test(v) || isTimeOnly(v)) date++;
    const n = parseNumber(v);
    if (n !== null) { number++; nums.push(n); if (n < 0) neg++; if (Math.abs(n) > 0 && Math.abs(n) < 0.01) smallFrac++; }
    if (/%$/.test(v) || (n !== null && Math.abs(n) <= 100)) pct++;
    if (TICKER_RE.test(v) || /^[\u0590-\u05FF ]{1,20}$/.test(v) && uniq.size > 1 && uniq.size < N) ticker++;
    if (inSet(low, CURRENCY_CODES)) ccy++;
    if (inSet(low, DIRECTION_VALUES.long) || inSet(low, DIRECTION_VALUES.short)) dir++;
    for (const k in ACTIVITY_VALUES) if (inSet(low, ACTIVITY_VALUES[k])) { act++; break; }
    if (inSet(low, ORDER_TYPE_VALUES)) ot++;
    if (URL_RE.test(v)) url++;
    if (DUR_RE.test(v)) dur++;
    if (v.length > 15) free++;
    if (inSet(low, BOOLEAN_VALUES) || inSet(low, OUTCOME_VALUES)) bool++;
  });
  // sequential integer check (1,2,3..)
  const intvals = nonNull.map(v => parseNumber(v)).filter(x => x !== null) as number[];
  if (intvals.length >= 3 && intvals.every(Number.isInteger)) {
    let ok = 0; for (let i = 1; i < intvals.length; i++) if (intvals[i] === intvals[i-1] + 1) ok++;
    seq = ok / (intvals.length - 1) > 0.8;
  } else seq = false;

  let stats; if (nums.length) {
    const sorted = [...nums].sort((a,b)=>a-b);
    const mean = nums.reduce((a,b)=>a+b,0)/nums.length;
    const median = sorted[Math.floor(sorted.length/2)];
    let mono = 0; for (let i=1;i<nums.length;i++) if (Math.abs(nums[i]) >= Math.abs(nums[i-1])) mono++;
    stats = { min: sorted[0], max: sorted[sorted.length-1], mean, median, monotonic: nums.length>1?mono/(nums.length-1):0 };
  }
  return {
    index, headerRaw, headerNorm,
    sample: nonNull.slice(0, 5),
    fillRate: nonNull.length / (col.length || 1),
    cardinality: uniq.size,
    cardinalityRatio: uniq.size / N,
    d: {
      date: date/N, number: number/N, negativeShare: nums.length? neg/nums.length : 0, percentLike: pct/N,
      tickerLike: ticker/N, currencyCode: ccy/N, directionValue: dir/N, activityValue: act/N,
      orderTypeValue: ot/N, sequentialInteger: seq ? 1 : 0, smallFraction: nums.length? smallFrac/nums.length : 0,
      urlLike: url/N, durationLike: dur/N, freeText: free/N, booleanLike: bool/N,
    },
    stats,
  };
}

// content-score: how well a column's profile fits a field's expected profile (0..100)
export function contentScore(profileKey: string | undefined, p: ColumnProfile): number {
  if (!profileKey) return 40;
  const d = p.d;
  switch (profileKey) {
    case 'date': return d.date > 0.7 ? 100 : d.date > 0.3 ? 60 : (d.number > 0.9 ? 30 : 0);
    case 'time': return d.date > 0.5 ? 80 : 0;
    case 'positiveNumber': return d.number > 0.8 && d.negativeShare < 0.05 ? 100 : d.number > 0.8 ? 60 : 0;
    case 'number': return d.number > 0.8 ? 100 : d.number > 0.5 ? 50 : 0;
    case 'signedNumber': return d.number > 0.8 ? 100 : d.number > 0.5 ? 50 : 0;
    case 'percent': return d.percentLike > 0.8 ? 90 : 40;
    case 'percentOrFraction': return d.number > 0.8 ? 80 : 30;
    case 'smallFraction': return d.smallFraction > 0.7 ? 100 : d.number > 0.8 ? 30 : 0;
    case 'identifier': return d.tickerLike > 0.6 ? 90 : (p.cardinalityRatio < 0.6 ? 60 : 40);
    case 'directionEnum': return d.directionValue > 0.7 ? 100 : 0;
    case 'activityEnum': return d.activityValue > 0.6 ? 100 : 40;
    case 'orderTypeEnum': return d.orderTypeValue > 0.6 ? 100 : 30;
    case 'currencyEnum': return d.currencyCode > 0.6 ? 100 : 0;
    case 'outcomeEnum': return d.booleanLike > 0.6 ? 90 : 30;
    case 'booleanEnum': return d.booleanLike > 0.6 ? 90 : 30;
    case 'weekdayEnum': return p.sample.some(s => WEEKDAYS.indexOf(s.toLowerCase())>=0) ? 90 : 30;
    case 'url': return d.urlLike > 0.6 ? 100 : 0;
    case 'duration': return d.durationLike > 0.5 ? 100 : 30;
    case 'sequentialInteger': return d.sequentialInteger ? 100 : 20;
    case 'uniqueId': return p.cardinalityRatio > 0.9 ? 90 : 40;
    case 'freeText': return d.freeText > 0.4 ? 80 : 40;
    case 'textLow': return p.cardinalityRatio < 0.6 ? 70 : 40;
    case 'enumLow': return p.cardinalityRatio < 0.4 ? 80 : 40;
    default: return 40;
  }
}
