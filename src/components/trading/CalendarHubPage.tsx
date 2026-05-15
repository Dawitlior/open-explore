import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import type { Trade } from '@/data/trades';
import { GlassCard } from '@/components/trading/TradingUI';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { FeatureHint } from '@/components/trading/FeatureHint';
import { getCalDays } from '@/lib/trading-analytics';
import { getDayRiskColor, checkRiskLimits, DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';

type Props = {
  T: any; isRTL: boolean; trades: Trade[];
  t: any; // I18nStrings — passed through for CalendarModal
  isMobile?: boolean;
  onGenerateInsight?: () => void;
};

const monthsHe = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const CalendarHubPage = ({ T, isRTL, trades, isMobile, onGenerateInsight }: Props) => {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calHoverDay, setCalHoverDay] = useState<number | null>(null);
  const [calModalDay, setCalModalDay] = useState<number | null>(null);

  const months = isRTL ? monthsHe : monthsEn;
  const dayNames = isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['S','M','T','W','T','F','S'];

  const monthTrades = useMemo(() => trades.filter(tr => {
    if (!tr.date) return false;
    const d = new Date(tr.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.getMonth() === calMonth && d.getFullYear() === calYear;
  }), [trades, calMonth, calYear]);

  const calDayPnl = useMemo(() => {
    const m: Record<number, { pnl: number; trades: number; wins: number; details: Trade[] }> = {};
    monthTrades.forEach(tr => {
      const d = new Date(tr.date.replace(' ', 'T'));
      const day = d.getDate();
      if (!m[day]) m[day] = { pnl: 0, trades: 0, wins: 0, details: [] };
      m[day].pnl += tr.pnl; m[day].trades++; if (tr.winLoss === 'Win') m[day].wins++;
      m[day].details.push(tr);
    });
    return m;
  }, [monthTrades]);

  const calDays = useMemo(() => getCalDays(calYear, calMonth), [calYear, calMonth]);

  const weekStats = useMemo(() => {
    const w: { week: number; pnl: number; trades: number; days: number }[] = [];
    let wp = 0, wt = 0, wd = 0, wn = 1;
    calDays.forEach((d, i) => {
      if (d && calDayPnl[d]) { wp += calDayPnl[d].pnl; wt += calDayPnl[d].trades; wd++; }
      if ((i + 1) % 7 === 0 || i === calDays.length - 1) { w.push({ week: wn, pnl: wp, trades: wt, days: wd }); wp = 0; wt = 0; wd = 0; wn++; }
    });
    return w;
  }, [calDays, calDayPnl]);

  const monthStats = useMemo(() => {
    const wins = monthTrades.filter(tr => tr.winLoss === 'Win').length;
    const losses = monthTrades.filter(tr => tr.winLoss === 'Loss').length;
    const totalPnl = monthTrades.reduce((s, tr) => s + tr.pnl, 0);
    const totalR = monthTrades.reduce((s, tr) => s + tr.returnR, 0);
    const winRate = monthTrades.length ? (wins / monthTrades.length) * 100 : 0;
    const expectancyR = monthTrades.length ? totalR / monthTrades.length : 0;
    return { count: monthTrades.length, wins, losses, totalPnl, totalR, winRate, expectancyR };
  }, [monthTrades]);

  // Previous month for comparison
  const prevStats = useMemo(() => {
    const pm = calMonth === 0 ? 11 : calMonth - 1;
    const py = calMonth === 0 ? calYear - 1 : calYear;
    const t2 = trades.filter(tr => {
      if (!tr.date) return false;
      const d = new Date(tr.date.replace(' ', 'T'));
      return !isNaN(d.getTime()) && d.getMonth() === pm && d.getFullYear() === py;
    });
    const wins = t2.filter(tr => tr.winLoss === 'Win').length;
    const totalPnl = t2.reduce((s, tr) => s + tr.pnl, 0);
    const winRate = t2.length ? (wins / t2.length) * 100 : 0;
    return { count: t2.length, totalPnl, winRate, label: months[pm] };
  }, [trades, calMonth, calYear, months]);

  // 1) Day-of-week performance
  const dowData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => ({ name: dayNames[i], pnl: 0, trades: 0 }));
    monthTrades.forEach(tr => {
      const d = new Date(tr.date.replace(' ', 'T'));
      const dow = d.getDay();
      buckets[dow].pnl += tr.pnl; buckets[dow].trades++;
    });
    return buckets;
  }, [monthTrades, dayNames]);

  // 2) Hourly performance
  const hourData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2, '0'), pnl: 0, trades: 0 }));
    monthTrades.forEach(tr => {
      const d = new Date(tr.date.replace(' ', 'T'));
      const h = d.getHours();
      buckets[h].pnl += tr.pnl; buckets[h].trades++;
    });
    return buckets.filter(b => b.trades > 0);
  }, [monthTrades]);

  // 3-4) Best & Worst day
  const bestWorst = useMemo(() => {
    const arr = Object.entries(calDayPnl).map(([d, v]) => ({ day: +d, ...v }));
    if (!arr.length) return { best: null, worst: null };
    arr.sort((a, b) => b.pnl - a.pnl);
    return { best: arr[0], worst: arr[arr.length - 1] };
  }, [calDayPnl]);

  // 5) Cumulative P&L line for month
  const cumData = useMemo(() => {
    const sorted = [...monthTrades].sort((a, b) => new Date(a.date.replace(' ', 'T')).getTime() - new Date(b.date.replace(' ', 'T')).getTime());
    let cum = 0;
    return sorted.map((tr, i) => { cum += tr.pnl; return { i: i + 1, cum: +cum.toFixed(2) }; });
  }, [monthTrades]);

  // 6) R-distribution histogram
  const rDist = useMemo(() => {
    const bins = [
      { name: '<-2R', min: -Infinity, max: -2, count: 0 },
      { name: '-2..-1R', min: -2, max: -1, count: 0 },
      { name: '-1..0R', min: -1, max: 0, count: 0 },
      { name: '0..1R', min: 0, max: 1, count: 0 },
      { name: '1..2R', min: 1, max: 2, count: 0 },
      { name: '2..3R', min: 2, max: 3, count: 0 },
      { name: '>3R', min: 3, max: Infinity, count: 0 },
    ];
    monthTrades.forEach(tr => {
      const r = tr.returnR;
      const b = bins.find(x => r > x.min && r <= x.max) || bins[bins.length - 1];
      b.count++;
    });
    return bins;
  }, [monthTrades]);

  // 8) Risk budget remaining
  const riskStatus = useMemo(() => checkRiskLimits(trades), [trades]);

  // 10) Active days
  const activeDays = useMemo(() => {
    const total = calDays.filter(d => d != null).length;
    const active = Object.keys(calDayPnl).length;
    return { active, total, pct: total ? Math.round((active / total) * 100) : 0 };
  }, [calDays, calDayPnl]);

  const calRiskStatus = checkRiskLimits(trades);

  // Tooltip style
  const ttStyle = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, fontSize: 11 } as React.CSSProperties;

  const Card = ({ title, children, glow }: { title: string; children: React.ReactNode; glow?: string }) => (
    <GlassCard T={T} glow={glow} style={{ padding: 14 }}>
      <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </GlassCard>
  );

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <FeatureHint
        T={T}
        id="calendar-hub-page"
        text={isRTL
          ? 'מרכז לוח השנה — תצוגה מלאה של ביצועי החודש, לפי ימים/שעות, השוואות, התפלגות R ותקציב סיכון נותר.'
          : 'Calendar Hub — full month performance: day/hour breakdowns, comparisons, R distribution, and remaining risk budget.'}
      />

      {/* Risk warning banners */}
      {calRiskStatus.monthlyBreached && (
        <div style={{ padding: '10px 16px', background: `${T.accent.red}15`, border: `2px solid ${T.accent.red}40`, borderRadius: T.radius.md, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.accent.red }}>{isRTL ? 'מגבלת הפסד חודשית הושגה' : 'Monthly Loss Limit Reached'}</div>
            <div style={{ fontSize: 10, color: T.text.muted }}>{isRTL ? `הפסד חודשי: ${calRiskStatus.monthlyNegR.toFixed(1)}R` : `Monthly loss: ${calRiskStatus.monthlyNegR.toFixed(1)}R`}</div>
          </div>
        </div>
      )}

      {/* Calendar grid + side weekly summary */}
      <div style={{ display: 'flex', gap: isMobile ? 12 : 18, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 3, minWidth: isMobile ? 0 : 460 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '5px 10px', color: T.text.secondary, cursor: 'pointer', fontSize: 16 }}>‹</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <select value={calYear} onChange={e => setCalYear(+e.target.value)} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '4px 8px', color: T.text.primary, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div style={{ fontSize: 17, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{months[calMonth]}</div>
              <button onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()); }} style={{ background: 'transparent', border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '3px 8px', color: T.text.muted, cursor: 'pointer', fontSize: 10 }}>{isRTL ? 'היום' : 'Today'}</button>
            </div>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '5px 10px', color: T.text.secondary, cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
          <GlassCard T={T} style={{ padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 2 : 3, marginBottom: 6 }}>
              {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? 8 : 9, color: T.text.muted, fontWeight: 600, padding: '3px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 2 : 3 }}>
              {calDays.map((d, i) => {
                const dd = d ? calDayPnl[d] : null;
                const isHovered = d === calHoverDay;
                const intensity = dd ? Math.min(1, Math.abs(dd.pnl) / 10) : 0;
                const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                const isDarkRed = riskColor === 'darkred';
                return (
                  <div key={i}
                    onMouseEnter={() => d && setCalHoverDay(d)}
                    onMouseLeave={() => setCalHoverDay(null)}
                    onClick={() => dd && d && setCalModalDay(d)}
                    style={{ minHeight: isMobile ? 48 : (isHovered && dd ? 95 : 68), borderRadius: T.radius.md, border: `1px solid ${isDarkRed ? `${T.accent.red}60` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(40 + intensity * 40).toString(16)}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(35 + intensity * 40).toString(16)}` : `${T.accent.orange}25`) : T.border.subtle}`, background: isDarkRed ? `${T.accent.red}20` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(10 + intensity * 20).toString(16).padStart(2, '0')}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(10 + intensity * 15).toString(16).padStart(2, '0')}` : `${T.accent.orange}10`) : 'transparent', padding: isMobile ? '3px 3px' : '5px 6px', transition: 'all 0.2s ease', cursor: dd ? 'pointer' : 'default' }}>
                    {d && <><div style={{ fontSize: 10, color: T.text.muted, display: 'flex', alignItems: 'center', gap: 3 }}>{d}{isDarkRed && <span title="Risk limit exceeded">⚠️</span>}</div>{dd && <><div style={{ fontSize: 13, fontWeight: 700, color: isDarkRed ? T.accent.red : dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>${Math.abs(dd.pnl).toFixed(0)}</div>
                      <div style={{ fontSize: 8, color: T.text.muted, marginTop: 1 }}>{dd.trades} {isRTL ? 'עס׳' : 'tr'} • {dd.wins}/{dd.trades}</div>
                      {isHovered && <div style={{ fontSize: 8, color: T.text.muted, marginTop: 2 }}>{dd.details.map(det => det.coin).join(', ')}</div>}
                    </>}</>}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
        <div style={{ flex: 1, minWidth: isMobile ? 0 : 190 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {isRTL ? 'סיכום שבועי' : 'Weekly Summary'}
          </div>
          {weekStats.map((w, i) => (
            <GlassCard T={T} key={i} style={{ marginBottom: 7, padding: 12 }}>
              <div style={{ fontSize: 9, color: T.text.muted, marginBottom: 4 }}>{isRTL ? `שבוע ${w.week}` : `Week ${w.week}`}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: w.pnl >= 0 ? T.accent.green : w.pnl < 0 ? T.accent.red : T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}` : '$0.00'}</div>
              <div style={{ fontSize: 9, color: T.text.muted, marginTop: 1 }}>{w.trades} {isRTL ? 'עסקאות' : 'trades'}</div>
            </GlassCard>
          ))}
          <GlassCard T={T} glow={T.accent.cyanGlow} style={{ marginTop: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{isRTL ? 'סה״כ חודש' : 'Monthly Total'}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: monthStats.totalPnl >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>${monthStats.totalPnl.toFixed(2)}</div>
            <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3 }}>{monthStats.count} {isRTL ? 'עסקאות' : 'trades'} • {monthStats.winRate.toFixed(0)}% WR</div>
          </GlassCard>
        </div>
      </div>

      {/* Section: 10 Calendar Hub Features */}
      <div style={{ marginTop: 28, marginBottom: 14, fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {isRTL ? 'לוח שנה — תובנות מתקדמות' : 'Calendar — Advanced Insights'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14 }}>

        {/* 1) Day of week performance */}
        <Card title={isRTL ? '1 · ביצועי יום בשבוע' : '1 · Day-of-Week Performance'}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={T.text.muted} fontSize={10} />
              <YAxis stroke={T.text.muted} fontSize={10} />
              <Tooltip contentStyle={ttStyle} />
              <ReferenceLine y={0} stroke={T.border.medium} />
              <Bar dataKey="pnl" fill={T.accent.cyan} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 2) Hourly performance */}
        <Card title={isRTL ? '2 · ביצועים לפי שעה' : '2 · Hourly Performance'}>
          {hourData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourData}>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke={T.text.muted} fontSize={10} />
                <YAxis stroke={T.text.muted} fontSize={10} />
                <Tooltip contentStyle={ttStyle} />
                <ReferenceLine y={0} stroke={T.border.medium} />
                <Bar dataKey="pnl" fill={T.accent.purple} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ padding: 20, textAlign: 'center', color: T.text.muted, fontSize: 11 }}>{isRTL ? 'אין מספיק נתונים' : 'Not enough data'}</div>}
        </Card>

        {/* 3) Best day */}
        <Card title={isRTL ? '3 · היום הכי טוב בחודש' : '3 · Best Day This Month'} glow={T.accent.greenGlow}>
          {bestWorst.best ? (
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>+${bestWorst.best.pnl.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>{months[calMonth]} {bestWorst.best.day} · {bestWorst.best.trades} {isRTL ? 'עסקאות' : 'trades'} · {bestWorst.best.wins}/{bestWorst.best.trades} W</div>
            </div>
          ) : <div style={{ color: T.text.muted, fontSize: 11 }}>{isRTL ? 'אין נתונים' : 'No data'}</div>}
        </Card>

        {/* 4) Worst day */}
        <Card title={isRTL ? '4 · היום הכי גרוע בחודש' : '4 · Worst Day This Month'} glow={T.accent.redGlow}>
          {bestWorst.worst ? (
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: bestWorst.worst.pnl < 0 ? T.accent.red : T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>${bestWorst.worst.pnl.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>{months[calMonth]} {bestWorst.worst.day} · {bestWorst.worst.trades} {isRTL ? 'עסקאות' : 'trades'} · {bestWorst.worst.wins}/{bestWorst.worst.trades} W</div>
            </div>
          ) : <div style={{ color: T.text.muted, fontSize: 11 }}>{isRTL ? 'אין נתונים' : 'No data'}</div>}
        </Card>

        {/* 5) Cumulative P&L line */}
        <Card title={isRTL ? '5 · רווח מצטבר בחודש' : '5 · Cumulative P&L'}>
          {cumData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cumData}>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="i" stroke={T.text.muted} fontSize={10} />
                <YAxis stroke={T.text.muted} fontSize={10} />
                <Tooltip contentStyle={ttStyle} />
                <ReferenceLine y={0} stroke={T.border.medium} />
                <Line dataKey="cum" stroke={T.accent.cyan} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ padding: 20, textAlign: 'center', color: T.text.muted, fontSize: 11 }}>{isRTL ? 'אין נתונים' : 'No data'}</div>}
        </Card>

        {/* 6) R-multiple histogram */}
        <Card title={isRTL ? '6 · התפלגות R בחודש' : '6 · R-Multiple Distribution'}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rDist}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={T.text.muted} fontSize={9} />
              <YAxis stroke={T.text.muted} fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" fill={T.accent.teal} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 7) Month vs prev month */}
        <Card title={isRTL ? `7 · השוואה — מול ${prevStats.label}` : `7 · vs ${prevStats.label}`}>
          {(() => {
            const dPnl = monthStats.totalPnl - prevStats.totalPnl;
            const dWR = monthStats.winRate - prevStats.winRate;
            const dCnt = monthStats.count - prevStats.count;
            const Stat = ({ label, val, fmt }: { label: string; val: number; fmt: (n: number) => string }) => (
              <div>
                <div style={{ fontSize: 9, color: T.text.muted }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: val >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{val >= 0 ? '+' : ''}{fmt(val)}</div>
              </div>
            );
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 4 }}>
                <Stat label="P&L Δ" val={dPnl} fmt={n => `$${n.toFixed(0)}`} />
                <Stat label="WR Δ" val={dWR} fmt={n => `${n.toFixed(1)}%`} />
                <Stat label={isRTL ? 'עסקאות Δ' : 'Trades Δ'} val={dCnt} fmt={n => `${n}`} />
              </div>
            );
          })()}
        </Card>

        {/* 8) Risk budget remaining */}
        <Card title={isRTL ? '8 · תקציב סיכון נותר' : '8 · Risk Budget Remaining'}>
          {(() => {
            const wkUsed = riskStatus.weeklyNegR;
            const moUsed = riskStatus.monthlyNegR;
            const wkRem = Math.max(0, DEFAULT_RISK_LIMITS.week - wkUsed);
            const moRem = Math.max(0, DEFAULT_RISK_LIMITS.month - moUsed);
            const Bar2 = ({ label, used, limit }: { label: string; used: number; limit: number }) => {
              const pct = Math.min(100, (used / limit) * 100);
              const color = pct > 80 ? T.accent.red : pct > 50 ? T.accent.orange : T.accent.green;
              return (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text.muted, marginBottom: 4 }}>
                    <span>{label}</span><span style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>{used.toFixed(1)}R / {limit}R</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: T.bg.secondary, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            };
            return (
              <div>
                <Bar2 label={isRTL ? 'שבועי' : 'Weekly'} used={wkUsed} limit={DEFAULT_RISK_LIMITS.week} />
                <Bar2 label={isRTL ? 'חודשי' : 'Monthly'} used={moUsed} limit={DEFAULT_RISK_LIMITS.month} />
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 6 }}>
                  {isRTL ? `נותר השבוע: ${wkRem.toFixed(1)}R · נותר החודש: ${moRem.toFixed(1)}R` : `Week left: ${wkRem.toFixed(1)}R · Month left: ${moRem.toFixed(1)}R`}
                </div>
              </div>
            );
          })()}
        </Card>

        {/* 9) Win rate gauge */}
        <Card title={isRTL ? '9 · אחוז זכייה — חודש' : '9 · Monthly Win Rate'}>
          {(() => {
            const wr = monthStats.winRate;
            const color = wr >= 55 ? T.accent.green : wr >= 40 ? T.accent.orange : T.accent.red;
            return (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 42, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{wr.toFixed(1)}%</div>
                <div style={{ height: 6, borderRadius: 3, background: T.bg.secondary, marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, wr)}%`, height: '100%', background: color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, fontSize: 11 }}>
                  <span style={{ color: T.accent.green }}>✓ {monthStats.wins}</span>
                  <span style={{ color: T.accent.red }}>✗ {monthStats.losses}</span>
                  <span style={{ color: T.text.muted }}>Σ {monthStats.count}</span>
                </div>
              </div>
            );
          })()}
        </Card>

        {/* 10) Active trading days */}
        <Card title={isRTL ? '10 · ימי מסחר פעילים' : '10 · Active Trading Days'}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{activeDays.active}<span style={{ color: T.text.muted, fontSize: 18 }}>/{activeDays.total}</span></div>
            <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>{activeDays.pct}% {isRTL ? 'מהחודש' : 'of month'}</div>
            <div style={{ height: 6, borderRadius: 3, background: T.bg.secondary, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${activeDays.pct}%`, height: '100%', background: T.accent.cyan }} />
            </div>
            <div style={{ fontSize: 10, color: T.text.muted, marginTop: 10 }}>
              {isRTL ? 'עסקאות ליום פעיל בממוצע: ' : 'Avg trades per active day: '}
              <span style={{ color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{activeDays.active ? (monthStats.count / activeDays.active).toFixed(1) : '0'}</span>
            </div>
          </div>
        </Card>
      </div>

      {calModalDay && (
        <CalendarModal
          T={T}
          t={{ month: months }}
          isRTL={isRTL}
          day={calModalDay}
          month={calMonth}
          year={calYear}
          trades={trades}
          onClose={() => setCalModalDay(null)}
          onGenerateInsight={onGenerateInsight}
        />
      )}
    </div>
  );
};

export default CalendarHubPage;
