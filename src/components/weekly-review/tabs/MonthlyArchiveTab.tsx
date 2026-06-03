// Monthly Archive — historical weeks grouped by month with an inline
// expand/edit row plus an AI-free recap field per month (free-form markdown).

import { Fragment, useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import type { MonthlyRecap, WeekRecord } from '../lib/types';
import { GRADE_COLORS } from '../lib/grading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

const HE = {
  header: 'ארכיון חודשי',
  sub: 'כל השבועות הסגורים, מקובצים לפי חודש.',
  empty: 'עוד אין שבועות סגורים. סגור שבוע ב"סיכום שבועי".',
  week: 'שבוע', netR: 'נטו R', trades: 'עסקאות', wr: 'WR', grade: 'ציון',
  recap: 'סיכום חודשי', recapPh: 'מה למדת החודש? אילו דפוסים חזרו על עצמם?',
  saveRecap: 'שמור סיכום', delete: 'מחק שבוע', confirm: 'למחוק את השבוע הזה?',
  monthNet: 'נטו חודשי', monthTrades: 'עסקאות', monthWR: 'אחוז זכייה',
  reflection: 'רפלקציה', mindset: 'מצב מנטלי',
};
const EN = {
  header: 'Monthly Archive',
  sub: 'All closed weeks, grouped by month.',
  empty: 'No closed weeks yet. Close a week from the Weekly Summary tab.',
  week: 'Week', netR: 'Net R', trades: 'Trades', wr: 'WR', grade: 'Grade',
  recap: 'Monthly recap', recapPh: 'What did you learn this month? Which patterns repeated?',
  saveRecap: 'Save recap', delete: 'Delete week', confirm: 'Delete this week?',
  monthNet: 'Month Net', monthTrades: 'Trades', monthWR: 'Win rate',
  reflection: 'Reflection', mindset: 'Mindset',
};

function monthKey(weekEnding: string) { return weekEnding.slice(0, 7); }

export default function MonthlyArchiveTab({ T, isRTL, trades, state }: Props) {
  const L = isRTL ? HE : EN;
  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const accent = T?.accent?.cyan || '#00f2ff';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const win = T?.status?.success || '#00ff88';
  const loss = T?.status?.danger || '#ff3b3b';

  const [expanded, setExpanded] = useState<string | null>(null);
  const [recapDraft, setRecapDraft] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const map = new Map<string, WeekRecord[]>();
    for (const w of state.archive) {
      const k = monthKey(w.weekEndingISO);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(w);
    }
    return Array.from(map.entries())
      .map(([k, weeks]) => ({
        monthKey: k,
        weeks: weeks.sort((a, b) => b.weekEndingISO.localeCompare(a.weekEndingISO)),
        netR: weeks.reduce((s, w) => s + (w.netR || 0), 0),
        trades: weeks.reduce((s, w) => s + (w.tradeLog?.length || 0), 0),
        wins: weeks.reduce((s, w) => s + (w.wins || 0), 0),
        losses: weeks.reduce((s, w) => s + (w.losses || 0), 0),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [state.archive]);

  // Live monthly aggregates — pulls EVERY trade from the journal (not only
  // closed-week snapshots) so the user always sees full reality with R + $.
  const liveMonths = useMemo(() => {
    const map = new Map<string, { mk: string; trades: number; wins: number; losses: number; netR: number; netUSD: number }>();
    for (const t of trades) {
      const d = t.date ? new Date(t.date.replace(' ', 'T')) : null;
      if (!d || isNaN(d.getTime())) continue;
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(mk)) map.set(mk, { mk, trades: 0, wins: 0, losses: 0, netR: 0, netUSD: 0 });
      const m = map.get(mk)!;
      m.trades += 1;
      m.netR += Number(t.returnR) || 0;
      m.netUSD += Number(t.pnl) || 0;
      if (t.winLoss === 'Win') m.wins += 1;
      else if (t.winLoss === 'Loss') m.losses += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.mk.localeCompare(a.mk));
  }, [trades]);

  const fmtUSD = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    const abs = Math.abs(v);
    const s = abs >= 1000 ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 }) : abs.toFixed(2);
    return `${v < 0 ? '-' : v > 0 ? '+' : ''}$${s}`;
  };
  const fmtR = (n: number) => `${n >= 0 ? '+' : ''}${(Number(n) || 0).toFixed(2)}R`;

  async function removeWeek(weekKey: string) {
    if (!window.confirm(L.confirm)) return;
    await state.saveArchive(state.archive.filter(w => w.weekKey !== weekKey));
  }

  async function saveRecap(mk: string) {
    const md = recapDraft[mk] ?? state.recaps[mk]?.markdown ?? '';
    const next: Record<string, MonthlyRecap> = {
      ...state.recaps,
      [mk]: { monthKey: mk, markdown: md, updatedAt: new Date().toISOString() },
    };
    await state.saveRecaps(next);
  }

  const card: React.CSSProperties = {
    padding: 'clamp(14px, 2vw, 20px)', background: panel,
    border: `1px solid ${border}`, borderRadius: 14, boxSizing: 'border-box',
  };
  const label: React.CSSProperties = { color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 };

  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 32 }}>
      <div>
        <div style={{ color: accent, fontSize: 10, letterSpacing: 3, fontWeight: 700 }}>ARCHIVE</div>
        <h2 style={{ margin: '4px 0 0', color: fg, fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 700 }}>{L.header}</h2>
        <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{L.sub}</div>
      </div>

      {/* ── Live journal months (pulls every trade, R + $) ── */}
      {liveMonths.length > 0 && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 10 }}>
            {isRTL ? 'נתוני יומן חיים — כל חודש מהמסחר שלך' : 'Live journal months — every trade, every month'}
          </div>
          <div style={{ overflowX: 'auto', border: `1px solid ${border}`, borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              <thead>
                <tr style={{ color: muted, background: 'rgba(0,0,0,0.18)', textAlign: isRTL ? 'right' : 'left' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>{isRTL ? 'חודש' : 'Month'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.trades}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.netR}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>$ P&amp;L</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>WR</th>
                </tr>
              </thead>
              <tbody>
                {liveMonths.map(m => {
                  const wr = m.wins + m.losses ? m.wins / (m.wins + m.losses) : 0;
                  return (
                    <tr key={m.mk} style={{ borderTop: `1px solid ${border}`, color: fg }}>
                      <td style={{ padding: '8px 10px' }}>{m.mk}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{m.trades}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: m.netR >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(m.netR)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: m.netUSD >= 0 ? win : loss, fontWeight: 700 }}>{fmtUSD(m.netUSD)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Math.round(wr * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: muted, padding: 32 }}>{L.empty}</div>
      )}


      {groups.map(g => {
        const wr = g.wins + g.losses ? g.wins / (g.wins + g.losses) : 0;
        const recap = recapDraft[g.monthKey] ?? state.recaps[g.monthKey]?.markdown ?? '';
        return (
          <div key={g.monthKey} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ ...label }}>MONTH</div>
                <div style={{ color: fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700 }}>{g.monthKey}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Stat label={L.monthNet}    v={fmtR(g.netR)} color={g.netR >= 0 ? win : loss} muted={muted} />
                <Stat label={L.monthTrades} v={String(g.trades)} color={fg} muted={muted} />
                <Stat label={L.monthWR}     v={`${Math.round(wr * 100)}%`} color={fg} muted={muted} />
              </div>
            </div>

            {/* Weeks table */}
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: muted, textAlign: isRTL ? 'right' : 'left' }}>
                    <Th>{L.week}</Th><Th align="right">{L.netR}</Th><Th align="right">{L.trades}</Th>
                    <Th align="right">{L.wr}</Th><Th align="center">{L.grade}</Th><Th />
                  </tr>
                </thead>
                <tbody>
                  {g.weeks.map(w => {
                    const wkWR = w.wins + w.losses ? w.wins / (w.wins + w.losses) : 0;
                    const isOpen = expanded === w.weekKey;
                    return (
                      <Fragment key={w.weekKey}>
                        <tr key={w.weekKey} style={{ borderTop: `1px solid ${border}`, color: fg, cursor: 'pointer' }}
                            onClick={() => setExpanded(isOpen ? null : w.weekKey)}>
                          <Td>{w.weekKey} <span style={{ color: muted }}>({w.weekEndingISO})</span></Td>
                          <Td align="right" style={{ color: w.netR >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(w.netR)}</Td>
                          <Td align="right">{w.tradeLog?.length || 0}</Td>
                          <Td align="right">{Math.round(wkWR * 100)}%</Td>
                          <Td align="center">
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                              background: `${GRADE_COLORS[w.grade]}1a`,
                              color: GRADE_COLORS[w.grade],
                              border: `1px solid ${GRADE_COLORS[w.grade]}66`,
                              fontWeight: 700, fontSize: 11,
                            }}>{w.grade}</span>
                          </Td>
                          <Td align="right">
                            <button onClick={e => { e.stopPropagation(); removeWeek(w.weekKey); }}
                                    style={{ background: 'transparent', border: `1px solid ${border}`, color: loss, borderRadius: 6, width: 26, height: 26, cursor: 'pointer' }}
                                    aria-label="delete">✕</button>
                          </Td>
                        </tr>
                        {isOpen && (
                          <tr style={{ background: 'rgba(0,0,0,0.18)' }}>
                            <td colSpan={6} style={{ padding: 16 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                <Block label={L.reflection} body={w.reflection || '—'} fg={fg} muted={muted} border={border} />
                                <Block label={L.mindset}
                                       body={w.mindset
                                         ? `F:${w.mindset.focus} · C:${w.mindset.confidence} · D:${w.mindset.discipline}${w.mindset.emotion ? ` · ${w.mindset.emotion}` : ''}${w.mindset.notes ? `\n${w.mindset.notes}` : ''}`
                                         : '—'}
                                       fg={fg} muted={muted} border={border} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recap */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}` }}>
              <div style={{ ...label, marginBottom: 8 }}>{L.recap}</div>
              <textarea
                rows={4} value={recap} placeholder={L.recapPh}
                onChange={e => setRecapDraft({ ...recapDraft, [g.monthKey]: e.target.value })}
                style={{
                  width: '100%', background: 'transparent', color: fg,
                  border: `1px solid ${border}`, borderRadius: 8, padding: 10,
                  fontFamily: 'inherit', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box', resize: 'vertical', minHeight: 100,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => saveRecap(g.monthKey)} style={{
                  padding: '8px 14px', minHeight: 36, borderRadius: 8,
                  background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                  color: '#03121f', border: `1px solid ${accent}`,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>{L.saveRecap}</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}
function Stat({ label, v, color, muted }: { label: string; v: string; color: string; muted: string }) {
  return (
    <div>
      <div style={{ color: muted, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ color, fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 700, marginTop: 2 }}>{v}</div>
    </div>
  );
}
function Block({ label, body, fg, muted, border }: { label: string; body: string; fg: string; muted: string; border: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${border}` }}>
      <div style={{ color: muted, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ color: fg, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</div>
    </div>
  );
}
function Th({ children, align }: { children?: React.ReactNode; align?: 'right' | 'left' | 'center' }) {
  return <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textAlign: align || 'inherit', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align, style }: { children?: React.ReactNode; align?: 'right' | 'left' | 'center'; style?: React.CSSProperties }) {
  return <td style={{ padding: '8px 10px', textAlign: align || 'inherit', ...style }}>{children}</td>;
}
