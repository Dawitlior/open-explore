/**
 * LandingDemo — pixel-faithful preview of the real Orca platform.
 * Mirrors the actual app shell: Midnight + Gold palette, ULTIMATE chip,
 * right-side RTL nav, gauge-ring KPIs, calendar grid with economic events,
 * risk health bars, psychology radar, AI insights mainframe and Oracle bot.
 * Visitors switch pages from the same sidebar the real app uses.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  LayoutDashboard, CalendarDays, BookOpen, BarChart3, ShieldAlert, Brain,
  Sparkles, Satellite, ClipboardCheck, Settings, ChevronLeft, Plus,
} from 'lucide-react';

/* ── Real platform palette ─────────────────────────── */
const BG = '#061326';
const BG_2 = '#0a1f3d';
const BG_3 = '#0f2a4d';
const PANEL = 'rgba(255,255,255,0.025)';
const LINE = 'rgba(201,168,76,0.18)';
const LINE_SOFT = 'rgba(154,168,188,0.15)';
const GOLD = '#c9a84c';
const GOLD_2 = '#e8b84a';
const TXT = '#f5f3ee';
const TXT_2 = '#9aa8bc';
const TXT_3 = '#6b7990';
const CYAN = '#22d3ee';
const PURPLE = '#a78bfa';
const ORANGE = '#fb923c';
const GREEN = '#10b981';
const RED = '#ef4444';

const FONT = "'Heebo', 'Space Grotesk', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";

type Page = 'dashboard' | 'calendar' | 'risk' | 'psychology' | 'ai' | 'review';

const NAV: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard',  label: 'דשבורד',         icon: LayoutDashboard },
  { id: 'calendar',   label: 'לוח שנה',        icon: CalendarDays },
  { id: 'risk',       label: 'ניהול סיכונים',  icon: ShieldAlert },
  { id: 'psychology', label: 'פסיכולוגיה',     icon: Brain },
  { id: 'ai',         label: 'תובנות AI',      icon: Sparkles },
  { id: 'review',     label: 'סקירה שבועית',   icon: ClipboardCheck },
];

const tooltipStyle: React.CSSProperties = {
  background: '#061326',
  border: `1px solid ${LINE}`,
  borderRadius: 10,
  color: TXT,
  fontSize: 11,
  padding: '6px 10px',
  fontFamily: FONT,
};

