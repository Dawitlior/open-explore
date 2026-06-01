/**
 * LandingDemo — interactive mini-dashboard rendered inside the landing
 * page hero. Lets visitors tab between Dashboard / Analytics / Risk /
 * Psychology AND switch between Standard / Advanced / Ultimate tiers,
 * with each combination showing a visibly distinct chart deck — so
 * pricing differentiation is felt before signup.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  generateMockTrades, computeMockStats, rBuckets, coinPerf,
  drawdownCurve, rollingExpectancy, disciplineTrend,
} from './landing-mock-data';

type Page = 'dashboard' | 'analytics' | 'risk' | 'psychology';
type Tier = 'standard' | 'advanced' | 'ultimate';

const PAGE_LABEL: Record<Page, string> = {
  dashboard: 'דשבורד',
  analytics: 'אנליטיקה',
  risk: 'סיכון',
  psychology: 'פסיכולוגיה',
};

const TIER_LABEL: Record<Tier, string> = {
  standard: 'סטנדרט',
  advanced: 'מתקדם',
  ultimate: 'אולטימייט',
};

const TIER_BLURB: Record<Tier, string> = {
  standard: 'הבסיס: עקומת הון, פיזור P&L, התפלגות R, נסיגה.',
  advanced: 'מקצועי: תוחלת מתגלגלת, ביצועי מטבעות, רדאר משמעת.',
  ultimate: 'הכל: ניתוח כיוון, מפת חום חודשית, ביצועים לפי יום.',
};

const TIER_TINT: Record<Tier, string> = {
  standard: '#64748b',
  advanced: '#4f46e5',
  ultimate: '#a78bfa',
};

const ACCENT = '#4f46e5';
const ACCENT_2 = '#a78bfa';
const GREEN = '#10b981';
const RED = '#ef4444';
const GRID = '#1e1e5a55';
const TEXT_MUTED = '#94a3b8';

const tooltipStyle: React.CSSProperties = {
  background: '#0a0a1a',
  border: '1px solid #1e1e5a',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 11,
  padding: '6px 10px',
  fontFamily: "'DM Sans', sans-serif",
};

export function LandingDemo() {
  const [page, setPage] = useState<Page>('dashboard');
  const [tier, setTier] = useState<Tier>('advanced');

  const trades = useMemo(() => generateMockTrades(60, 7), []);
  const stats = useMemo(() => computeMockStats(trades), [trades]);
  const equity = useMemo(() => trades.map(t => ({ i: t.i, balance: t.balance })), [trades]);
  const rDist = useMemo(() => rBuckets(trades), [trades]);
  const coins = useMemo(() => coinPerf(trades), [trades]);
  const dd = useMemo(() => drawdownCurve(trades), [trades]);
  const rollExp = useMemo(() => rollingExpectancy(trades), [trades]);
  const discipline = useMemo(() => disciplineTrend(trades), [trades]);

  // What each tier exposes per page (mirrors the real app's tier matrix)
  const charts = useMemo(() => buildChartList(page, tier), [page, tier]);

  return (
    <div
      dir="rtl"
      className="relative w-full rounded-2xl border border-[#1e1e5a]/60 bg-gradient-to-br from-[#0a0a1a] via-[#0d0d2a] to-[#141432] overflow-hidden shadow-[0_30px_80px_-20px_rgba(79,70,229,0.35)]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* glow halo */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-72 h-72 rounded-full bg-[#4f46e5]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-[#a78bfa]/20 blur-3xl" />

      {/* Top bar — fake browser chrome */}
      <div className="relative flex items-center gap-2 px-4 py-2.5 border-b border-[#1e1e5a]/60 bg-[#0a0a1a]/70 backdrop-blur">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/80" />
        </div>
        <div className="flex-1 text-center text-[10px] tracking-[0.2em] text-slate-500 font-mono">
          ORCA · {PAGE_LABEL[page].toUpperCase()} · {TIER_LABEL[tier].toUpperCase()}
        </div>
        <div className="text-[9px] text-emerald-400/80 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Page tabs */}
      <div className="relative flex gap-1 px-3 pt-3 pb-2 border-b border-[#1e1e5a]/40">
        {(Object.keys(PAGE_LABEL) as Page[]).map(p => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-3 py-1.5 text-[11px] rounded-md transition-all relative ${
              page === p
                ? 'text-white bg-[#4f46e5]/20 border border-[#4f46e5]/60'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.02em' }}
          >
            {PAGE_LABEL[p]}
            {page === p && (
              <motion.span
                layoutId="page-underline"
                className="absolute inset-x-2 -bottom-[7px] h-[2px] bg-gradient-to-l from-[#4f46e5] to-[#a78bfa]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tier switch — the heart of the upsell story */}
      <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1e1e5a]/40 bg-[#0a0a1a]/40">
        <div className="text-[10px] text-slate-500 font-mono tracking-[0.15em]">
          תוכנית פעילה
        </div>
        <div className="flex gap-1 bg-[#141432]/70 rounded-full p-1 border border-[#1e1e5a]/60">
          {(Object.keys(TIER_LABEL) as Tier[]).map(tt => (
            <button
              key={tt}
              onClick={() => setTier(tt)}
              className={`px-3 py-1 text-[10px] rounded-full transition-all ${
                tier === tt
                  ? 'text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{
                background: tier === tt ? `linear-gradient(135deg, ${TIER_TINT[tt]}, ${TIER_TINT[tt]}99)` : 'transparent',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {TIER_LABEL[tt]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="relative grid grid-cols-4 gap-px bg-[#1e1e5a]/40 border-b border-[#1e1e5a]/40">
        <Kpi label="P&L" value={`$${stats.totalPnl.toLocaleString()}`} positive={stats.totalPnl >= 0} />
        <Kpi label="Win Rate" value={`${stats.winRate}%`} />
        <Kpi label="Expectancy" value={`${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR}R`} positive={stats.expectancyR >= 0} />
        <Kpi label="Max DD" value={`${stats.maxDrawdown}%`} negative />
      </div>

      {/* Chart deck — animates on tier/page change */}
      <div className="relative p-4 min-h-[280px]">
        <div className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          {TIER_BLURB[tier]}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${page}-${tier}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 gap-3"
          >
            {charts.map(c => (
              <DemoChartCard key={c.id} title={c.title} subtitle={c.unit}>
                {renderChart(c.id, { equity, rDist, coins, dd, rollExp, discipline, trades, stats })}
              </DemoChartCard>
            ))}
            {charts.length === 0 && (
              <div className="col-span-2 text-center py-10 text-slate-500 text-xs">
                בחר תוכנית כדי לראות תכולה.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────── helpers ─────────── */

function Kpi({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  const color = positive ? GREEN : negative ? '#fb923c' : '#e2e8f0';
  return (
    <div className="px-3 py-2.5 bg-[#0a0a1a]/60">
      <div className="text-[9px] text-slate-500 tracking-[0.15em] uppercase mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{label}</div>
      <div className="text-sm font-semibold tabular-nums" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

function DemoChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#1e1e5a]/50 bg-[#0a0a1a]/40 p-2.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[10px] text-slate-300 font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</div>
        {subtitle && <div className="text-[8px] text-slate-500 font-mono">{subtitle}</div>}
      </div>
      <div className="h-[110px]">{children}</div>
    </div>
  );
}

type ChartId = 'equity' | 'pnlDist' | 'rDist' | 'rollExp' | 'coinPerf' | 'direction' | 'monthly' | 'dd' | 'allocation' | 'discipline' | 'lossPressure' | 'sortino' | 'sessionHeat';

interface DemoChart { id: ChartId; title: string; unit?: string; }

function buildChartList(page: Page, tier: Tier): DemoChart[] {
  if (page === 'dashboard') {
    const base: DemoChart[] = [
      { id: 'equity', title: 'עקומת הון', unit: '$' },
      { id: 'pnlDist', title: 'התפלגות P&L', unit: '$' },
    ];
    if (tier === 'standard') return base;
    if (tier === 'advanced') return [...base, { id: 'coinPerf', title: 'ביצועי מטבעות', unit: '$' }, { id: 'discipline', title: 'מד משמעת', unit: '%' }];
    return [...base, { id: 'direction', title: 'ניתוח כיוון', unit: '%' }, { id: 'monthly', title: 'ביצועים חודשיים', unit: 'R' }];
  }
  if (page === 'analytics') {
    const base: DemoChart[] = [{ id: 'rDist', title: 'התפלגות R-Multiple', unit: 'R' }];
    if (tier === 'standard') return base;
    if (tier === 'advanced') return [...base, { id: 'rollExp', title: 'תוחלת מתגלגלת', unit: 'R' }, { id: 'coinPerf', title: 'תוחלת לפי מטבע', unit: '$' }];
    return [...base, { id: 'rollExp', title: 'תוחלת מתגלגלת', unit: 'R' }, { id: 'sortino', title: 'Sortino מתגלגל', unit: 'σ' }, { id: 'sessionHeat', title: 'ביצועים לפי סשן', unit: 'R' }];
  }
  if (page === 'risk') {
    const base: DemoChart[] = [{ id: 'dd', title: 'ניתוח נסיגה', unit: '%' }];
    if (tier === 'standard') return base;
    if (tier === 'advanced') return [...base, { id: 'allocation', title: 'הקצאת סיכון', unit: '%' }];
    return [...base, { id: 'allocation', title: 'הקצאת סיכון', unit: '%' }, { id: 'lossPressure', title: 'לחץ רצף הפסדים', unit: '%' }];
  }
  // psychology
  if (tier === 'standard') return [{ id: 'discipline', title: 'מגמת משמעת', unit: '%' }];
  if (tier === 'advanced') return [{ id: 'discipline', title: 'מגמת משמעת', unit: '%' }, { id: 'lossPressure', title: 'לחץ רצף הפסדים', unit: '%' }];
  return [{ id: 'discipline', title: 'מגמת משמעת', unit: '%' }, { id: 'lossPressure', title: 'לחץ רצף הפסדים', unit: '%' }, { id: 'rollExp', title: 'ביטחון מול תוצאה', unit: 'R' }];
}

interface RenderCtx {
  equity: { i: number; balance: number }[];
  rDist: { label: string; from: number; to: number; n: number }[];
  coins: { coin: string; pnl: number }[];
  dd: { i: number; dd: number }[];
  rollExp: { i: number; exp: number }[];
  discipline: { i: number; pct: number }[];
  trades: ReturnType<typeof generateMockTrades>;
  stats: ReturnType<typeof computeMockStats>;
}

function renderChart(id: ChartId, ctx: RenderCtx) {
  switch (id) {
    case 'equity':
      return (
        <ResponsiveContainer><AreaChart data={ctx.equity} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <defs><linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.55} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0.05} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} domain={['dataMin', 'dataMax']} />
          <Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="balance" stroke={ACCENT} fill="url(#eqG)" strokeWidth={2} />
        </AreaChart></ResponsiveContainer>
      );
    case 'pnlDist':
      return (
        <ResponsiveContainer><BarChart data={ctx.trades.map(t => ({ i: t.i, pnl: t.pnl }))} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><ReferenceLine y={0} stroke={GRID} /><Bar dataKey="pnl" radius={[2,2,0,0]}>{ctx.trades.map((t, i) => <Cell key={i} fill={t.pnl >= 0 ? GREEN : RED} />)}</Bar>
        </BarChart></ResponsiveContainer>
      );
    case 'rDist':
      return (
        <ResponsiveContainer><BarChart data={ctx.rDist} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="n" radius={[2,2,0,0]}>{ctx.rDist.map((b, i) => <Cell key={i} fill={b.from >= 0 ? GREEN : RED} />)}</Bar>
        </BarChart></ResponsiveContainer>
      );
    case 'rollExp':
      return (
        <ResponsiveContainer><LineChart data={ctx.rollExp} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><ReferenceLine y={0} stroke={GRID} /><Line type="monotone" dataKey="exp" stroke={ACCENT_2} strokeWidth={2} dot={false} />
        </LineChart></ResponsiveContainer>
      );
    case 'coinPerf':
      return (
        <ResponsiveContainer><BarChart data={ctx.coins} layout="vertical" margin={{ left: 4, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis type="number" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="coin" tick={{ fill: TEXT_MUTED, fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="pnl" radius={[0,3,3,0]}>{ctx.coins.map((c, i) => <Cell key={i} fill={c.pnl >= 0 ? GREEN : RED} />)}</Bar>
        </BarChart></ResponsiveContainer>
      );
    case 'direction': {
      const longs = ctx.trades.filter(t => t.side === 'Long').length;
      const shorts = ctx.trades.length - longs;
      const data = [{ name: 'Long', n: longs }, { name: 'Short', n: shorts }];
      return (
        <ResponsiveContainer><PieChart>
          <Pie data={data} dataKey="n" cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 8, fill: '#e2e8f0' }}>
            <Cell fill={GREEN} /><Cell fill={ACCENT_2} />
          </Pie><Tooltip contentStyle={tooltipStyle} />
        </PieChart></ResponsiveContainer>
      );
    }
    case 'monthly': {
      const monthly: { m: string; r: number }[] = [];
      const map = new Map<string, number>();
      ctx.trades.forEach(t => {
        const m = t.date.slice(5, 7);
        map.set(m, (map.get(m) || 0) + t.r);
      });
      map.forEach((r, m) => monthly.push({ m, r: +r.toFixed(2) }));
      return (
        <ResponsiveContainer><BarChart data={monthly} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="m" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="r" radius={[2,2,0,0]}>{monthly.map((m, i) => <Cell key={i} fill={m.r >= 0 ? GREEN : RED} />)}</Bar>
        </BarChart></ResponsiveContainer>
      );
    }
    case 'dd':
      return (
        <ResponsiveContainer><AreaChart data={ctx.dd} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <defs><linearGradient id="ddG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0.55} /><stop offset="100%" stopColor={RED} stopOpacity={0.05} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="dd" stroke={RED} fill="url(#ddG)" strokeWidth={2} />
        </AreaChart></ResponsiveContainer>
      );
    case 'allocation': {
      const total = ctx.coins.reduce((s, c) => s + Math.abs(c.pnl), 0);
      const data = ctx.coins.slice(0, 5).map(c => ({ name: c.coin, n: total > 0 ? +((Math.abs(c.pnl) / total) * 100).toFixed(1) : 0 }));
      return (
        <ResponsiveContainer><PieChart>
          <Pie data={data} dataKey="n" cx="50%" cy="50%" innerRadius={24} outerRadius={48} paddingAngle={2} style={{ fontSize: 8 }}>
            {data.map((_, i) => <Cell key={i} fill={[ACCENT, ACCENT_2, '#06b6d4', '#10b981', '#f59e0b'][i]} />)}
          </Pie><Tooltip contentStyle={tooltipStyle} />
        </PieChart></ResponsiveContainer>
      );
    }
    case 'discipline':
      return (
        <ResponsiveContainer><AreaChart data={ctx.discipline} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <defs><linearGradient id="dsG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.45} /><stop offset="100%" stopColor={GREEN} stopOpacity={0.05} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="pct" stroke={GREEN} fill="url(#dsG)" strokeWidth={2} />
        </AreaChart></ResponsiveContainer>
      );
    case 'lossPressure':
      return (
        <ResponsiveContainer><LineChart data={ctx.discipline.map(d => ({ i: d.i, p: 100 - d.pct }))} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="p" stroke="#fb923c" strokeWidth={2} dot={false} />
        </LineChart></ResponsiveContainer>
      );
    case 'sortino':
      return (
        <ResponsiveContainer><LineChart data={ctx.rollExp.map(d => ({ i: d.i, s: d.exp * 1.4 }))} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="i" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><ReferenceLine y={0} stroke={GRID} /><Line type="monotone" dataKey="s" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart></ResponsiveContainer>
      );
    case 'sessionHeat': {
      const sessions = ['Asia', 'London', 'NY-AM', 'NY-PM'];
      const data = sessions.map((s, i) => ({ s, r: +((ctx.stats.expectancyR + (i - 1.5) * 0.15) * 10).toFixed(2) }));
      return (
        <ResponsiveContainer><BarChart data={data} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={GRID} /><XAxis dataKey="s" tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: TEXT_MUTED, fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="r" radius={[2,2,0,0]}>{data.map((d, i) => <Cell key={i} fill={d.r >= 0 ? GREEN : RED} />)}</Bar>
        </BarChart></ResponsiveContainer>
      );
    }
  }
}
