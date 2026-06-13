// UIE v1.2 — Phase 1 · Damerau-Levenshtein, internal.
// zero-dependency by design — see master-plan §14.1
// Returns similarity in 0..100 (Damerau distance normalised by max length).

export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  // two-row + previous-prev for transposition
  const prevPrev = new Array<number>(bl + 1);
  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insert
        prev[j] + 1,            // delete
        prev[j - 1] + cost,     // substitute
      );
      if (
        i > 1 && j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        curr[j] = Math.min(curr[j], prevPrev[j - 2] + 1);
      }
    }
    // rotate rows
    for (let j = 0; j <= bl; j++) prevPrev[j] = prev[j];
    const t = prev; prev = curr; curr = t;
  }
  return prev[bl];
}

export function similarityPct(a: string, b: string): number {
  if (!a && !b) return 100;
  const d = damerauLevenshtein(a, b);
  const m = Math.max(a.length, b.length);
  return m === 0 ? 100 : Math.round(((m - d) / m) * 100);
}