export function LandingDemo() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div
      dir="rtl"
      className="relative w-full rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
      style={{
        background: `linear-gradient(135deg, ${BG_2} 0%, ${BG} 100%)`,
        border: `1px solid ${LINE}`,
        fontFamily: FONT,
      }}
    >
      {/* glow halos */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-72 h-72 rounded-full blur-3xl" style={{ background: `${GOLD}22` }} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-72 h-72 rounded-full blur-3xl" style={{ background: `${CYAN}15` }} />

      {/* Top toolbar — matches the real header */}
      <div className="relative flex items-center justify-between gap-3 px-3 py-2 border-b" style={{ borderColor: LINE, background: 'rgba(6,19,38,0.7)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
          </div>
          <div className="text-[9px] tracking-[0.25em] hidden sm:block" style={{ color: TXT_3, fontFamily: FONT_MONO }}>
            Orca Investment
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px]" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: GREEN }}>
            <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: GREEN }} /> $28.80
          </div>
          <div className="hidden md:block text-[10px]" style={{ color: TXT_2 }}>יום ד׳, 3 ביוני 2026</div>
          <button className="px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1" style={{ background: `linear-gradient(135deg, ${GREEN}, #059669)`, color: '#fff' }}>
            <Plus className="w-3 h-3" /> הוסף עסקה
          </button>
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest" style={{ background: 'rgba(167,139,250,0.15)', border: `1px solid ${PURPLE}55`, color: PURPLE, fontFamily: FONT_MONO }}>
            ULTIMATE
          </span>
        </div>
      </div>

      {/* Body: content + right sidebar (sidebar order-2 so RTL puts it on the right) */}
      <div className="relative grid grid-cols-[1fr_140px] min-h-[440px]">
        {/* Main content */}
        <div className="p-3 md:p-4 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {page === 'dashboard'  && <DashboardPage />}
              {page === 'calendar'   && <CalendarPage />}
              {page === 'risk'       && <RiskPage />}
              {page === 'psychology' && <PsychologyPage />}
              {page === 'ai'         && <AiPage />}
              {page === 'review'     && <ReviewPage />}
              
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right sidebar — real platform menu */}
        <aside className="border-r flex flex-col" style={{ borderColor: LINE, background: 'rgba(6,19,38,0.55)' }}>
          <div className="px-3 py-3 border-b" style={{ borderColor: LINE }}>
            <div className="text-[10px] font-bold tracking-[0.2em]" style={{ color: TXT, fontFamily: FONT }}>ORCA</div>
            <div className="text-[8px] tracking-[0.3em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>INVESTMENT</div>
          </div>
          <nav className="flex-1 px-1.5 py-2 space-y-0.5">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = page === id;
              return (
                <button
                  key={id}
                  onClick={() => setPage(id)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[10.5px] transition-all text-right"
                  style={{
                    background: active ? `linear-gradient(90deg, ${GOLD}22, transparent)` : 'transparent',
                    color: active ? GOLD : TXT_2,
                    border: active ? `1px solid ${GOLD}55` : '1px solid transparent',
                    fontFamily: FONT,
                  }}
                >
                  <span className="font-medium">{label}</span>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                </button>
              );
            })}
          </nav>
          <div className="px-2 py-2 border-t space-y-1" style={{ borderColor: LINE }}>
            <div className="w-full px-2 py-1.5 rounded-md text-[9px] font-bold tracking-wider text-center" style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${LINE}`, color: GOLD, fontFamily: FONT_MONO }}>
              יומן מסע
            </div>
            <div className="flex items-center justify-between px-2 py-1 text-[9px]" style={{ color: TXT_3 }}>
              <Settings className="w-3 h-3" /> הגדרות
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────── pages ─────────── */

function DashboardPage() {
  return (
    <div className="space-y-3">
      <div className="text-right">
        <div className="text-[9px] tracking-[0.25em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>♦ בריאות מערכת</div>
        <div className="text-base md:text-lg font-bold mt-0.5" style={{ color: TXT }}>דשבורד</div>
      </div>
      {/* 4 gauge rings */}
      <div className="grid grid-cols-4 gap-2">
        <GaugeRing label="ציון משמעת" value={100} color={GREEN} />
        <GaugeRing label="עקביות סיכון" value={100} color={ORANGE} />
        <GaugeRing label="התאמת משטר" value={51} color={PURPLE} />
        <GaugeRing label="ציון ORCA" value={86} color={CYAN} />
      </div>
      {/* Charts */}
      <div className="grid grid-cols-2 gap-2">
        <Panel title="התפלגות רווח/הפסד" badge="$">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={pnlBars} margin={{ left: -22, right: 4, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={LINE_SOFT} />
              <XAxis dataKey="i" tick={{ fill: TXT_3, fontSize: 7 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: TXT_3, fontSize: 7 }} tickLine={false} axisLine={false} />
              <ReferenceLine y={0} stroke={LINE_SOFT} />
              <Bar dataKey="v" radius={[2,2,0,0]}>
                {pnlBars.map((b, i) => <Cell key={i} fill={b.v >= 0 ? GREEN : RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="עקומת הון" badge="$">
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={equity} margin={{ left: -22, right: 4, top: 4, bottom: 0 }}>
              <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CYAN} stopOpacity={0.5} /><stop offset="100%" stopColor={CYAN} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="2 4" stroke={LINE_SOFT} />
              <XAxis dataKey="i" tick={{ fill: TXT_3, fontSize: 7 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: TXT_3, fontSize: 7 }} tickLine={false} axisLine={false} />
              <Area type="monotone" dataKey="v" stroke={CYAN} fill="url(#eqg)" strokeWidth={1.8} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function CalendarPage() {
  // Highlighted hub: interactive calendar that flags economic news days
  const today = 3;
  const newsDays = new Set([1, 2, 3, 4, 5, 6]);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <div className="text-[9px] tracking-[0.25em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>♦ HUB</div>
          <div className="text-base md:text-lg font-bold mt-0.5" style={{ color: TXT }}>לוח שנה — יוני 2026</div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px]" style={{ color: TXT_3 }}>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm" style={{ background: RED }} /> חדשות USD</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm" style={{ background: GOLD }} /> היום</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['א','ב','ג','ד','ה','ו','ש'].map(d => (
          <div key={d} className="text-center text-[8px] py-0.5" style={{ color: TXT_3 }}>{d}</div>
        ))}
        {days.map(d => {
          const news = newsDays.has(d);
          const isToday = d === today;
          return (
            <div
              key={d}
              className="aspect-square rounded-md flex flex-col items-end justify-between p-1 text-[8px] relative"
              style={{
                background: isToday ? 'rgba(201,168,76,0.12)' : PANEL,
                border: `1px solid ${isToday ? GOLD : LINE_SOFT}`,
                color: TXT_2,
              }}
            >
              <span style={{ color: isToday ? GOLD : TXT_2 }}>{d}</span>
              {news && (
                <span className="px-1 rounded-sm text-[7px] font-bold self-start" style={{ background: 'rgba(239,68,68,0.18)', border: `1px solid ${RED}55`, color: RED }}>
                  USD
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <Satellite className="w-3.5 h-3.5" style={{ color: RED }} />
        <span style={{ color: TXT_2 }}><span style={{ color: RED, fontWeight: 700 }}>סנכרון מכ"ם:</span> Inflation Rate YoY בשעה 10:00 — בדוק חשיפה לפני פתיחת פוזיציה.</span>
      </div>
    </div>
  );
}

function RiskPage() {
  return (
    <div className="space-y-3">
      <div className="text-right">
        <div className="text-[9px] tracking-[0.25em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>♦ מרכז בקרת סיכון</div>
        <div className="text-base md:text-lg font-bold mt-0.5" style={{ color: TXT }}>ניהול סיכונים</div>
      </div>
      {/* 4-tier limit bars */}
      <div className="space-y-1.5">
        {[
          { label: 'יומי',   max: -2,  used: 0,    pct: 0 },
          { label: 'שבועי',  max: -5,  used: -1.2, pct: 24 },
          { label: 'חודשי',  max: -10, used: -3.4, pct: 34 },
          { label: 'לעסקה', max: -1,  used: -0.6, pct: 60 },
        ].map(t => (
          <div key={t.label} className="rounded-md p-2" style={{ background: PANEL, border: `1px solid ${LINE_SOFT}` }}>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span style={{ color: TXT_2 }}>{t.label}</span>
              <span style={{ color: t.pct > 70 ? RED : t.pct > 40 ? ORANGE : GREEN, fontFamily: FONT_MONO }}>
                {t.used}R / {t.max}R
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${t.pct}%`, background: t.pct > 70 ? RED : t.pct > 40 ? ORANGE : GREEN }} />
            </div>
          </div>
        ))}
      </div>
      {/* gauge + key metric */}
      <div className="grid grid-cols-2 gap-2">
        <Panel title="מד סיכון">
          <div className="flex items-center justify-center h-[100px]">
            <SemiGauge value={100} color={RED} label="CRITICAL" />
          </div>
        </Panel>
        <Panel title="התפתחות סיכון">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={riskTrend} margin={{ left: -22, right: 4, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={LINE_SOFT} />
              <XAxis dataKey="i" tick={{ fill: TXT_3, fontSize: 7 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: TXT_3, fontSize: 7 }} tickLine={false} axisLine={false} />
              <Line type="monotone" dataKey="v" stroke={ORANGE} strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function PsychologyPage() {
  return (
    <div className="space-y-3">
      <div className="text-right">
        <div className="text-[9px] tracking-[0.25em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>♦ אינדקס בריאות התנהגותית</div>
        <div className="text-base md:text-lg font-bold mt-0.5" style={{ color: TXT }}>פסיכולוגיה — ציון 80</div>
      </div>
      <div className="grid grid-cols-[1fr_1.2fr] gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MiniRing label="עקביות" value={100} color={ORANGE} />
          <MiniRing label="משמעת"  value={100} color={GREEN} />
          <MiniRing label="רגשי"   value={100} color={PURPLE} />
          <MiniRing label="ORCA"   value={86}  color={CYAN} />
        </div>
        <Panel title="מטריצת ביצוע">
          <ResponsiveContainer width="100%" height={150}>
            <RadarChart data={radar} outerRadius="75%">
              <PolarGrid stroke={LINE_SOFT} />
              <PolarAngleAxis dataKey="k" tick={{ fill: TXT_3, fontSize: 8 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar dataKey="v" stroke={CYAN} fill={CYAN} fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div className="rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />
        <span style={{ color: TXT_2 }}><span style={{ color: RED, fontWeight: 700 }}>רצף נוכחי:</span> 4 הפסדים — שקול הפסקה לפני הטרייד הבא.</span>
      </div>
    </div>
  );
}

function AiPage() {
  return (
    <div className="space-y-3">
      <div className="text-right">
        <div className="text-[9px] tracking-[0.25em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>♦ MAINFRAME</div>
        <div className="text-base md:text-lg font-bold mt-0.5" style={{ color: TXT }}>מנוע תובנות עמוק</div>
        <div className="text-[10px] mt-1" style={{ color: TXT_2 }}>ניתוח רב-שכבתי של 145 trades — מזהה דפוסים סמויים שאף סוחר לא רואה לבד.</div>
      </div>
      <div className="rounded-2xl p-3 relative overflow-hidden" style={{ background: 'radial-gradient(circle at 60% 50%, rgba(34,211,238,0.15), transparent 70%)', border: `1px solid ${CYAN}33` }}>
        <svg viewBox="0 0 300 140" className="w-full h-[150px]">
          <g stroke={CYAN} strokeWidth="1" fill="none" opacity="0.5">
            <line x1="50" y1="30" x2="150" y2="30" />
            <line x1="50" y1="70" x2="150" y2="70" />
            <line x1="50" y1="110" x2="150" y2="110" />
            <line x1="150" y1="30" x2="150" y2="110" />
            <line x1="150" y1="70" x2="220" y2="70" />
          </g>
          {[[50,30],[50,70],[50,110],[150,30],[150,110]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={CYAN} />
          ))}
          <rect x="180" y="40" width="80" height="60" rx="10" fill="rgba(34,211,238,0.08)" stroke={CYAN} />
          <text x="220" y="65" textAnchor="middle" fontSize="8" fill={CYAN} fontFamily={FONT_MONO} letterSpacing="2">ORCA-AI</text>
          <circle cx="220" cy="80" r="6" fill={CYAN} opacity="0.8" />
          <text x="220" y="98" textAnchor="middle" fontSize="7" fill={TXT_2}>הפעל</text>
        </svg>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {[
            { k: 'דפוס', v: 'Asia session = -0.4R avg', c: RED },
            { k: 'Alpha', v: 'NY-PM long = +1.6R', c: GREEN },
            { k: 'אזהרה', v: 'overtrading ימי ה׳', c: ORANGE },
          ].map(t => (
            <div key={t.k} className="rounded-md p-1.5" style={{ background: PANEL, border: `1px solid ${LINE_SOFT}` }}>
              <div className="text-[8px] tracking-wider" style={{ color: TXT_3, fontFamily: FONT_MONO }}>{t.k}</div>
              <div className="text-[10px] font-semibold mt-0.5" style={{ color: t.c }}>{t.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <div className="text-[9px] tracking-[0.25em]" style={{ color: GOLD, fontFamily: FONT_MONO }}>♦ WEEKLY DEBRIEF</div>
          <div className="text-base md:text-lg font-bold mt-0.5" style={{ color: TXT }}>סקירה שבועית — חודשית — שנתית</div>
        </div>
        <div className="flex gap-1">
          {['שבועי', 'חודשי', 'שנתי'].map((t, i) => (
            <span key={t} className="px-2 py-0.5 rounded-md text-[9px]" style={{ background: i === 0 ? `${GOLD}22` : PANEL, border: `1px solid ${i === 0 ? GOLD : LINE_SOFT}`, color: i === 0 ? GOLD : TXT_2, fontFamily: FONT_MONO }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { l: 'R:R', v: '1.8' },
          { l: 'WIN', v: '+12R' },
          { l: 'AVG', v: '+0.4R' },
          { l: 'WR', v: '64%' },
          { l: 'NET', v: '+8.2R' },
        ].map(k => (
          <div key={k.l} className="rounded-lg p-2 text-center" style={{ background: PANEL, border: `1px solid ${LINE_SOFT}` }}>
            <div className="text-[8px] tracking-wider" style={{ color: TXT_3, fontFamily: FONT_MONO }}>{k.l}</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: GREEN, fontFamily: FONT_MONO }}>{k.v}</div>
          </div>
        ))}
      </div>
      <Panel title="✓ Prep Checklist">
        <div className="space-y-1 text-[10px] py-1">
          {['פתיחת לוג סטטיסטי', 'פתיחת יומן קלנדרי', 'סנכרון Market Journal', 'בדיקת מכ"ם כלכלי'].map((t, i) => (
            <div key={t} className="flex items-center gap-2" style={{ color: TXT_2 }}>
              <span className="w-3 h-3 rounded-sm flex items-center justify-center text-[8px]" style={{ background: i < 3 ? GREEN : 'transparent', border: `1px solid ${i < 3 ? GREEN : LINE_SOFT}`, color: '#fff' }}>{i < 3 ? '✓' : ''}</span>
              {t}
            </div>
          ))}
        </div>
      </Panel>
      <div className="rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-2" style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${LINE}` }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
        <span style={{ color: TXT_2 }}><span style={{ color: GOLD, fontWeight: 700 }}>AI Synthesis:</span> השבוע פתחת חזק ב-NY-PM. שמור על אותו חלון, צמצם הפסדים ב-Asia.</span>
      </div>
    </div>
  );
}


/* ─────────── building blocks ─────────── */

function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-2 md:p-2.5" style={{ background: PANEL, border: `1px solid ${LINE_SOFT}` }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[10px]" style={{ color: TXT_2 }}>{title}</div>
        {badge && <div className="text-[8px] px-1.5 rounded" style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, fontFamily: FONT_MONO }}>{badge}</div>}
      </div>
      {children}
    </div>
  );
}

function GaugeRing({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 22, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="rounded-lg p-2 md:p-2.5 flex flex-col items-center justify-center" style={{ background: PANEL, border: `1px solid ${LINE_SOFT}` }}>
      <div className="text-[9px] text-center mb-1" style={{ color: TXT_3 }}>{label}</div>
      <div className="relative w-[58px] h-[58px]">
        <svg className="w-full h-full -rotate-90">
          <circle cx="29" cy="29" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
          <circle cx="29" cy="29" r={r} stroke={color} strokeWidth="4" fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color, fontFamily: FONT_MONO }}>{value}</div>
      </div>
    </div>
  );
}

function MiniRing({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 18, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="rounded-lg p-1.5 flex flex-col items-center" style={{ background: PANEL, border: `1px solid ${LINE_SOFT}` }}>
      <div className="text-[8px]" style={{ color: TXT_3 }}>{label}</div>
      <div className="relative w-[44px] h-[44px]">
        <svg className="w-full h-full -rotate-90">
          <circle cx="22" cy="22" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
          <circle cx="22" cy="22" r={r} stroke={color} strokeWidth="3" fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color, fontFamily: FONT_MONO }}>{value}</div>
      </div>
    </div>
  );
}

function SemiGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const angle = (value / 100) * 180;
  const rad = (angle - 180) * (Math.PI / 180);
  const x = 50 + 40 * Math.cos(rad);
  const y = 50 + 40 * Math.sin(rad);
  return (
    <svg viewBox="0 0 100 60" className="w-full max-w-[140px]">
      <defs>
        <linearGradient id="sg" x1="0" x2="1">
          <stop offset="0%" stopColor={GREEN} />
          <stop offset="50%" stopColor={ORANGE} />
          <stop offset="100%" stopColor={RED} />
        </linearGradient>
      </defs>
      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#sg)" strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="50" x2={x} y2={y} stroke={TXT} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3" fill={color} />
      <text x="50" y="57" textAnchor="middle" fontSize="9" fill={color} fontWeight="bold" fontFamily={FONT_MONO}>{value}%</text>
      <text x="50" y="65" textAnchor="middle" fontSize="5" fill={color} fontFamily={FONT_MONO} letterSpacing="1.5">{label}</text>
    </svg>
  );
}

/* ─────────── data ─────────── */
const pnlBars = Array.from({ length: 24 }, (_, i) => ({ i: i + 1, v: Math.round((Math.sin(i / 2.5) + Math.cos(i / 1.8)) * 18) }));
const equity  = Array.from({ length: 30 }, (_, i) => ({ i: i + 1, v: Math.round(50 + Math.sin(i / 3) * 12 + i * 1.5) }));
const riskTrend = Array.from({ length: 20 }, (_, i) => ({ i: i + 1, v: Math.round(30 + Math.sin(i / 2) * 18 + i) }));
const radar = [
  { k: 'תנופה', v: 95 }, { k: 'טיעון', v: 65 }, { k: 'רגש', v: 70 },
  { k: 'צ׳יפים', v: 55 }, { k: 'מנטלי', v: 80 }, { k: 'Orca', v: 86 },
];
