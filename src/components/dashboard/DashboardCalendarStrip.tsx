/**
 * DashboardCalendarStrip — compact month calendar + Long/Short breakdown cards.
 * Visible on the main Dashboard (Layer 1). Mirrors the calendar logic from
 * CalendarHubPage but in a much smaller, "Apple-style" footprint. Reads from
 * the same live trades; clicking a populated day opens the full CalendarModal.
 *
 * Layout:
 *   Desktop  ▸ [ Calendar  |  Long card  |  Short card ]  — 3 columns
 *   Mobile   ▸ stacked, calendar uses identical sizing as the hub mobile view.
 */
import { useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { I18nStrings } from '@/lib/trading-i18n';
import { parseTradeDate } from '@/components/weekly-review/lib/week-key';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { useDisplayMode } from '@/lib/display-mode';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props {
  T: TradingTheme;
  t: I18nStrings;
  isRTL: boolean;
  trades: Trade[];
}

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_HE = ['א','ב','ג','ד','ה','ו','ש'];
const DOW_EN = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function fmtMoneyShort(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1000) return `${s}$${(a / 1000).toFixed(a >= 10000 ? 1 : 2).replace(/\.0+$/, '')}k`;
  return `${s}$${a.toFixed(a >= 100 ? 0 : 0)}`;
}

function fmtMoney(n: number, digits = 1): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1000) return `${s}$${(a / 1000).toFixed(digits)}k`;
  return `${s}$${a.toFixed(0)}`;
}

function fmtMinutes(min: number, isRTL: boolean): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  if (min < 60) return isRTL ? `${Math.round(min)} דקות` : `${Math.round(min)} min`;
  const h = min / 60;
  return isRTL ? `${h.toFixed(1)} שעות` : `${h.toFixed(1)} h`;
}

function getHoldMinutes(tr: Trade): number | null {
  const entryRaw = (tr as any).entryTime || (tr as any).openTime || (tr as any).opened_at;
  const exitRaw = (tr as any).exitTime || (tr as any).closed_at || tr.date;
  if (!entryRaw || !exitRaw) return null;
  const e = new Date(entryRaw).getTime();
  const x = new Date(exitRaw).getTime();
  if (!Number.isFinite(e) || !Number.isFinite(x) || x <= e) return null;
  return (x - e) / 60000;
}

