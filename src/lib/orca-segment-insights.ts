import { EnrichedTrade, SegmentStats, segStats, reliabilityOf, Reliability } from './orca-metrics-core';

/* ========================================================================
   SEGMENT ENGINE — when you trade well + natural-language narrative.
   ======================================================================== */

const DOW_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DOW_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SESS_HE: Record<string, string> = { asia: 'אסיה', london: 'לונדון', ny: 'ניו-יורק', night: 'לילה' };
const SESS_EN: Record<string, string> = { asia: 'Asia', london: 'London', ny: 'NY', night: 'Night' };

type Lang = 'he' | 'en';
const fmtR = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}R`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const relHe: Record<Reliability, string> = { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה', insufficient: 'לא מספיקה' };
const relEn: Record<Reliability, string> = { high: 'high', medium: 'medium', low: 'low', insufficient: 'insufficient' };

function listJoin(items: string[], lang: Lang): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const head = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return lang === 'he' ? `${head} ו${last}` : `${head} and ${last}`;
}

export interface SegmentReport {
  byDow: SegmentStats[];
  bySession: SegmentStats[];
  byDir: SegmentStats[];
  narrative: string;
  headline: string;
  reliability: Reliability;
  totalN: number;
}

export function analyzeSegments(e: EnrichedTrade[], lang: Lang): SegmentReport {
  const DOW = lang === 'he' ? DOW_HE : DOW_EN;
  const SESS = lang === 'he' ? SESS_HE : SESS_EN;
  const totalN = e.length;
  const reliability = reliabilityOf(totalN);
  const N = (n: number) => lang === 'he' ? `${n} עסקאות` : `${n} trades`;
  const dayWord = (label: string) => lang === 'he' ? `יום ${label}` : label;

  const byDow = [0, 1, 2, 3, 4, 5, 6]
    .map(dw => segStats(e.filter(t => t.dow === dw), `dow-${dw}`, DOW[dw]))
    .filter(s => s.n > 0);
  const bySession = (['london', 'ny', 'asia', 'night'] as const)
    .map(s => segStats(e.filter(t => t.session === s), `sess-${s}`, SESS[s]))
    .filter(s => s.n > 0);
  const byDir = (['long', 'short'] as const)
    .map(d => segStats(e.filter(t => t.dir === d), `dir-${d}`, d === 'long' ? 'Long' : 'Short'));

  const strong = byDow.filter(s => s.verdict === 'strong').sort((a, b) => b.expectancy - a.expectancy);
  const weak = byDow.filter(s => s.verdict === 'weak').sort((a, b) => a.expectancy - b.expectancy);
  const gray = byDow.filter(s => s.verdict === 'gray');

  // best day × direction across top-2 strong days
  let bestDD: { day: string; dir: 'long' | 'short'; s: SegmentStats } | null = null;
  for (const day of strong.slice(0, 2)) {
    const dw = DOW.indexOf(day.label);
    const L = segStats(e.filter(t => t.dow === dw && t.dir === 'long'), 'L', 'long');
    const S = segStats(e.filter(t => t.dow === dw && t.dir === 'short'), 'S', 'short');
    for (const [dir, s] of [['long', L], ['short', S]] as const) {
      if (s.significant && s.expectancy > 0 && (!bestDD || s.expectancy > bestDD.s.expectancy)) {
        bestDD = { day: day.label, dir, s };
      }
    }
  }

  // combined stats for top-2 strong days
  let combined: { n: number; exp: number; days: string[] } | null = null;
  if (strong.length >= 2) {
    const top2 = strong.slice(0, 2);
    const dws = top2.map(s => DOW.indexOf(s.label));
    const subset = e.filter(t => dws.includes(t.dow));
    const totR = subset.reduce((a, b) => a + b.r, 0);
    combined = { n: subset.length, exp: subset.length ? totR / subset.length : 0, days: top2.map(s => s.label) };
  }

  const parts: string[] = [];
  // pick second-best day (any verdict) so we always show top-2 context
  const sortedByExp = [...byDow].sort((a, b) => b.expectancy - a.expectancy);
  const topDay = strong[0] ?? sortedByExp[0] ?? null;
  const secondDay = sortedByExp.find(d => d.key !== topDay?.key) ?? null;

  if (lang === 'he') {
    if (gray.length) {
      const grayList = gray.map(g => `${dayWord(g.label)} (${N(g.n)})`);
      parts.push(`הימים ${listJoin(grayList, 'he')} עדיין לא מראים כיוון ברור — התוצאות בהם לא מובהקות סטטיסטית, אז אין מה להסיק מהם כרגע.`);
    }
    if (strong.length === 1 && topDay) {
      parts.push(`היום החזק שלך: ${dayWord(topDay.label)} — תוחלת של ${fmtR(topDay.expectancy)} על ${N(topDay.n)}, אחוז הצלחה ${pct(topDay.winRate)} (אמינות ${relHe[topDay.reliability]}).`);
      if (secondDay) {
        parts.push(`היום השני הכי טוב שלך הוא ${dayWord(secondDay.label)} (תוחלת ${fmtR(secondDay.expectancy)} על ${N(secondDay.n)}) — עדיין לא מובהק סטטיסטית, אבל שווה לעקוב אחריו.`);
      }
    } else if (strong.length >= 2) {
      const a = strong[0], b = strong[1];
      parts.push(`שני הימים החזקים שלך הם ${dayWord(a.label)} (תוחלת ${fmtR(a.expectancy)} על ${N(a.n)}) ו${dayWord(b.label)} (תוחלת ${fmtR(b.expectancy)} על ${N(b.n)}).`);
      if (combined) parts.push(`יחד הם מייצרים תוחלת ממוצעת של ${fmtR(combined.exp)} על ${N(combined.n)} — זה לב הביצועים שלך.`);
    }
    if (bestDD) {
      const dirHe = bestDD.dir === 'long' ? 'בלונג (קנייה)' : 'בשורט (מכירה)';
      parts.push(`ובתוך זה, ${dayWord(bestDD.day)} שלך בולט במיוחד ${dirHe}: אחוז הצלחה ${pct(bestDD.s.winRate)} ותוחלת ${fmtR(bestDD.s.expectancy)} על ${N(bestDD.s.n)}.`);
    }
    if (weak.length) {
      parts.push(`לעומת זאת, ${listJoin(weak.map(w => dayWord(w.label)), 'he')} מפסידים לך באופן מובהק (${fmtR(weak[0].expectancy)} ב${dayWord(weak[0].label)}) — שווה לשקול להימנע.`);
    }
  } else {
    if (gray.length) {
      const grayList = gray.map(g => `${g.label} (${N(g.n)})`);
      parts.push(`${listJoin(grayList, 'en')} don't show a clear direction yet — results aren't statistically significant, so there's nothing to lean on there for now.`);
    }
    if (strong.length === 1 && topDay) {
      parts.push(`Your strongest day: ${topDay.label} — expectancy of ${fmtR(topDay.expectancy)} over ${N(topDay.n)}, win rate ${pct(topDay.winRate)} (${relEn[topDay.reliability]} reliability).`);
      if (secondDay) {
        parts.push(`Your second-best day is ${secondDay.label} (expectancy ${fmtR(secondDay.expectancy)} over ${N(secondDay.n)}) — not yet statistically significant, but worth tracking.`);
      }
    } else if (strong.length >= 2) {

      const a = strong[0], b = strong[1];
      parts.push(`Your two strongest days are ${a.label} (expectancy ${fmtR(a.expectancy)} over ${N(a.n)}) and ${b.label} (expectancy ${fmtR(b.expectancy)} over ${N(b.n)}).`);
      if (combined) parts.push(`Together they produce an average expectancy of ${fmtR(combined.exp)} over ${N(combined.n)} — this is the core of your performance.`);
    }
    if (bestDD) parts.push(`Within that, your ${bestDD.day} excels on ${bestDD.dir}: win rate ${pct(bestDD.s.winRate)}, expectancy ${fmtR(bestDD.s.expectancy)} over ${N(bestDD.s.n)}.`);
    if (weak.length) parts.push(`On the other hand, ${listJoin(weak.map(w => w.label), 'en')} loses you money significantly (${fmtR(weak[0].expectancy)} on ${weak[0].label}) — worth considering avoiding.`);
  }

  const headline = strong.length
    ? (lang === 'he' ? `היום החזק שלך: ${strong[0].label} (${fmtR(strong[0].expectancy)})` : `Your strongest day: ${strong[0].label} (${fmtR(strong[0].expectancy)})`)
    : (lang === 'he' ? 'אין עדיין יום מובהק — צריך עוד דאטה' : 'No significant day yet — needs more data');

  return { byDow, bySession, byDir, narrative: parts.join(' '), headline, reliability, totalN };
}
