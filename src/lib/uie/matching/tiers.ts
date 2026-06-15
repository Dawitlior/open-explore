// 4-tier name matcher (P1 exact -> P2 contain -> P3 token-subset>=0.5 -> P4 fuzzy)
// + combined scoring with content + greedy assignment. Internal Damerau-Levenshtein
// (zero-dependency by design — master-plan §14.1).
import { ColumnProfile, FieldMatch } from '../types';
import { FIELD_TAXONOMY, byCanonical } from '../dictionary/canonical-fields';
import { normalizeHeader, headerVariants } from './normalize';
import { contentScore } from './profiling';

export function damerau(a: string, b: string): number {
  const al = a.length, bl = b.length;
  if (!al) return bl; if (!bl) return al;
  const d: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) for (let j = 1; j <= bl; j++) {
    const cost = a[i-1] === b[j-1] ? 0 : 1;
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + cost);
    if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2] + 1);
  }
  return d[al][bl];
}
const sim = (a: string, b: string) => { const m = Math.max(a.length, b.length); return m ? 1 - damerau(a, b) / m : 1; };

// best name-score of one header string against all fields
function nameScoreForVariant(h: string): { field: string; score: number; why: string }[] {
  const ht = h.split(' ');
  const out: { field: string; score: number; why: string }[] = [];
  for (const f of FIELD_TAXONOMY) {
    let best = 0, why = '';
    for (const lang of ['he', 'en'] as const) {
      for (const a of f.aliases[lang]) {
        const an = normalizeHeader(a, false); if (!an) continue;
        const at = an.split(' ');
        let sc = 0, w = '';
        if (h === an) { sc = 100; w = 'P1 exact'; }
        else if (h.indexOf(an) >= 0 && an.length / h.length >= 0.5) { sc = 90; w = `P2 contains "${a}"`; }
        else if (at.every(t => ht.indexOf(t) >= 0) && at.length / ht.length >= 0.5) { sc = 82; w = `P3 tokens "${a}"`; }
        else { const r = sim(h, an); if (r >= 0.85) { sc = Math.round(70 * r); w = `P4 fuzzy "${a}" ${r.toFixed(2)}`; } }
        if (sc > best) { best = sc; why = w; }
      }
    }
    if (best > 0) out.push({ field: f.canonical, score: best, why });
  }
  return out;
}

export interface RankedCell { columnIndex: number; field: string; nameScore: number; contentScoreVal: number; combined: number; why: string; }

export function buildScoreMatrix(profiles: ColumnProfile[]): RankedCell[] {
  const cells: RankedCell[] = [];
  for (const p of profiles) {
    // best name score per field across header variants (with/without ה')
    const perField: Record<string, { score: number; why: string }> = {};
    for (const variant of headerVariants(p.headerRaw)) {
      for (const r of nameScoreForVariant(variant)) {
        if (!perField[r.field] || r.score > perField[r.field].score) perField[r.field] = { score: r.score, why: r.why };
      }
    }
    for (const field in perField) {
      const ns = perField[field].score;
      const cs = contentScore(byCanonical[field]?.profile, p);
      let combined = 0.6 * ns + 0.4 * cs;
      if (cs === 0) combined = Math.min(combined, 25);   // content veto cap
      cells.push({ columnIndex: p.index, field, nameScore: ns, contentScoreVal: cs, combined, why: `${perField[field].why}; content ${cs}` });
    }
  }
  return cells.sort((a, b) => b.combined - a.combined);
}

// greedy assignment: one field per column, one column per field (except multi)
export function assign(profiles: ColumnProfile[], ranked: RankedCell[]): FieldMatch[] {
  const colUsed = new Set<number>();
  const fieldUsed = new Set<string>();
  const result: Record<number, FieldMatch> = {};
  for (const c of ranked) {
    if (colUsed.has(c.columnIndex)) continue;
    const multi = byCanonical[c.field]?.multi;
    if (fieldUsed.has(c.field) && !multi) continue;
    if (c.combined < 40) continue;
    const status = c.combined >= 90 ? 'auto' : c.combined >= 60 ? 'suggested' : 'unmapped';
    result[c.columnIndex] = {
      columnIndex: c.columnIndex, field: c.field, score: Math.round(c.combined),
      evidence: [c.why], destination: byCanonical[c.field]?.destination, status: status as any,
    };
    colUsed.add(c.columnIndex);
    if (!multi) fieldUsed.add(c.field);
  }
  return profiles.map(p => result[p.index] || {
    columnIndex: p.index, field: null, score: 0, evidence: ['no match'], status: 'unmapped' as any,
  });
}