export default function DashboardCalendarStrip({ T, t, isRTL, trades }: Props) {
  const isMobile = useIsMobile();
  const { displayMode } = useDisplayMode();
  const isR = displayMode === 'R_MULTIPLE';
  const today = useMemo(() => new Date(), []);
  const [focused, setFocused] = useState<Date>(today);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [pickerMode, setPickerMode] = useState<'days' | 'months' | 'years'>('days');

  const fmtValShort = (v: number) => isR
    ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`
    : `${v >= 0 ? '+' : ''}${fmtMoneyShort(v)}`;
  const fmtValTotal = (v: number) => isR
    ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`
    : `${v >= 0 ? '+' : ''}${fmtMoney(v, 1)}`;

  const year = focused.getFullYear();
  const month = focused.getMonth();

  const dayMap = useMemo(() => {
    const map = new Map<number, { pnl: number; n: number }>();
    for (const tr of trades) {
      const d = parseTradeDate(tr.date);
      if (!d) continue;
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const k = d.getDate();
      const e = map.get(k) || { pnl: 0, n: 0 };
      const val = isR ? (getEffectiveR(tr, { strict: true }) ?? 0) : (Number(tr.pnl) || 0);
      e.pnl += val;
      e.n += 1;
      map.set(k, e);
    }
    return map;
  }, [trades, year, month, isR]);

  // Totals per month (for the current focused year) — used in the months picker.
  const monthTotals = useMemo(() => {
    const arr = new Array(12).fill(0) as number[];
    for (const tr of trades) {
      const d = parseTradeDate(tr.date);
      if (!d || d.getFullYear() !== year) continue;
      const val = isR ? (getEffectiveR(tr, { strict: true }) ?? 0) : (Number(tr.pnl) || 0);
      arr[d.getMonth()] += val;
    }
    return arr;
  }, [trades, year, isR]);

  // Totals per year — used in the years picker (keyed by year number).
  const yearTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const tr of trades) {
      const d = parseTradeDate(tr.date);
      if (!d) continue;
      const y = d.getFullYear();
      const val = isR ? (getEffectiveR(tr, { strict: true }) ?? 0) : (Number(tr.pnl) || 0);
      map.set(y, (map.get(y) ?? 0) + val);
    }
    return map;
  }, [trades, isR]);

  const monthTotal = useMemo(() => {
    let pnl = 0, n = 0;
    for (const v of dayMap.values()) { pnl += v.pnl; n += v.n; }
    return { pnl, n };
  }, [dayMap]);

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = first.getDay(); // 0=Sun
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    // Always pad to 6 full weeks (42 cells) so switching months never
    // resizes the calendar card and shifts the adjacent Long/Short cards.
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [year, month]);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayN = today.getDate();

  const navPrev = () => {
    if (pickerMode === 'days') setFocused(new Date(year, month - 1, 1));
    else if (pickerMode === 'months') setFocused(new Date(year - 1, month, 1));
    else setFocused(new Date(year - 10, month, 1));
  };
  const navNext = () => {
    if (pickerMode === 'days') setFocused(new Date(year, month + 1, 1));
    else if (pickerMode === 'months') setFocused(new Date(year + 1, month, 1));
    else setFocused(new Date(year + 10, month, 1));
  };

  const monthLabel = `${(isRTL ? MONTHS_HE : MONTHS_EN)[month]} ${year}`;
  const dow = isRTL ? DOW_HE : DOW_EN;

  // ── Long / Short breakdowns ──────────────────────────────
  const breakdown = useMemo(() => {
    const empty = () => ({ wins: 0, losses: 0, breakEven: 0, sumWin: 0, sumLoss: 0, sumPnl: 0, sumRR: 0, rrN: 0, holdSum: 0, holdN: 0, n: 0 });
    const L = empty(), S = empty();
    for (const tr of trades) {
      const bucket = tr.direction === 'Short' ? S : L;
      bucket.n++;
      const val = isR ? (getEffectiveR(tr, { strict: true }) ?? 0) : (Number(tr.pnl) || 0);
      bucket.sumPnl += val;
      if (tr.winLoss === 'Win') { bucket.wins++; bucket.sumWin += val; }
      else if (tr.winLoss === 'Loss') { bucket.losses++; bucket.sumLoss += val; }
      else bucket.breakEven++;
      // R-Multiple ≈ realized risk-reward when stop-loss known
      const r = isR ? val : Number(tr.returnR);
      if (Number.isFinite(r)) { bucket.sumRR += Math.abs(r); bucket.rrN++; }
      const hm = getHoldMinutes(tr);
      if (hm != null) { bucket.holdSum += hm; bucket.holdN++; }
    }
    const stat = (b: ReturnType<typeof empty>) => {
      const decided = b.wins + b.losses;
      return {
        n: b.n,
        wins: b.wins,
        losses: b.losses,
        winRate: decided > 0 ? (b.wins / decided) * 100 : 0,
        avgWin: b.wins > 0 ? b.sumWin / b.wins : 0,
        avgLoss: b.losses > 0 ? b.sumLoss / b.losses : 0,
        avgPerTrade: b.n > 0 ? b.sumPnl / b.n : 0,
        totalPnl: b.sumPnl,
        avgRR: b.rrN > 0 ? b.sumRR / b.rrN : 0,
        avgHold: b.holdN > 0 ? b.holdSum / b.holdN : 0,
      };
    };
    return { long: stat(L), short: stat(S) };
  }, [trades, isR]);

  // Current-month cumulative equity series per direction (desktop mini-chart)
  const monthSeries = useMemo(() => {
    const rows = trades
      .map(tr => ({ tr, d: parseTradeDate(tr.date) }))
      .filter(x => x.d && x.d.getFullYear() === year && x.d.getMonth() === month)
      .sort((a, b) => (a.d!.getTime() - b.d!.getTime()));
    const long: number[] = [], short: number[] = [];
    let cL = 0, cS = 0;
    for (const { tr } of rows) {
      const val = isR ? (getEffectiveR(tr, { strict: true }) ?? 0) : (Number(tr.pnl) || 0);
      if (tr.direction === 'Short') { cS += val; short.push(cS); }
      else { cL += val; long.push(cL); }
    }
    return { long, short };
  }, [trades, year, month, isR]);

  const cardBase: React.CSSProperties = {
    background: T.bg.card,
    border: `1px solid ${T.border.subtle}`,
    borderRadius: 14,
    padding: 14,
    minWidth: 0,
  };

  return (
    <div className="dash-section" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="dash-section-label" style={{ color: T.accent.cyan }}>
        {isRTL ? 'לוח שנה · לונג / שורט' : 'CALENDAR · LONG / SHORT'}
      </div>

      <div style={{
        display: 'grid',
        gap: 14,
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr)',
      }}>
        {/* ── Compact Calendar ─────────────────────────────── */}
        <div style={cardBase}>
          {/* Top stat strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: 1.5, fontWeight: 600 }}>
                  {isRTL ? 'סה״כ חודש' : 'MONTH TOTAL'}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: monthTotal.pnl > 0 ? T.accent.green : monthTotal.pnl < 0 ? T.accent.red : T.text.primary,
                }}>
                  {fmtValTotal(monthTotal.pnl)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: 1.5, fontWeight: 600 }}>
                  {isRTL ? 'עסקאות' : 'TRADES'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                  {monthTotal.n}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={navPrev} aria-label="prev" style={navBtn(T)}>{isRTL ? '›' : '‹'}</button>
              <button
                onClick={() => setPickerMode(m => m === 'days' ? 'months' : m === 'months' ? 'years' : 'days')}
                aria-label={isRTL ? 'בחר חודש או שנה' : 'Pick month or year'}
                style={{ ...navBtn(T), padding: '4px 10px', fontSize: 12 }}
              >
                {pickerMode === 'years'
                  ? `${Math.floor(year / 10) * 10}–${Math.floor(year / 10) * 10 + 11}`
                  : pickerMode === 'months'
                    ? String(year)
                    : monthLabel}
              </button>
              <button onClick={navNext} aria-label="next" style={navBtn(T)}>{isRTL ? '‹' : '›'}</button>
            </div>
          </div>

          {pickerMode === 'days' && (
            <>
              {/* Weekday header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 4 }}>
                {dow.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 10, color: T.text.muted, fontWeight: 600, padding: '2px 0' }}>{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                {grid.map((d, i) => {
                  if (!d) return <div key={i} style={{ aspectRatio: '1/1' }} />;
                  const data = dayMap.get(d);
                  const isToday = isCurrentMonth && d === todayN;
                  const pos = data && data.pnl > 0;
                  const neg = data && data.pnl < 0;
                  return (
                    <button
                      key={i}
                      onClick={() => data && setModalDay(d)}
                      disabled={!data}
                      style={{
                        aspectRatio: '1/1',
                        minWidth: 0,
                        padding: 0,
                        cursor: data ? 'pointer' : 'default',
                        background: pos
                          ? `linear-gradient(180deg, ${T.accent.green}55, ${T.accent.green}30)`
                          : neg
                          ? `linear-gradient(180deg, ${T.accent.red}55, ${T.accent.red}30)`
                          : T.bg.tertiary,
                        border: `1px solid ${isToday ? T.accent.cyan : pos ? T.accent.green : neg ? T.accent.red : T.border.subtle}`,
                        borderRadius: 8,
                        color: T.text.primary,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontSize: 10, color: isToday ? T.accent.cyan : T.text.muted, fontWeight: isToday ? 700 : 500 }}>{d}</span>
                      {data && (
                        <>
                          <span style={{
                            fontSize: isMobile ? 9 : 10,
                            fontWeight: 700,
                            lineHeight: 1.1,
                            color: pos ? T.accent.green : neg ? T.accent.red : T.text.primary,
                          }}>
                            {fmtValShort(data.pnl)}
                          </span>
                          <span style={{ fontSize: 8, color: T.text.muted }}>({data.n})</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {pickerMode === 'months' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {(isRTL ? MONTHS_HE : MONTHS_EN).map((label, mi) => {
                const isCur = today.getFullYear() === year && today.getMonth() === mi;
                const isSel = month === mi;
                const total = monthTotals[mi] || 0;
                const pos = total > 0;
                const neg = total < 0;
                return (
                  <button
                    key={mi}
                    onClick={() => { setFocused(new Date(year, mi, 1)); setPickerMode('days'); }}
                    style={{
                      aspectRatio: '1/1',
                      minWidth: 0,
                      padding: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 2,
                      background: isSel
                        ? T.accent.cyan
                        : pos ? `linear-gradient(180deg, ${T.accent.green}55, ${T.accent.green}30)`
                        : neg ? `linear-gradient(180deg, ${T.accent.red}55, ${T.accent.red}30)`
                        : T.bg.tertiary,
                      color: isSel ? '#001023' : T.text.primary,
                      border: `1px solid ${isCur ? T.accent.cyan : pos ? T.accent.green : neg ? T.accent.red : T.border.subtle}`,
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{label.slice(0, 3)}</span>
                    <span style={{
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isSel ? '#001023' : pos ? T.accent.green : neg ? T.accent.red : T.text.muted,
                    }}>
                      {total === 0 ? '—' : fmtValShort(total)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {pickerMode === 'years' && (() => {
            const base = Math.floor(year / 10) * 10;
            const years = Array.from({ length: 12 }, (_, i) => base + i);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                {years.map(y => {
                  const isCur = today.getFullYear() === y;
                  const isSel = year === y;
                  const total = yearTotals.get(y) || 0;
                  const pos = total > 0;
                  const neg = total < 0;
                  return (
                    <button
                      key={y}
                      onClick={() => { setFocused(new Date(y, month, 1)); setPickerMode('months'); }}
                      style={{
                        aspectRatio: '1/1',
                        minWidth: 0,
                        padding: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                        background: isSel
                          ? T.accent.cyan
                          : pos ? `linear-gradient(180deg, ${T.accent.green}55, ${T.accent.green}30)`
                          : neg ? `linear-gradient(180deg, ${T.accent.red}55, ${T.accent.red}30)`
                          : T.bg.tertiary,
                        color: isSel ? '#001023' : T.text.primary,
                        border: `1px solid ${isCur ? T.accent.cyan : pos ? T.accent.green : neg ? T.accent.red : T.border.subtle}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{y}</span>
                      <span style={{
                        fontSize: 10,
                        color: isSel ? '#001023' : pos ? T.accent.green : neg ? T.accent.red : T.text.muted,
                      }}>
                        {total === 0 ? '—' : fmtValShort(total)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>


        {/* ── Long card ──────────────────────────────────────── */}
        <BreakdownCard
          T={T} isRTL={isRTL} isR={isR}
          title={isRTL ? 'ניתוח לונג' : 'Long Analysis'}
          accent={T.accent.green}
          stats={breakdown.long}
        />

        {/* ── Short card ─────────────────────────────────────── */}
        <BreakdownCard
          T={T} isRTL={isRTL} isR={isR}
          title={isRTL ? 'ניתוח שורט' : 'Short Analysis'}
          accent={T.accent.red}
          stats={breakdown.short}
        />
      </div>

      {modalDay !== null && (
        <CalendarModal
          T={T} t={t} isRTL={isRTL}
          day={modalDay} month={month} year={year}
          trades={trades}
          isMobile={isMobile}
          onClose={() => setModalDay(null)}
        />
      )}
    </div>
  );
}

