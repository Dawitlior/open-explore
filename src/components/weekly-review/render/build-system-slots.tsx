// P0 system-slot wiring for the schema renderer.
//
// The WeeklyReviewRenderer is value-agnostic: every `system-*` block returns
// null unless the host registers a slot renderer for it. Until this file
// landed, `WeeklyTab` passed `systemSlots={{}}` — so trades_table, stat_chips,
// risk_gauges, final_grade and ai_insights all rendered as `null` in both
// fill and customize modes. Production showed empty cards where the trade
// spine should have been.
//
// This builder mirrors the legacy JSX in `WeeklyTab.tsx` so the schema path
// is visually equivalent to the legacy path for every system block. The
// regression test in `system-slots-wiring.test.ts` guards against
// `systemSlots={{}}` ever shipping again.

import type { ReactNode } from 'react';
import { fmtR, fmtUSD } from '../hooks/use-review-unit';
import { GRADE_COLORS, type Grade } from '../lib/grading';
import { themeBgs } from '../lib/theme-bg';
import type { Block } from '../lib/wr-schema';
import type { SystemSlotId } from './WeeklyReviewRenderer';
import type { Trade } from '@/data/trades';

// 4-tier R limits (memory) — must mirror the const in WeeklyTab.
const LIMITS = { daily: -2, weekly: -5, monthly: -10 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Theme = any;

interface WeekAggLite {
  weekKey: string;
  netR: number; netUSD: number;
  avgR: number; avgUSD: number;
  avgWinUSD: number;
  wins: number; losses: number;
  winRate: number;
}

interface BuildDeps {
  T: Theme;
  isRTL: boolean;
  L: Record<string, string>;
  tradesArr: Trade[];
  hasMoney: boolean;
  wk: WeekAggLite;
  rr: { rr: number; avgWin: number; avgLoss: number };
  n: number;
  showUSD: boolean;
  risk: { dailyUSD: number; weeklyUSD: number; monthlyUSD: number };
  isUSD: boolean;
  execScore: number;
  computedGrade: Grade;
  gradeColor: string;
  fg: string; muted: string; border: string;
  cyan: string; win: string; loss: string; warn: string;
  card: React.CSSProperties;
  cardSubtle: React.CSSProperties;
  statLabel: React.CSSProperties;
  statValue: React.CSSProperties;
}

export function buildWeeklySystemSlots(
  d: BuildDeps,
): Partial<Record<SystemSlotId, (block: Block) => ReactNode>> {
  return {
    'system-trades-table': () => <TradesTableSlot {...d} />,
    'system-stat-chips':   () => <StatChipsSlot {...d} />,
    'system-risk-gauges':  () => <RiskGaugesSlot {...d} />,
    'system-grade':        () => <FinalGradeSlot {...d} />,
    'system-ai-insights':  () => <AiInsightsSlot {...d} />,
  };
}

// ── trades table (legacy: WeeklyTab.tsx ~362-401) ─────────────────────────
function TradesTableSlot({ T, isRTL, L, tradesArr, hasMoney, n,
                          fg, muted, border, win, loss }: BuildDeps) {
  if (n === 0) {
    return (
      <div data-system-slot="trades-table" style={{
        padding: '40px 16px', textAlign: 'center', color: muted, fontSize: 13,
        border: `1px solid ${border}`, borderRadius: 12, background: themeBgs(T).subtle,
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
        {L.noTrades}
      </div>
    );
  }
  return (
    <div data-system-slot="trades-table" style={{ overflowX: 'auto', border: `1px solid ${border}`, borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <thead>
          <tr style={{ color: muted, background: themeBgs(T).subtle, textAlign: isRTL ? 'right' : 'left' }}>
            <Th>{isRTL ? 'תאריך' : 'Date'}</Th>
            <Th>{isRTL ? 'נכס' : 'Asset'}</Th>
            <Th>{isRTL ? 'כיוון' : 'Side'}</Th>
            <Th align="right">R</Th>
            {hasMoney && <Th align="right">$ P&amp;L</Th>}
            <Th>{isRTL ? 'תוצאה' : 'Result'}</Th>
          </tr>
        </thead>
        <tbody>
          {tradesArr.map(t => {
            const r = Number(t.returnR) || 0;
            const usd = Number(t.pnl) || 0;
            return (
              <tr key={t.id} style={{ borderTop: `1px solid ${border}`, color: fg }}>
                <Td>{t.date}</Td>
                <Td>{t.coin}</Td>
                <Td style={{ color: t.direction === 'Long' ? win : loss }}>{t.direction}</Td>
                <Td align="right" style={{ color: r >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(r)}</Td>
                {hasMoney && <Td align="right" style={{ color: usd >= 0 ? win : loss, fontWeight: 700 }}>{fmtUSD(usd)}</Td>}
                <Td style={{ color: t.winLoss === 'Win' ? win : t.winLoss === 'Loss' ? loss : muted }}>{t.winLoss}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── stat chips (legacy: WeeklyTab.tsx ~349-359) ───────────────────────────
function StatChipsSlot({ L, wk, rr, n, showUSD,
                        cardSubtle, statLabel, statValue,
                        fg, muted, win, loss }: BuildDeps) {
  return (
    <div data-system-slot="stat-chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      <Stat label={L.rr} value={rr.rr ? rr.rr.toFixed(2) : '0.00'} card={cardSubtle} sl={statLabel} sv={statValue} color={fg} />
      <DualStat label={L.winR}  r={fmtR(rr.avgWin)} d={fmtUSD(wk.avgWinUSD)} isUSD={showUSD}
                card={cardSubtle} sl={statLabel} sv={statValue} color={win} muted={muted} />
      <DualStat label={L.avgR}  r={fmtR(wk.avgR)}   d={fmtUSD(wk.avgUSD)}    isUSD={showUSD}
                card={cardSubtle} sl={statLabel} sv={statValue} color={wk.avgR >= 0 ? win : loss} muted={muted} />
      <Stat label={L.winRate} value={`${Math.round(wk.winRate * 100)}%`} card={cardSubtle} sl={statLabel} sv={statValue} color={wk.winRate >= 0.5 ? win : loss} />
      <Stat label={L.tradesK} value={String(n)} card={cardSubtle} sl={statLabel} sv={statValue} color={fg} />
      <DualStat label={L.netR}  r={fmtR(wk.netR)}   d={fmtUSD(wk.netUSD)}    isUSD={showUSD}
                card={cardSubtle} sl={statLabel} sv={statValue} color={wk.netR >= 0 ? win : loss} muted={muted} />
    </div>
  );
}

// ── risk gauges (legacy: WeeklyTab.tsx ~405-417) ──────────────────────────
function RiskGaugesSlot({ T, isRTL, L, wk, risk, isUSD }: BuildDeps) {
  return (
    <div data-system-slot="risk-gauges" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      <RiskCard label={L.daily}   limitR={LIMITS.daily}   limitUSD={-risk.dailyUSD}
                valueR={0} valueUSD={0} isUSD={isUSD} T={T} isRTL={isRTL} />
      <RiskCard label={L.weekly}  limitR={LIMITS.weekly}  limitUSD={-risk.weeklyUSD}
                valueR={wk.netR  < 0 ? wk.netR  : 0} valueUSD={wk.netUSD < 0 ? wk.netUSD : 0}
                isUSD={isUSD} T={T} isRTL={isRTL} />
      <RiskCard label={L.monthly} limitR={LIMITS.monthly} limitUSD={-risk.monthlyUSD}
                valueR={0} valueUSD={0} isUSD={isUSD} T={T} isRTL={isRTL} />
    </div>
  );
}

// ── final grade (legacy: WeeklyTab.tsx ~614-641) ──────────────────────────
function FinalGradeSlot({ T, isRTL, computedGrade, gradeColor,
                         border, muted }: BuildDeps) {
  return (
    <div data-system-slot="final-grade">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {(['A+', 'B', 'C'] as const).map(g => {
          const active = computedGrade === g || (g === 'C' && (computedGrade === 'D' || computedGrade === 'F'));
          return (
            <div key={g} style={{
              padding: 16, textAlign: 'center',
              background: active ? `${GRADE_COLORS[g]}14` : themeBgs(T).overlay,
              border: `1px solid ${active ? GRADE_COLORS[g] + '88' : border}`,
              borderRadius: 12,
            }}>
              <div style={{
                color: active ? GRADE_COLORS[g] : muted,
                fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14,
              }}>{gradeLabel(g, isRTL)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <span style={{ color: muted, fontSize: 11 }}>{isRTL ? 'מחושב:' : 'Computed:'}</span>
        <span style={{
          padding: '4px 12px', borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 800, color: gradeColor, background: `${gradeColor}1a`,
          border: `1px solid ${gradeColor}66`,
        }}>{computedGrade}</span>
      </div>
    </div>
  );
}

// ── AI insights placeholder (legacy: WeeklyTab.tsx ~644-656) ──────────────
function AiInsightsSlot({ isRTL, L, fg, border }: BuildDeps) {
  return (
    <div data-system-slot="ai-insights" style={{
      padding: 16, border: `1px solid ${border}`, borderRadius: 12,
      background: 'rgba(57,255,20,0.04)',
      display: 'flex', alignItems: 'center', gap: 12,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      color: fg, fontSize: 13,
    }}>
      <span style={{ fontSize: 18 }}>💡</span>
      <span>{L.noInsights}</span>
    </div>
  );
}

// ── tiny primitives (mirrors of WeeklyTab.tsx) ────────────────────────────
function gradeLabel(g: 'A+' | 'B' | 'C', isRTL: boolean) {
  const he: Record<string, string> = { 'A+': 'מעולה (A+)', B: 'עמדתי בחוקים (B)', C: 'טעון שיפור (C)' };
  const en: Record<string, string> = { 'A+': 'Excellent (A+)', B: 'Within rules (B)', C: 'Needs work (C)' };
  return isRTL ? he[g] : en[g];
}
function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textAlign: align || 'inherit', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align, style }: { children: React.ReactNode; align?: 'right' | 'left'; style?: React.CSSProperties }) {
  return <td style={{ padding: '10px 12px', textAlign: align || 'inherit', ...style }}>{children}</td>;
}
function Stat({ label, value, color, card, sl, sv }: {
  label: string; value: string; color: string;
  card: React.CSSProperties; sl: React.CSSProperties; sv: React.CSSProperties;
}) {
  return (
    <div style={card}>
      <div style={sl}>{label}</div>
      <div style={{ ...sv, color }}>{value}</div>
    </div>
  );
}
function DualStat({ label, r, d, isUSD, color, card, sl, sv, muted }: {
  label: string; r: string; d: string; isUSD: boolean; color: string;
  card: React.CSSProperties; sl: React.CSSProperties; sv: React.CSSProperties; muted: string;
}) {
  const main = isUSD ? d : r;
  const sub  = isUSD ? r : d;
  return (
    <div style={card}>
      <div style={sl}>{label}</div>
      <div style={{ ...sv, color }}>{main}</div>
      <div style={{ color: muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, marginTop: 2, opacity: 0.85 }}>{sub}</div>
    </div>
  );
}
function RiskCard({ label, limitR, limitUSD, valueR, valueUSD, isUSD, T, isRTL }: {
  label: string; limitR: number; limitUSD: number; valueR: number; valueUSD: number;
  isUSD: boolean; T: Theme; isRTL: boolean;
}) {
  const muted = T?.text?.muted || '#7a8aa3';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const win = T?.status?.success || '#39FF14';
  const loss = T?.status?.danger || '#ff3b3b';
  const warn = T?.status?.warning || '#ffb830';
  const limit = isUSD ? limitUSD : limitR;
  const value = isUSD ? valueUSD : valueR;
  const pct = Math.min(100, Math.max(0, (Math.abs(value) / Math.max(1e-9, Math.abs(limit))) * 100));
  const tone = pct >= 80 ? loss : pct >= 50 ? warn : win;
  const mainStr = isUSD
    ? (value === 0 ? '$0' : fmtUSD(value))
    : (value === 0 ? '0.0R' : fmtR(value));
  const subStr = isUSD ? (valueR === 0 ? '0.0R' : fmtR(valueR))
                       : (valueUSD === 0 ? '$0' : fmtUSD(valueUSD));
  const limitStr = isUSD ? `${fmtUSD(limitUSD)}` : `${limitR}R`;
  return (
    <div style={{ padding: 14, background: panel, border: `1px solid ${border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <div style={{ color: muted, fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div style={{ marginTop: 8, color: value < 0 ? loss : win, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 800, textAlign: isRTL ? 'right' : 'left' }}>
        {mainStr}
      </div>
      <div style={{ color: muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, marginTop: 2, opacity: 0.8, textAlign: isRTL ? 'right' : 'left' }}>
        {subStr}
      </div>
      <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: tone, transition: 'width 240ms ease' }} />
      </div>
      <div style={{ marginTop: 6, color: muted, fontSize: 10, textAlign: isRTL ? 'left' : 'right' }}>
        {isRTL ? 'מגבלה:' : 'Limit:'} {limitStr}
      </div>
    </div>
  );
}
