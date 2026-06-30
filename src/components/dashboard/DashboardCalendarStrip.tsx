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
  const entryRaw = (tr as any).entryTime || (tr as any).openTime;
  const exitRaw = (tr as any).exitTime || tr.date;
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
  }, [trades, year, month]);

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
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayN = today.getDate();

  const navPrev = () => setFocused(new Date(year, month - 1, 1));
  const navNext = () => setFocused(new Date(year, month + 1, 1));

  const monthLabel = `${(isRTL ? MONTHS_HE : MONTHS_EN)[month]} ${year}`;
  const dow = isRTL ? DOW_HE : DOW_EN;

  // ── Long / Short breakdowns ──────────────────────────────
  const breakdown = useMemo(() => {
    const empty = () => ({ wins: 0, losses: 0, breakEven: 0, sumWin: 0, sumLoss: 0, sumPnl: 0, sumRR: 0, rrN: 0, holdSum: 0, holdN: 0, n: 0 });
    const L = empty(), S = empty();
    for (const tr of trades) {
      const bucket = tr.direction === 'Short' ? S : L;
      bucket.n++;
      const pnl = Number(tr.pnl) || 0;
      bucket.sumPnl += pnl;
      if (tr.winLoss === 'Win') { bucket.wins++; bucket.sumWin += pnl; }
      else if (tr.winLoss === 'Loss') { bucket.losses++; bucket.sumLoss += pnl; }
      else bucket.breakEven++;
      // R-Multiple ≈ realized risk-reward when stop-loss known
      const r = Number(tr.returnR);
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
  }, [trades]);

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
                  {monthTotal.pnl >= 0 ? '+' : ''}{fmtMoney(monthTotal.pnl, 1)}
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
              <button onClick={() => setFocused(new Date())} style={{ ...navBtn(T), padding: '4px 10px', fontSize: 12 }}>
                {monthLabel}
              </button>
              <button onClick={navNext} aria-label="next" style={navBtn(T)}>{isRTL ? '‹' : '›'}</button>
            </div>
          </div>

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
                        {data.pnl >= 0 ? '+' : ''}{fmtMoneyShort(data.pnl)}
                      </span>
                      <span style={{ fontSize: 8, color: T.text.muted }}>({data.n})</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Long card ──────────────────────────────────────── */}
        <BreakdownCard
          T={T} isRTL={isRTL}
          title={isRTL ? 'ניתוח לונג' : 'Long Analysis'}
          accent={T.accent.green}
          stats={breakdown.long}
        />

        {/* ── Short card ─────────────────────────────────────── */}
        <BreakdownCard
          T={T} isRTL={isRTL}
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
  title: string;
  accent: string;
  stats: {
    n: number; wins: number; losses: number; winRate: number;
    avgWin: number; avgLoss: number; avgPerTrade: number; totalPnl: number;
    avgRR: number; avgHold: number;
  };
}

function BreakdownCard({ T, isRTL, title, accent, stats }: BreakdownProps) {
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

      {row(isRTL ? 'רווח ממוצע' : 'Avg profit',     fmtMoney(stats.avgWin, 1),     T.accent.green)}
      {row(isRTL ? 'הפסד ממוצע' : 'Avg loss',       (stats.avgLoss === 0 ? '$0' : `-${fmtMoney(Math.abs(stats.avgLoss), 1)}`), T.accent.red)}
      {row(isRTL ? 'ממוצע לעסקה' : 'Avg per trade', `${stats.avgPerTrade >= 0 ? '' : '-'}${fmtMoney(Math.abs(stats.avgPerTrade), 1)}`)}
      {row(isRTL ? 'רווח/הפסד (סה״כ)' : 'P&L (total)', `${stats.totalPnl >= 0 ? '' : '-'}${fmtMoney(Math.abs(stats.totalPnl), 1)}`,
        stats.totalPnl >= 0 ? T.accent.green : T.accent.red)}
      {row(isRTL ? 'ממוצע רווח/הפסד לעסקה' : 'Avg R:R per trade',
        stats.avgRR > 0 ? stats.avgRR.toFixed(2) : '—',
        T.accent.cyan)}
      {row(isRTL ? 'זמן החזקה ממוצע' : 'Avg hold time', fmtMinutes(stats.avgHold, isRTL))}
    </div>
  );
}
