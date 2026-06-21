import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const RPCS = [
  ["admin_sanity_counts", {}],
  ["admin_db_storage", {}],
  ["admin_ai_usage", { p_period: 90, p_feature: null }],
  ["admin_active_count", { p_window: 7 }],
  ["admin_subscriptions", {}],
  ["admin_trader_matrix_full", { p_sort: "behavioural_risk", p_dir: "desc", p_limit: 500, p_tier: null, p_archetype: null }],
  ["admin_trader_mind", {}],
  ["admin_performance", { p_archetype: null, p_tier: null }],
  ["admin_risk_engine", { p_tier: null }],
  ["admin_benchmarks", { p_kmin: 25 }],
  ["admin_engagement_weekly", { p_period: 90 }],
  ["admin_activity_heatmap", { p_period: 90 }],
  ["admin_retention_cohorts", { p_cohorts: 8 }],
  ["admin_activation_funnel", {}],
  ["admin_data_quality", {}],
];

const REQUIRED_KEYS = {
  admin_activity_heatmap: ["dow", "hour", "n"],
  admin_activation_funnel: ["stage", "n"],
  admin_engagement_weekly: ["week", "active", "signups", "trades"],
  admin_db_storage: ["table_name", "size_bytes"],
  admin_trader_matrix_full: ["code", "tier", "archetype"],
  admin_retention_cohorts: ["cohort", "size"],
};

const css = {
  page: { minHeight: "100vh", background: "#0E1420", color: "#EAEFF7", fontFamily: "ui-monospace, Menlo, monospace", padding: 24 },
  card: { background: "#161D2B", border: "1px solid #27313F", borderRadius: 10, padding: 16, marginBottom: 16 },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#9CA8BB", borderBottom: "1px solid #27313F", whiteSpace: "nowrap" },
  td: { padding: "7px 10px", fontSize: 12, borderBottom: "1px solid #1B2433", verticalAlign: "top" },
  pass: { color: "#34D399", fontWeight: 700 },
  fail: { color: "#FB7185", fontWeight: 700 },
  pill: (ok) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: ok ? "rgba(52,211,153,0.15)" : "rgba(251,113,133,0.15)", color: ok ? "#34D399" : "#FB7185" }),
};

