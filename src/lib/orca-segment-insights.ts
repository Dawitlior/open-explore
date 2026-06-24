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

  // best day × direction (over strong days)
  let bestDD: { day: string; dir: 'long' | 'short'; s: SegmentStats } | null = null;
  for (const day of strong) {
    const dw = DOW.indexOf(day.label);
    const L = segStats(e.filter(t => t.dow === dw && t.dir === 'long'), 'L', 'long');
    const S = segStats(e.filter(t => t.dow === dw && t.dir === 'short'), 'S', 'short');
    for (const [dir, s] of [['long', L], ['short', S]] as const) {
      if (s.significant && s.expectancy > 0 && (!bestDD || s.expectancy > bestDD.s.expectancy)) {
        bestDD = { day: day.label, dir, s };
      }
    }
  }

  const parts: string[] = [];
  if (lang === 'he') {
    if (gray.length) parts.push(`שמתי לב שימי ${listJoin(gray.map(g => g.label), 'he')} שלך אפורים יחסית — התוחלת בהם לא מובהקת סטטיסטית (${gray.map(g => `n=${g.n}`).join(', ')}), אז לא הייתי בונה עליהם.`);
    if (strong.length) {
      parts.push(`לעומת זאת ימי ${listJoin(strong.map(s => s.label), 'he')} בולטים לטובה: ${listJoin(strong.map(s => `${s.label} בתוחלת ${fmtR(s.expectancy)}`), 'he')}.`);
      const top = strong[0];
      parts.push(`ובמיוחד יום ${top.label} — תוחלת של ${fmtR(top.expectancy)} על ${top.n} עסקאות (אחוז הצלחה ${pct(top.winRate)}, אמינות ${relHe[top.reliability]}).`);
    }
    if (bestDD) {
      const dirHe = bestDD.dir === 'long' ? 'long (קנייה)' : 'short (מכירה)';
      parts.push(`ושמתי לב שימי ${bestDD.day} שלך מצטיינים ב-${dirHe}: אחוז הצלחה ${pct(bestDD.s.winRate)} ותוחלת ${fmtR(bestDD.s.expectancy)} (n=${bestDD.s.n}).`);
    }
    if (weak.length) parts.push(`שים לב — ${listJoin(weak.map(w => w.label), 'he')} שלילי מובהק (${fmtR(weak[0].expectancy)}); שווה לבדוק אם להימנע.`);
  } else {
    if (gray.length) parts.push(`Your ${listJoin(gray.map(g => g.label), 'en')} are relatively gray — their expectancy isn't statistically significant (${gray.map(g => `n=${g.n}`).join(', ')}), so I wouldn't lean on them.`);
    if (strong.length) {
      parts.push(`By contrast, ${listJoin(strong.map(s => s.label), 'en')} stand out: ${listJoin(strong.map(s => `${s.label} at ${fmtR(s.expectancy)}`), 'en')}.`);
      const top = strong[0];
      parts.push(`Especially ${top.label} — expectancy of ${fmtR(top.expectancy)} over ${top.n} trades (win rate ${pct(top.winRate)}, ${relEn[top.reliability]} reliability).`);
    }
    if (bestDD) parts.push(`And your ${bestDD.day} excels on ${bestDD.dir}: win rate ${pct(bestDD.s.winRate)}, expectancy ${fmtR(bestDD.s.expectancy)} (n=${bestDD.s.n}).`);
    if (weak.length) parts.push(`Heads up — ${listJoin(weak.map(w => w.label), 'en')} is significantly negative (${fmtR(weak[0].expectancy)}); worth considering avoiding.`);
  }

  const headline = strong.length
    ? (lang === 'he' ? `היום החזק שלך: ${strong[0].label} (${fmtR(strong[0].expectancy)})` : `Your strongest day: ${strong[0].label} (${fmtR(strong[0].expectancy)})`)
    : (lang === 'he' ? 'אין עדיין יום מובהק — צריך עוד דאטה' : 'No significant day yet — needs more data');

  return { byDow, bySession, byDir, narrative: parts.join(' '), headline, reliability, totalN };
}
