// Setups tab — CRUD for the trader's named strategies + a NetR breakdown
// table that aggregates every imported trade by its `setup` field.

import { useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import type { Setup } from '../lib/types';
import { getSetupBreakdown } from '../lib/setup-breakdown';
import { orcaConfirm } from '@/lib/orca-confirm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

const HE = {
  header: 'ניהול סטאפים',
  sub: 'הגדר את האסטרטגיות שלך וצפה בביצועיהן.',
  newSetup: 'סטאפ חדש',
  name: 'שם',
  color: 'צבע',
  rules: 'כללים / צ׳קליסט',
  save: 'שמור',
  cancel: 'ביטול',
  delete: 'מחק',
  noSetups: 'אין סטאפים מוגדרים — צור אחד כדי לתייג עסקאות.',
  breakdown: 'פילוח NetR לפי סטאפ',
  setup: 'סטאפ',
  count: 'עסקאות',
  netR: 'נטו R',
  winRate: 'אחוז זכייה',
  avgR: 'R ממוצע',
  confirm: 'למחוק את הסטאפ הזה?',
};
const EN = {
  header: 'Setup Manager',
  sub: 'Define your strategies and see how each one performs.',
  newSetup: 'New setup',
  name: 'Name',
  color: 'Color',
  rules: 'Rules / checklist',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  noSetups: 'No setups yet — create one to start tagging trades.',
  breakdown: 'NetR breakdown by setup',
  setup: 'Setup',
  count: 'Trades',
  netR: 'Net R',
  winRate: 'Win rate',
  avgR: 'Avg R',
  confirm: 'Delete this setup?',
};

const PALETTE = ['#00f2ff', '#39FF14', '#ffd700', '#ff8c00', '#ff3b8e', '#8a5cff', '#00d6a3', '#ff6b6b'];

export default function SetupsTab({ T, isRTL, trades, state }: Props) {
  const L = isRTL ? HE : EN;
  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const accent = T?.accent?.cyan || '#00f2ff';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const win = T?.status?.success || '#00ff88';
  const loss = T?.status?.danger || '#ff3b3b';

  const [editing, setEditing] = useState<Setup | null>(null);
  const breakdown = useMemo(() => getSetupBreakdown(trades), [trades]);
  const byName: Record<string, Setup> = useMemo(() => {
    const m: Record<string, Setup> = {};
    for (const s of state.setups) m[s.name] = s;
    return m;
  }, [state.setups]);

  function startNew() {
    setEditing({
      id: `s_${Date.now()}`,
      name: '',
      color: PALETTE[state.setups.length % PALETTE.length],
      rules: '',
      createdAt: new Date().toISOString(),
    });
  }

  async function save() {
    if (!editing || !editing.name.trim()) return;
    const exists = state.setups.find(s => s.id === editing.id);
    const next = exists
      ? state.setups.map(s => (s.id === editing.id ? editing : s))
      : [...state.setups, editing];
    await state.saveSetups(next);
    setEditing(null);
  }

  async function remove(id: string) {
    const ok = await orcaConfirm({
      title: L.confirm,
      confirmLabel: L.delete,
      cancelLabel: L.cancel,
      tone: 'danger',
      isRTL,
    });
    if (!ok) return;
    await state.saveSetups(state.setups.filter(s => s.id !== id));
  }

  // Sorted rows: known setups first by NetR desc, then orphans ("—" / untagged)
  const rows = Object.entries(breakdown)
    .map(([name, s]) => ({ name, ...s, color: byName[name]?.color || muted }))
    .sort((a, b) => b.netR - a.netR);

  const card: React.CSSProperties = {
    padding: 'clamp(14px, 2vw, 20px)',
    background: panel,
    border: `1px solid ${border}`,
    borderRadius: 14,
    boxSizing: 'border-box',
  };
  const label: React.CSSProperties = { color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', color: fg,
    border: `1px solid ${border}`, borderRadius: 8, padding: 10,
    fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ color: accent, fontSize: 10, letterSpacing: 3, fontWeight: 700 }}>SETUPS</div>
          <h2 style={{ margin: '4px 0 0', color: fg, fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 700 }}>{L.header}</h2>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{L.sub}</div>
        </div>
        <button
          onClick={startNew}
          style={{
            padding: '12px 18px', minHeight: 44, borderRadius: 10,
            background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
            color: '#03121f', border: `1px solid ${accent}`,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 12, letterSpacing: 1.5,
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >+ {L.newSetup}</button>
      </div>

      {/* Setup cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {state.setups.length === 0 && (
          <div style={{ ...card, gridColumn: '1 / -1', textAlign: 'center', color: muted, padding: 32 }}>{L.noSetups}</div>
        )}
        {state.setups.map(s => {
          const stat = breakdown[s.name];
          return (
            <div key={s.id} style={{ ...card, borderLeft: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ color: fg, fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditing(s)} style={smallBtn(border, muted)} aria-label="edit">✎</button>
                  <button onClick={() => remove(s.id)} style={smallBtn(border, loss)} aria-label="delete">✕</button>
                </div>
              </div>
              {s.rules && (
                <div style={{ marginTop: 8, color: muted, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{s.rules}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                <Mini label={L.count}   v={stat ? String(stat.count) : '0'} color={fg} muted={muted} />
                <Mini label={L.netR}    v={fmtR(stat?.netR || 0)} color={(stat?.netR || 0) >= 0 ? win : loss} muted={muted} />
                <Mini label={L.winRate} v={stat ? `${Math.round(stat.winRate * 100)}%` : '—'} color={fg} muted={muted} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown table */}
      <div style={card}>
        <div style={{ ...label, marginBottom: 12 }}>{L.breakdown}</div>
        {rows.length === 0 ? (
          <div style={{ color: muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              <thead>
                <tr style={{ color: muted, textAlign: isRTL ? 'right' : 'left' }}>
                  <Th>{L.setup}</Th><Th align="right">{L.count}</Th><Th align="right">{L.netR}</Th><Th align="right">{L.winRate}</Th><Th align="right">{L.avgR}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name} style={{ borderTop: `1px solid ${border}`, color: fg }}>
                    <Td>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: r.color, marginInlineEnd: 8, verticalAlign: 'middle' }} />
                      {r.name}
                    </Td>
                    <Td align="right">{r.count}</Td>
                    <Td align="right" style={{ color: r.netR >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(r.netR)}</Td>
                    <Td align="right">{Math.round(r.winRate * 100)}%</Td>
                    <Td align="right" style={{ color: r.avgR >= 0 ? win : loss }}>{fmtR(r.avgR)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(2,8,16,0.72)', zIndex: 100,
            display: 'grid', placeItems: 'center', padding: 16, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ ...card, width: 'min(440px, 100%)', background: T?.bg?.primary || '#061326', border: `1px solid ${border}` }}
          >
            <div style={{ color: accent, fontSize: 10, letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>
              {editing.name ? 'EDIT' : 'NEW'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{L.name}</div>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inputStyle} autoFocus />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{L.color}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, color: c })}
                    style={{
                      width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                      border: editing.color === c ? `2px solid ${fg}` : `1px solid ${border}`,
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{L.rules}</div>
              <textarea
                rows={5} value={editing.rules || ''} maxLength={3000}
                onChange={e => setEditing({ ...editing, rules: e.target.value.slice(0, 3000) })}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditing(null)} style={ghostBtn(border, muted)}>{L.cancel}</button>
              <button onClick={save} style={primaryBtn(accent)}>{L.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}
function Mini({ label, v, color, muted }: { label: string; v: string; color: string; muted: string }) {
  return (
    <div>
      <div style={{ color: muted, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color, fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{v}</div>
    </div>
  );
}
function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textAlign: align || 'inherit', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align, style }: { children: React.ReactNode; align?: 'right' | 'left'; style?: React.CSSProperties }) {
  return <td style={{ padding: '8px 10px', textAlign: align || 'inherit', ...style }}>{children}</td>;
}
function smallBtn(border: string, color: string): React.CSSProperties {
  return { width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${border}`, color, cursor: 'pointer', fontSize: 12 };
}
function primaryBtn(accent: string): React.CSSProperties {
  return {
    padding: '10px 16px', minHeight: 40, borderRadius: 8,
    background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: '#03121f',
    border: `1px solid ${accent}`, fontFamily: 'inherit', fontWeight: 700,
    fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
  };
}
function ghostBtn(border: string, muted: string): React.CSSProperties {
  return {
    padding: '10px 16px', minHeight: 40, borderRadius: 8,
    background: 'transparent', color: muted, border: `1px solid ${border}`,
    fontFamily: 'inherit', fontWeight: 600, fontSize: 12, letterSpacing: 1.5,
    textTransform: 'uppercase', cursor: 'pointer',
  };
}