function navBtn(T: TradingTheme): React.CSSProperties {
  return {
    background: T.bg.tertiary,
    border: `1px solid ${T.border.subtle}`,
    borderRadius: 8,
    color: T.text.secondary,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    padding: '4px 8px',
    lineHeight: 1,
  };
}

interface BreakdownProps {
  T: TradingTheme;
  isRTL: boolean;
  isR: boolean;
  title: string;
  accent: string;
  stats: {
    n: number; wins: number; losses: number; winRate: number;
    avgWin: number; avgLoss: number; avgPerTrade: number; totalPnl: number;
    avgRR: number; avgHold: number;
  };
}

function BreakdownCard({ T, isRTL, isR, title, accent, stats }: BreakdownProps) {
  const card: React.CSSProperties = {
    background: T.bg.card,
    border: `1px solid ${T.border.subtle}`,
    borderRadius: 14,
    padding: 14,
    minWidth: 0,
  };
  const row = (label: string, value: string, color?: string): JSX.Element => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
      <span style={{ fontSize: 11, color: T.text.muted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || T.text.primary }}>{value}</span>
    </div>
  );

  const fmtVal = (v: number) => isR
    ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`
    : `${v >= 0 ? '' : '-'}${fmtMoney(Math.abs(v), 1)}`;

  const wr = stats.winRate;

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{title}</span>
      </div>

      {/* Win rate hero */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>
          {wr.toFixed(2)}%
        </span>
        <span style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'אחוז הצלחה' : 'Win rate'}</span>
      </div>
      <div style={{ height: 6, background: T.bg.tertiary, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${Math.max(0, Math.min(100, wr))}%`, height: '100%', background: T.accent.green }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 10, fontSize: 11, color: T.text.muted }}>
        <span><span style={{ color: T.accent.red, marginInlineEnd: 4 }}>●</span>{stats.losses} {isRTL ? 'הפסדים' : 'losses'}</span>
        <span><span style={{ color: T.accent.green, marginInlineEnd: 4 }}>●</span>{stats.wins} {isRTL ? 'ניצחונות' : 'wins'}</span>
      </div>

      {row(isRTL ? 'רווח ממוצע' : 'Avg profit',     fmtVal(stats.avgWin),     T.accent.green)}
      {row(isRTL ? 'הפסד ממוצע' : 'Avg loss',       fmtVal(stats.avgLoss), T.accent.red)}
      {row(isRTL ? 'ממוצע לעסקה' : 'Avg per trade', fmtVal(stats.avgPerTrade))}
      {row(isRTL ? 'רווח/הפסד (סה״כ)' : 'P&L (total)', fmtVal(stats.totalPnl),
        stats.totalPnl >= 0 ? T.accent.green : T.accent.red)}
      {row(isRTL ? 'ממוצע רווח/הפסד לעסקה' : 'Avg R:R per trade',
        stats.avgRR > 0 ? stats.avgRR.toFixed(2) : '—',
        T.accent.cyan)}
      {row(isRTL ? 'זמן החזקה ממוצע' : 'Avg hold time', fmtMinutes(stats.avgHold, isRTL))}
    </div>
  );
}
