/**
 * RegistryAuditPanel — dev-only surface that visualizes the chart registry
 * and dashboard matrix. Use it to catch duplicate placements, orphans, and
 * locked cells before they reach production.
 *
 * Mount lazily behind a hidden route or a settings flag — not part of the
 * normal user flow. Pure read-only inspection.
 */
import { useMemo } from 'react';
import {
  CHART_REGISTRY,
  ALL_CHART_IDS,
  type ChartHome,
} from '@/lib/chart-registry';
import {
  DASHBOARD_MATRIX,
  WIDGETS,
  type Experience,
  type DashState,
} from '@/lib/dashboard-matrix';

const HOMES: ChartHome[] = ['dashboard', 'analytics', 'risk', 'psychology', 'quantlab', 'calendar'];
const EXPS: Experience[] = ['beginner', 'standard', 'alpha'];
const STATES: DashState[] = ['live', 'review', 'research'];

export const RegistryAuditPanel = () => {
  const issues = useMemo(() => {
    const out: string[] = [];

    // Duplicate IDs
    const seen = new Set<string>();
    for (const c of CHART_REGISTRY) {
      if (seen.has(c.id)) out.push(`Duplicate chart id: ${c.id}`);
      seen.add(c.id);
      if (c.mirrorOn?.includes(c.home)) {
        out.push(`${c.id}: home (${c.home}) also listed in mirrorOn`);
      }
    }

    // Orphan widgets (declared but never placed in any cell)
    const placed = new Set<string>();
    for (const e of EXPS) {
      for (const s of STATES) {
        for (const w of DASHBOARD_MATRIX[e][s] ?? []) placed.add(w);
      }
    }
    for (const id of Object.keys(WIDGETS)) {
      if (!placed.has(id)) out.push(`Orphan widget: ${id} (declared, never placed)`);
    }
    return out;
  }, []);

  const cellCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of EXPS) for (const s of STATES) {
      m[`${e}/${s}`] = DASHBOARD_MATRIX[e][s]?.length ?? 0;
    }
    return m;
  }, []);

  const byHome = useMemo(() => {
    const m: Record<ChartHome, number> = { dashboard: 0, analytics: 0, risk: 0, psychology: 0, quantlab: 0, calendar: 0 };
    for (const c of CHART_REGISTRY) m[c.home]++;
    return m;
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "'IBM Plex Mono', monospace", color: '#cbd5e1', background: '#061326', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 18, marginBottom: 16, color: '#00f2ff' }}>Registry &amp; Matrix Audit</h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>INTEGRITY</h2>
        {issues.length === 0 ? (
          <div style={{ color: '#06d6a0' }}>✓ No issues — {CHART_REGISTRY.length} charts, {ALL_CHART_IDS.length} ids, {Object.keys(WIDGETS).length} widgets.</div>
        ) : (
          <ul>{issues.map((i, k) => <li key={k} style={{ color: '#f87171' }}>⚠ {i}</li>)}</ul>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>CHARTS BY HOME</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {HOMES.map(h => (
            <div key={h} style={{ padding: '8px 12px', border: '1px solid #1e293b', borderRadius: 6 }}>
              <div style={{ fontSize: 10, opacity: 0.6 }}>{h.toUpperCase()}</div>
              <div style={{ fontSize: 18, color: '#00f2ff' }}>{byHome[h]}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>MATRIX (widget count per cell)</h2>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th style={{ padding: 6, textAlign: 'left' }}></th>{STATES.map(s => <th key={s} style={{ padding: 6, textAlign: 'left' }}>{s}</th>)}</tr></thead>
          <tbody>
            {EXPS.map(e => (
              <tr key={e}>
                <td style={{ padding: 6, opacity: 0.7 }}>{e}</td>
                {STATES.map(s => {
                  const cell = DASHBOARD_MATRIX[e][s];
                  return (
                    <td key={s} style={{ padding: 6, color: cell === null ? '#64748b' : '#cbd5e1' }}>
                      {cell === null ? '🔒 locked' : `${cellCount[`${e}/${s}`]} widgets`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>FULL CHART LIST</h2>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
          <thead><tr style={{ textAlign: 'left', opacity: 0.6 }}><th style={{ padding: 4 }}>id</th><th>home</th><th>category</th><th>tiers</th></tr></thead>
          <tbody>
            {CHART_REGISTRY.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #1e293b' }}>
                <td style={{ padding: 4, color: '#00f2ff' }}>{c.id}</td>
                <td style={{ padding: 4 }}>{c.home}</td>
                <td style={{ padding: 4, opacity: 0.7 }}>{c.category}</td>
                <td style={{ padding: 4, opacity: 0.7 }}>{c.tiers?.join(', ') ?? 'all'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default RegistryAuditPanel;
