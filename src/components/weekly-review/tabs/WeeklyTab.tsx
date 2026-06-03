// Weekly Summary tab — native rebuild of the legacy "סיכום שבועי ⚡".
// Shows the running totals for the current ISO week, a mindset capture,
// a weekly reflection field, and the close-week action that snapshots
// the result into the cloud-backed archive.

import { useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { useWeekAggregates } from '../hooks/use-week-aggregates';
import { gradeWeek, GRADE_COLORS } from '../lib/grading';
import { isFriday } from '../lib/week-key';
import type { MindsetSnapshot, WeekRecord } from '../lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { T: any; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

const HE = {
  header: 'סיכום שבועי',
  sub: 'שבוע נוכחי — מסתגר ביום שישי',
  weekKey: 'מפתח שבוע',
  netR: 'נטו R',
  trades: 'עסקאות',
  winRate: 'אחוז זכייה',
  compliance: 'משמעת',
  grade: 'דירוג',
  best: 'הטוב ביותר',
  worst: 'הגרוע ביותר',
  mindset: 'מצב מנטלי',
  focus: 'מיקוד',
  confidence: 'ביטחון',
  discipline: 'משמעת',
  emotion: 'רגש דומיננטי',
  notes: 'הערות',
  reflection: 'רפלקציה שבועית',
  reflectionPh: 'מה עבד השבוע? מה הסיט אותך? איפה לדייק בשבוע הבא?',
  emotionPh: 'מרוכז / חרד / טריגר־הפסד / בטוח…',
  log: 'יומן עסקאות',
  empty: 'אין עסקאות השבוע עדיין.',
  close: 'סגור שבוע',
  closeNotFriday: 'סגירה מתאפשרת רק ביום שישי',
  saved: 'השבוע נשמר בארכיון',
  date: 'תאריך', coin: 'נכס', dir: 'כיוון', r: 'R', wl: 'תוצאה',
};

const EN = {
  header: 'Weekly Summary',
  sub: 'Live week — locks on Friday',
  weekKey: 'Week',
  netR: 'Net R',
  trades: 'Trades',
  winRate: 'Win rate',
  compliance: 'Compliance',
  grade: 'Grade',
  best: 'Best',
  worst: 'Worst',
  mindset: 'Mindset',
  focus: 'Focus',
  confidence: 'Confidence',
  discipline: 'Discipline',
  emotion: 'Dominant emotion',
  notes: 'Notes',
  reflection: 'Weekly reflection',
  reflectionPh: 'What worked? What threw you off? Where to sharpen next week?',
  emotionPh: 'Focused / anxious / loss-tilt / confident…',
  log: 'Trade log',
  empty: 'No trades for this week yet.',
  close: 'Close week',
  closeNotFriday: 'Closing is only allowed on Friday',
  saved: 'Week saved to archive',
  date: 'Date', coin: 'Asset', dir: 'Side', r: 'R', wl: 'Result',
};

export default function WeeklyTab({ T, isRTL, trades, state }: Props) {
  const L = isRTL ? HE : EN;
  const wk = useWeekAggregates(trades);
  const grade = gradeWeek({
    netR: wk.netR, wins: wk.wins, losses: wk.losses, rulesComplianceRatio: wk.rulesCompliance,
  });
  const gradeColor = GRADE_COLORS[grade];

  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const accent = T?.accent?.cyan || '#00f2ff';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const win = T?.status?.success || '#00ff88';
  const loss = T?.status?.danger || '#ff3b3b';

  const [mind, setMind] = useState<MindsetSnapshot>({ focus: 7, confidence: 7, discipline: 7, emotion: '', notes: '' });
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const alreadyClosed = useMemo(
    () => state.archive.some(w => w.weekKey === wk.weekKey),
    [state.archive, wk.weekKey],
  );
  const friday = isFriday();

  async function closeWeek() {
    if (saving || alreadyClosed) return;
    setSaving(true);
    const record: WeekRecord = {
      weekEndingISO: wk.weekEndISO,
      weekKey: wk.weekKey,
      tradeLog: wk.trades,
      netR: wk.netR,
      wins: wk.wins,
      losses: wk.losses,
      grade,
      mindset: mind,
      reflection,
      closedAt: new Date().toISOString(),
    };
    await state.saveArchive([...state.archive, record]);
    setSavedKey(wk.weekKey);
    setSaving(false);
  }

  // ── styles ────────────────────────────────────────────────────────────
  const card = {
    padding: 'clamp(14px, 2vw, 20px)',
    background: panel,
    border: `1px solid ${border}`,
    borderRadius: 14,
    boxSizing: 'border-box' as const,
  };
  const label = { color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, fontWeight: 600 };
  const value = { color: fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, marginTop: 4 };

  const closeDisabled = saving || alreadyClosed || !friday;

  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ color: accent, fontSize: 10, letterSpacing: 3, fontWeight: 700 }}>{L.weekKey} · {wk.weekKey}</div>
          <h2 style={{ margin: '4px 0 0', color: fg, fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 700 }}>{L.header}</h2>
          <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{L.sub} · {wk.weekStartISO} → {wk.weekEndISO}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...label }}>{L.grade}</div>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            display: 'grid', placeItems: 'center',
            background: `${gradeColor}1a`, border: `1.5px solid ${gradeColor}aa`,
            color: gradeColor, fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 800, fontSize: 22,
          }}>{grade}</div>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Stat label={L.netR}      val={fmtR(wk.netR)}   tone={wk.netR >= 0 ? win : loss} style={{ card, label, value }} />
        <Stat label={L.trades}    val={String(wk.trades.length)} style={{ card, label, value }} />
        <Stat label={L.winRate}   val={`${Math.round(wk.winRate * 100)}%`} style={{ card, label, value }} />
        <Stat label={L.compliance} val={`${Math.round(wk.rulesCompliance * 100)}%`} style={{ card, label, value }} />
        <Stat label={L.best}      val={fmtR(wk.bestR)}  tone={win}  style={{ card, label, value }} />
        <Stat label={L.worst}     val={fmtR(wk.worstR)} tone={loss} style={{ card, label, value }} />
      </div>

      {/* Mindset + reflection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={card}>
          <div style={{ ...label, marginBottom: 12 }}>{L.mindset}</div>
          <Slider label={L.focus}      v={mind.focus}      on={v => setMind({ ...mind, focus: v })}      T={T} />
          <Slider label={L.confidence} v={mind.confidence} on={v => setMind({ ...mind, confidence: v })} T={T} />
          <Slider label={L.discipline} v={mind.discipline} on={v => setMind({ ...mind, discipline: v })} T={T} />
          <Field label={L.emotion} ph={L.emotionPh} v={mind.emotion || ''} on={v => setMind({ ...mind, emotion: v })} T={T} />
          <Field label={L.notes}   ph=""             v={mind.notes || ''}   on={v => setMind({ ...mind, notes: v })}   T={T} multi />
        </div>

        <div style={card}>
          <div style={{ ...label, marginBottom: 12 }}>{L.reflection}</div>
          <textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder={L.reflectionPh}
            rows={10}
            style={{
              width: '100%', minHeight: 220, resize: 'vertical',
              background: 'transparent', color: fg,
              border: `1px solid ${border}`, borderRadius: 10,
              padding: 12, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            {savedKey === wk.weekKey && <span style={{ color: win, fontSize: 11, letterSpacing: 1 }}>✓ {L.saved}</span>}
            <button
              onClick={closeWeek}
              disabled={closeDisabled}
              style={{
                padding: '12px 18px', minHeight: 44, borderRadius: 10,
                background: closeDisabled ? 'transparent' : `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                color: closeDisabled ? muted : '#03121f',
                border: `1px solid ${closeDisabled ? border : accent}`,
                fontFamily: 'inherit', fontWeight: 700, fontSize: 12, letterSpacing: 1.5,
                cursor: closeDisabled ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
              }}
              title={!friday ? L.closeNotFriday : undefined}
            >
              {alreadyClosed ? (isRTL ? 'נסגר' : 'Closed') : L.close}
            </button>
          </div>
          {!friday && !alreadyClosed && (
            <div style={{ marginTop: 8, color: muted, fontSize: 11, textAlign: isRTL ? 'right' : 'left' }}>
              {L.closeNotFriday}
            </div>
          )}
        </div>
      </div>

      {/* Trade log */}
      <div style={card}>
        <div style={{ ...label, marginBottom: 12 }}>{L.log}</div>
        {wk.trades.length === 0 ? (
          <div style={{ color: muted, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>{L.empty}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              <thead>
                <tr style={{ color: muted, textAlign: isRTL ? 'right' : 'left' }}>
                  <Th>{L.date}</Th><Th>{L.coin}</Th><Th>{L.dir}</Th><Th align="right">{L.r}</Th><Th>{L.wl}</Th>
                </tr>
              </thead>
              <tbody>
                {wk.trades.map(t => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${border}`, color: fg }}>
                    <Td>{t.date}</Td>
                    <Td>{t.coin}</Td>
                    <Td style={{ color: t.direction === 'Long' ? win : loss }}>{t.direction}</Td>
                    <Td align="right" style={{ color: (t.returnR || 0) >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(t.returnR)}</Td>
                    <Td style={{ color: t.winLoss === 'Win' ? win : t.winLoss === 'Loss' ? loss : muted }}>{t.winLoss}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── small primitives ─────────────────────────────────────────────────────
function fmtR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}

function Stat({ label, val, tone, style }: {
  label: string; val: string; tone?: string;
  style: { card: React.CSSProperties; label: React.CSSProperties; value: React.CSSProperties };
}) {
  return (
    <div style={style.card}>
      <div style={style.label}>{label}</div>
      <div style={{ ...style.value, color: tone || style.value.color }}>{val}</div>
    </div>
  );
}

function Slider({ label, v, on, T }: { label: string; v: number; on: (n: number) => void; T: any }) {
  const accent = T?.accent?.cyan || '#00f2ff';
  const muted = T?.text?.muted || '#7a8aa3';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 6 }}>
        <span>{label}</span><span style={{ color: accent, fontFamily: "'IBM Plex Mono', monospace" }}>{v}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={v} onChange={e => on(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent }}
      />
    </div>
  );
}

function Field({ label, ph, v, on, T, multi }: {
  label: string; ph: string; v: string; on: (s: string) => void; T: any; multi?: boolean;
}) {
  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const baseStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', color: fg,
    border: `1px solid ${border}`, borderRadius: 8, padding: 10,
    fontFamily: 'inherit', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{label}</div>
      {multi ? (
        <textarea rows={2} value={v} placeholder={ph} onChange={e => on(e.target.value)} style={baseStyle} />
      ) : (
        <input type="text" value={v} placeholder={ph} onChange={e => on(e.target.value)} style={baseStyle} />
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textAlign: align || 'inherit', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align, style }: { children: React.ReactNode; align?: 'right' | 'left'; style?: React.CSSProperties }) {
  return <td style={{ padding: '8px 10px', textAlign: align || 'inherit', ...style }}>{children}</td>;
}