export default function OrcaDiagnostics() {
  const [rows, setRows] = useState([]);
  const [sanity, setSanity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consoleErrors, setConsoleErrors] = useState(0);

  useEffect(() => {
    let errs = 0;
    const orig = console.error;
    console.error = (...a) => { errs++; setConsoleErrors(errs); orig(...a); };
    return () => { console.error = orig; };
  }, []);

  useEffect(() => {
    (async () => {
      const results = await Promise.all(RPCS.map(async ([name, args]) => {
        const t0 = performance.now();
        try {
          const { data, error } = await supabase.rpc(name, args);
          const ms = Math.round(performance.now() - t0);
          const arr = Array.isArray(data) ? data : (data == null ? [] : [data]);
          const first = arr[0];
          const keys = first && typeof first === "object" ? Object.keys(first) : [];
          const required = REQUIRED_KEYS[name] || [];
          const missingKeys = required.filter((k) => first && !(k in first));
          return { name, called: true, ms, rows: arr.length, keys, error: error ? (error.message || String(error)) : null, missingKeys, raw: arr };
        } catch (e) {
          return { name, called: false, ms: 0, rows: 0, keys: [], error: e?.message || String(e), missingKeys: [], raw: [] };
        }
      }));
      setRows(results);
      const s = results.find((r) => r.name === "admin_sanity_counts");
      setSanity(s?.raw?.[0] || null);
      setLoading(false);
    })();
  }, []);

  const matrix = rows.find((r) => r.name === "admin_trader_matrix_full");
  const matrixOverSanity = sanity && matrix ? matrix.rows > Number(sanity.users || 0) : false;

  const checks = rows.map((r) => {
    if (!r.called || r.error) return { ...r, status: "FAIL", reason: r.error || "not called" };
    if (r.missingKeys.length) return { ...r, status: "FAIL", reason: `missing keys: ${r.missingKeys.join(", ")}` };
    if (r.name === "admin_trader_matrix_full" && matrixOverSanity) return { ...r, status: "FAIL", reason: `rows(${r.rows}) > users(${sanity?.users})` };
    return { ...r, status: "PASS", reason: "" };
  });

  const allGreen = checks.every((c) => c.status === "PASS") && consoleErrors === 0;

  return (
    <div style={css.page} dir="ltr">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 18, color: "#00f2ff", fontFamily: "Poppins,sans-serif" }}>ORCA Console — Diagnostics</h1>
        <Link to="/console" style={{ color: "#9CA8BB", fontSize: 12, textDecoration: "none", border: "1px solid #27313F", padding: "6px 12px", borderRadius: 6 }}>← Back to Console</Link>
      </div>

      {loading && <div style={css.card}>Running 15 RPCs…</div>}

      {!loading && (
        <>
          <div style={{ ...css.card, background: allGreen ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)", border: `1px solid ${allGreen ? "#34D399" : "#FB7185"}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: allGreen ? "#34D399" : "#FB7185" }}>
              {allGreen ? "✓ ALL GREEN — every RPC PASS, no sanity violations, no console errors" : `✗ ISSUES DETECTED — ${checks.filter((c) => c.status === "FAIL").length} FAIL, ${consoleErrors} console error(s)`}
            </div>
          </div>

          <div style={css.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#EAEFF7" }}>GROUND TRUTH · admin_sanity_counts()</div>
            {sanity ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[["users", sanity.users], ["traders_with_trades", sanity.traders_with_trades], ["total_trades", sanity.total_trades], ["subscriptions", sanity.subscriptions]].map(([k, v]) => (
                  <div key={k} style={{ background: "#0E1420", border: "1px solid #27313F", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#6E7A8E", textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontSize: 22, color: "#00f2ff", fontWeight: 700 }}>{String(v ?? "—")}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: "#FB7185" }}>sanity counts unavailable</div>}
            {matrix && sanity && (
              <div style={{ marginTop: 12, fontSize: 12, color: matrixOverSanity ? "#FB7185" : "#34D399" }}>
                trader_matrix_full rows: <b>{matrix.rows}</b> · platform users: <b>{sanity.users}</b> · {matrixOverSanity ? "FAIL — seed data leaking" : "OK (rows ≤ users)"}
              </div>
            )}
          </div>

          <div style={css.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>RPC REGISTRY ({checks.length} functions)</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={css.th}>RPC</th>
                  <th style={css.th}>Status</th>
                  <th style={css.th}>Called</th>
                  <th style={css.th}>Rows</th>
                  <th style={css.th}>ms</th>
                  <th style={css.th}>First-row keys</th>
                  <th style={css.th}>Error / Reason</th>
                </tr></thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...css.td, color: "#00f2ff" }}>{c.name}</td>
                      <td style={css.td}><span style={css.pill(c.status === "PASS")}>{c.status}</span></td>
                      <td style={css.td}>{c.called ? "yes" : "no"}</td>
                      <td style={{ ...css.td, fontFamily: "monospace" }}>{c.rows}</td>
                      <td style={{ ...css.td, color: "#9CA8BB" }}>{c.ms}</td>
                      <td style={{ ...css.td, color: "#9CA8BB", maxWidth: 320, wordBreak: "break-all" }}>{c.keys.join(", ") || "—"}</td>
                      <td style={{ ...css.td, color: c.status === "FAIL" ? "#FB7185" : "#6E7A8E" }}>{c.reason || c.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...css.card, fontSize: 11, color: "#6E7A8E" }}>
            Console errors captured since mount: <b style={{ color: consoleErrors > 0 ? "#FB7185" : "#34D399" }}>{consoleErrors}</b>
          </div>
        </>
      )}
    </div>
  );
}
