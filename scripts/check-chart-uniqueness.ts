/**
 * Phase 3 lint — fails if any chartId appears more than once or claims
 * two canonical homes. Run via `bunx tsx scripts/check-chart-uniqueness.ts`.
 * Exits non-zero on violation so CI can gate merges.
 */
import { CHART_REGISTRY } from '../src/lib/chart-registry';

const seenIds = new Map<string, number>();
const seenHomeKey = new Map<string, string>(); // `${id}|${home}` → first occurrence

let violations = 0;

for (const spec of CHART_REGISTRY) {
  const n = (seenIds.get(spec.id) ?? 0) + 1;
  seenIds.set(spec.id, n);
  if (n > 1) {
    console.error(`✗ duplicate chartId: "${spec.id}" appears ${n} times`);
    violations++;
  }
  const key = `${spec.id}|${spec.home}`;
  if (seenHomeKey.has(key) && seenHomeKey.get(key) !== spec.id) {
    console.error(`✗ chart "${spec.id}" claims multiple canonical homes`);
    violations++;
  }
  seenHomeKey.set(key, spec.id);
  if (spec.mirrorOn?.includes(spec.home)) {
    console.error(`✗ "${spec.id}": home "${spec.home}" appears in mirrorOn`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`\n[chart-registry] ${violations} violation(s) — failing.`);
  process.exit(1);
}
console.log(`[chart-registry] OK · ${CHART_REGISTRY.length} charts, all unique.`);
