/**
 * ImportPreflightModal — Stage 1 (read-only).
 *
 * Listens for 'orca:uie:preflight' events from runImportWithPreflight, renders the
 * mapping table + gap report + equity preview, and resolves the caller's promise
 * with { confirm: true|false }. No editing controls in this stage.
 *
 * Mounted once in App.tsx.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { PreflightOpenDetail } from '@/lib/uie/run-import-with-preflight';
import type { FieldMatch, GapItem, ImportResult } from '@/lib/uie/types';
import { FIELD_TAXONOMY } from '@/lib/uie/dictionary/canonical-fields';

type Open = PreflightOpenDetail | null;

function isRTLDoc() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl' || document.documentElement.lang === 'he';
}

function statusChip(status: FieldMatch['status']) {
  if (status === 'auto') return { color: '#10b981', label: '🟢' };
  if (status === 'suggested') return { color: '#f59e0b', label: '🟡' };
  return { color: '#ef4444', label: '🔴' };
}

function severityColor(s: GapItem['severity']) {
  if (s === 'blocker') return '#ef4444';
  if (s === 'warning') return '#f59e0b';
  return '#3b82f6';
}

export function ImportPreflightRoot() {
  const [open, setOpen] = useState<Open>(null);
  const rtl = isRTLDoc();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<PreflightOpenDetail>;
      setOpen(ce.detail);
    };
    window.addEventListener('orca:uie:preflight', onOpen as EventListener);
    return () => window.removeEventListener('orca:uie:preflight', onOpen as EventListener);
  }, []);

  const close = useCallback((confirm: boolean) => {
    if (!open) return;
    try { open.resolve({ confirm }); } catch { /* */ }
    setOpen(null);
  }, [open]);

  if (!open) return null;

  const r = open.result;
  const headers = r.structure.headers;
  // map FieldMatch[] keyed by columnIndex
  const matchByCol = new Map<number, FieldMatch>();
  for (const m of r.mapping) matchByCol.set(m.columnIndex, m);

  // Build display rows: every header column → matched field (or unmapped)
  const rows = headers.map((h, i) => {
    const fm = matchByCol.get(i + r.structure.regionCols[0]) || matchByCol.get(i);
    return { idx: i, header: h || `(${i + 1})`, fm };
  });

  const readinessColor = r.gap.readiness >= 80 ? '#10b981' : r.gap.readiness >= 50 ? '#f59e0b' : '#ef4444';
  const equityPoints = r.equityEvents.filter((e) => e.type === 'balance_snapshot');

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at top, rgba(6,19,38,0.92), rgba(2,8,18,0.97))',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'orcaUieFadeIn 220ms ease-out',
        fontFamily: 'Poppins, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes orcaUieFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes orcaUieScaleIn { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
      <div
        style={{
          width: 'min(1100px, 96vw)', maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0a1628 0%, #061326 100%)',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.08) inset',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'orcaUieScaleIn 260ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(148,163,184,0.12)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛰️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', letterSpacing: 0.2 }}>
              {rtl ? 'Preflight ייבוא — בדיקת קובץ' : 'Import Preflight — File Review'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>
              {open.fileName} · sheet: {r.sheetName} · archetype: {r.archetype}
            </div>
          </div>
          <button
            onClick={() => close(false)}
            aria-label="close"
            style={{ background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Readiness + Counts */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={{
              minWidth: 200, padding: '18px 22px', borderRadius: 14,
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.12)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `conic-gradient(${readinessColor} ${r.gap.readiness * 3.6}deg, rgba(148,163,184,0.15) 0)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: readinessColor, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {r.gap.readiness}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{rtl ? 'מוכנות' : 'Readiness'}</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>{rtl ? 'מצב מיפוי כולל' : 'Overall mapping quality'}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>units: {r.gap.unitsMode}</div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 280, padding: '18px 22px', borderRadius: 14, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{rtl ? 'מונים' : 'Counts'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {[
                  { k: rtl ? 'סגורות' : 'Closed', v: r.gap.counts.tradesClosed, c: '#10b981' },
                  { k: rtl ? 'פתוחות' : 'Open', v: r.gap.counts.tradesOpen, c: '#38bdf8' },
                  { k: rtl ? 'יתרה' : 'Equity', v: r.gap.counts.equityEvents, c: '#a78bfa' },
                  { k: rtl ? 'דולגו' : 'Skipped', v: r.gap.counts.rowsSkipped, c: '#94a3b8' },
                  { k: rtl ? 'כפילויות' : 'Duplicates', v: r.gap.counts.duplicates, c: '#f59e0b' },
                ].map((x) => (
                  <div key={x.k} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: x.c, fontFamily: 'IBM Plex Mono, monospace' }}>{x.v}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{x.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mapping table */}
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
              {rtl ? 'מיפוי עמודות' : 'Column Mapping'} · {rows.length}
            </div>
            <div style={{ border: '1px solid rgba(148,163,184,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 60px 2fr', padding: '10px 14px', background: 'rgba(15,23,42,0.85)', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
                <div>#</div>
                <div>{rtl ? 'עמודה מקור' : 'Source column'}</div>
                <div>{rtl ? 'שדה קנוני' : 'Canonical field'}</div>
                <div style={{ textAlign: 'center' }}>{rtl ? 'ודאות' : 'Conf.'}</div>
                <div>{rtl ? 'ראיות' : 'Evidence'}</div>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {rows.map((row) => {
                  const fm = row.fm;
                  const chip = fm ? statusChip(fm.status) : statusChip('unmapped');
                  return (
                    <div key={row.idx} style={{
                      display: 'grid', gridTemplateColumns: '32px 1fr 1fr 60px 2fr',
                      padding: '10px 14px', borderTop: '1px solid rgba(148,163,184,0.08)',
                      fontSize: 12, color: '#cbd5e1', alignItems: 'center',
                    }}>
                      <div style={{ color: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}>{row.idx + 1}</div>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.header}</div>
                      <div style={{ color: fm?.field ? '#38bdf8' : '#64748b' }}>
                        {fm?.field || (rtl ? '— לא ממופה —' : '— unmapped —')}
                        {fm?.destination ? <span style={{ marginLeft: 6, marginRight: 6, fontSize: 10, color: '#64748b' }}>· {fm.destination}</span> : null}
                      </div>
                      <div style={{ textAlign: 'center', color: chip.color, fontSize: 16 }}>{chip.label}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fm?.evidence?.length ? fm.evidence.join(' · ') : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gap items */}
          {r.gap.items.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
                {rtl ? 'דוח פערים' : 'Gap Report'} · {r.gap.items.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.gap.items.map((it, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(15,23,42,0.6)', border: `1px solid ${severityColor(it.severity)}33`,
                    borderLeft: `3px solid ${severityColor(it.severity)}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#cbd5e1' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${severityColor(it.severity)}22`, color: severityColor(it.severity), textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'IBM Plex Mono, monospace' }}>
                        {it.severity}
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{it.code}</span>
                      <span style={{ flex: 1 }}>{rtl ? it.he : it.en}</span>
                    </div>
                    {it.fix && (
                      <div style={{ marginTop: 6, paddingLeft: 8, fontSize: 11, color: '#64748b' }}>
                        💡 {rtl ? it.fix.he : it.fix.en}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equity preview — BALANCE CONTRACT */}
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
              {rtl ? 'יתרה מהקובץ — מקור האמת' : 'Balance from file — source of truth'}
            </div>
            {equityPoints.length > 0 ? (
              <div style={{ border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', background: 'rgba(167,139,250,0.08)', fontSize: 11, color: '#a78bfa', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {equityPoints.length} {rtl ? 'נקודות יתרה — יוחלפו בגרף ה-Equity במקום קו 0-המצטבר' : 'balance snapshots — will replace the 0-based cumulative line'}
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {equityPoints.slice(0, 50).map((e, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '6px 14px', borderTop: '1px solid rgba(148,163,184,0.08)', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
                      <div style={{ color: '#cbd5e1' }}>{e.date}</div>
                      <div style={{ color: '#10b981', textAlign: rtl ? 'left' : 'right' }}>{e.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {e.currency || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '14px 16px', borderRadius: 12,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontSize: 12, lineHeight: 1.6,
              }}>
                ⚠️ {rtl
                  ? 'אין נתוני יתרה בקובץ. גרף ה-P&L יוצג כקו מצטבר מ-0 — לא הון אמיתי.'
                  : 'No balance data in file. P&L chart will be cumulative-from-0, not real equity.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(148,163,184,0.12)', display: 'flex', gap: 12, justifyContent: rtl ? 'flex-start' : 'flex-end', background: 'rgba(2,8,18,0.5)' }}>
          <button
            onClick={() => close(false)}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: 'transparent', color: '#cbd5e1', cursor: 'pointer',
              border: '1px solid rgba(148,163,184,0.25)', fontFamily: 'Poppins, sans-serif',
            }}
          >
            {rtl ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', color: '#0a1628',
              border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              boxShadow: '0 4px 14px rgba(56,189,248,0.35)',
            }}
          >
            {rtl ? `אשר וייבא · ${r.trades.length}` : `Confirm & Import · ${r.trades.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
