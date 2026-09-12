import { createContext, useContext, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BookText,
  BarChart3,
  ShieldCheck,
  Radar,
  ChevronDown,
  Menu,
  X,
  LayoutGrid,
  Sunrise,
  Moon,
  CalendarDays,
  Cable,
  FileUp,
  Sparkles,
  Brain,
  Gauge,
} from 'lucide-react'
import { scroll } from '../lib/scroll-store'
import { IconTile, type Accent } from './ui/primitives'

/* Section links behave differently by route: on the home page they are in-page
   hash anchors (Lenis smooth-scroll); elsewhere they navigate home first. */
const OnHomeContext = createContext(true)
function useSectionHref(href: string) {
  const onHome = useContext(OnHomeContext)
  return href.startsWith('#') && !onHome ? `/${href}` : href
}

/* ============================================================================
   NAV BAR — clean light bar with a three-pane "Features" mega-menu (categories
   → feature list → live preview image on hover, TraderWaves-style), a simple
   "Solutions" dropdown, plain links, and a gradient "Get started" pill.
   Feature items point at existing sections for now; they'll become pages.
   ========================================================================== */

type MenuItem = {
  Icon: typeof BookText
  accent: Accent
  title: string
  desc: string
  href: string
  preview?: string
  soon?: boolean
}

// ── feature catalogue ───────────────────────────────────────────────────────
const F = {
  dashboard: { Icon: Gauge, accent: 'indigo', title: 'Dashboard', desc: 'Your whole account at a glance', href: '/features/dashboard', preview: '/dashboard.png' },
  journal: { Icon: BookText, accent: 'violet', title: 'Trade Journal', desc: 'Trades synced & tagged automatically', href: '/features/journal' },
  analytics: { Icon: BarChart3, accent: 'teal', title: 'Analytics', desc: 'Dashboards, metrics and reports', href: '/features/analytics', preview: '/carousel/analytics.png' },
  ai: { Icon: Sparkles, accent: 'violet', title: 'AI Insights', desc: 'Patterns you would never spot alone', href: '/features/ai', preview: '/carousel/insights.png' },
  risk: { Icon: ShieldCheck, accent: 'amber', title: 'Risk Engine', desc: '4-tier capital protection', href: '/features/risk' },
  traderMind: { Icon: Brain, accent: 'rose', title: 'Trader Mind', desc: 'Your behavioral mirror', href: '/features/trader-mind' },
  morning: { Icon: Sunrise, accent: 'amber', title: 'Market Morning Analysis', desc: 'Set bias & plan before the open', href: '/features/morning', preview: '/carousel/morning.png' },
  eod: { Icon: Moon, accent: 'violet', title: 'End of Day Review', desc: 'Reflect and lock in the lesson', href: '/features/eod', preview: '/carousel/calendar.png' },
  economic: { Icon: CalendarDays, accent: 'teal', title: 'Economic Calendar', desc: 'Every high-impact release', href: '/features/economic-calendar', preview: '/carousel/economic.png' },
  integrations: { Icon: Cable, accent: 'indigo', title: 'Integrations', desc: 'Connect any exchange, read-only', href: '/exchanges' },
  universalImport: { Icon: FileUp, accent: 'teal', title: 'Universal Import', desc: 'Drop any statement file', href: '/features/universal-import' },
} satisfies Record<string, MenuItem>

type Category = { key: string; label: string; Icon: typeof BookText; items: MenuItem[] }

const CATEGORIES: Category[] = [
  { key: 'overview', label: 'Overview', Icon: LayoutGrid, items: [F.dashboard, F.journal, F.analytics, F.risk, F.traderMind, F.integrations, F.universalImport, F.ai] },
  { key: 'analyze', label: 'Analyze', Icon: BarChart3, items: [F.analytics, F.ai] },
  { key: 'routine', label: 'Routine', Icon: Sunrise, items: [F.morning, F.eod, F.economic] },
]

function MenuRow({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  const href = useSectionHref(item.href)
  const cls = 'flex items-start gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-canvas-deep'
  const inner = (
    <>
      <IconTile accent={item.accent}>
        <item.Icon className="h-5 w-5" strokeWidth={1.75} />
      </IconTile>
      <span className="flex flex-col">
        <span className="text-[13.5px] font-bold text-ink">{item.title}</span>
        <span className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{item.desc}</span>
      </span>
    </>
  )
  // Internal route → SPA Link; section anchor → plain <a>.
  return href.startsWith('/') && !href.startsWith('/#') ? (
    <Link to={href} onClick={onClick} className={cls}>{inner}</Link>
  ) : (
    <a href={href} onClick={onClick} className={cls}>{inner}</a>
  )
}

/* ── Features mega-menu (categories → list → preview) ────────────────────── */
function MegaMenu({ light = false }: { light?: boolean }) {
  const [active, setActive] = useState('overview')
  const [hovered, setHovered] = useState<MenuItem>(CATEGORIES[0].items[0])
  const cat = CATEGORIES.find((c) => c.key === active) ?? CATEGORIES[0]
  const onHome = useContext(OnHomeContext)
  const linkFor = (h: string) => (h.startsWith('#') && !onHome ? `/${h}` : h)

  const pickCategory = (c: Category) => {
    setActive(c.key)
    setHovered(c.items[0])
  }

  return (
    <div className="group relative">
      <button className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors duration-200 ${light ? 'text-white/85 group-hover:text-white' : 'text-ink-mute group-hover:text-ink'}`}>
        Features
        <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" strokeWidth={2} />
      </button>
      <div className="invisible absolute top-full left-1/2 z-50 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="w-[740px] rounded-2xl border border-line bg-surface p-3 elev-3">
          <div className="grid grid-cols-[160px_minmax(0,1fr)_244px] gap-3">
            {/* categories */}
            <div className="flex flex-col gap-0.5 border-r border-line pr-3">
              <span className="micro px-3 pb-1.5 text-ink-faint">Categories</span>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onMouseEnter={() => pickCategory(c)}
                  onFocus={() => pickCategory(c)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
                    active === c.key ? 'bg-indigo-soft text-indigo' : 'text-ink-mute hover:text-ink'
                  }`}
                >
                  <c.Icon className="h-4 w-4" strokeWidth={1.75} />
                  {c.label}
                </button>
              ))}
            </div>

            {/* feature list */}
            <div>
              <span className="micro block px-2 pb-1 text-ink-faint">{cat.label}</span>
              <div className="flex flex-col">
                {cat.items.map((it) => {
                  const to = linkFor(it.href)
                  const rowCls = `flex items-start gap-3 rounded-xl p-2.5 transition-colors duration-150 ${
                    hovered.title === it.title ? 'bg-canvas-deep' : 'hover:bg-canvas-deep'
                  }`
                  const rowInner = (
                    <>
                      <IconTile accent={it.accent}>
                        <it.Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </IconTile>
                      <span className="flex flex-col">
                        <span className="text-[13.5px] font-bold text-ink">{it.title}</span>
                        <span className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{it.desc}</span>
                      </span>
                    </>
                  )
                  return to.startsWith('/') && !to.startsWith('/#') ? (
                    <Link key={it.title} to={to} onMouseEnter={() => setHovered(it)} className={rowCls}>{rowInner}</Link>
                  ) : (
                    <a key={it.title} href={to} onMouseEnter={() => setHovered(it)} className={rowCls}>{rowInner}</a>
                  )
                })}
              </div>
            </div>

            {/* live preview */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
              <div
                className="flex aspect-[16/10] w-full items-center justify-center p-3"
                style={{
                  background:
                    'radial-gradient(140px 120px at 50% 30%, rgba(124,58,237,0.12), transparent 70%), #eef0f3',
                }}
              >
                {hovered.preview ? (
                  <img
                    src={hovered.preview}
                    alt=""
                    className="max-h-full max-w-full rounded-lg border border-line object-contain shadow-sm"
                  />
                ) : (
                  <IconTile accent={hovered.accent}>
                    <hovered.Icon className="h-6 w-6" strokeWidth={1.6} />
                  </IconTile>
                )}
              </div>
              <div className="border-t border-line bg-surface px-4 py-3">
                <span className="text-[13px] font-bold text-ink">{hovered.title}</span>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mute">{hovered.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NavBar({ darkNav = false }: { darkNav?: boolean }) {
  const [solid, setSolid] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const onHome = location.pathname === '/'
  const sec = (h: string) => (onHome ? h : `/${h}`)
  // On a dark/colored hero, the transparent (top, un-scrolled) nav needs light
  // text; once it turns solid (glass white) on scroll, revert to dark.
  const light = darkNav && !solid && !mobileOpen

  useEffect(() => {
    let raf = 0
    let last = false
    const loop = () => {
      const isSolid = scroll.progress > 0.012
      if (isSolid !== last) {
        last = isSolid
        setSolid(isSolid)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <OnHomeContext.Provider value={onHome}>
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
        solid || mobileOpen ? 'glass border-b border-line' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-6 md:px-10">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center">
            <img src="/orca-icon.png" alt="Orca Investment" className="h-9 w-9 rounded-full object-cover" />
            <span className="live-dot absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-teal" />
          </span>
          <span className={`font-display text-[15px] font-bold tracking-[-0.01em] ${light ? 'text-white' : 'text-ink'}`}>
            Orca Investment
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 lg:flex">
          <li><MegaMenu light={light} /></li>
          <li>
            <Link to="/exchanges" className={`rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${light ? 'text-white/85 hover:text-white' : `hover:text-ink ${location.pathname === '/exchanges' ? 'text-ink' : 'text-ink-mute'}`}`}>
              Exchanges
            </Link>
          </li>
          <li>
            <Link to="/pricing" className={`rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${light ? 'text-white/85 hover:text-white' : `hover:text-ink ${onHome ? 'text-ink-mute' : 'text-ink'}`}`}>
              Pricing
            </Link>
          </li>
        </ul>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Link to="/login" className={`hidden rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors sm:inline-flex ${light ? 'text-white/85 hover:text-white' : 'text-ink-mute hover:text-ink'}`}>
            Log in
          </Link>
          <Link
            to="/signup"
            className="group hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-8px_rgba(124,58,237,0.7)] sm:inline-flex"
          >
            Get started
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </Link>
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            className={`flex h-10 w-10 items-center justify-center rounded-full lg:hidden ${light ? 'text-white' : 'text-ink'}`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-68px)] overflow-y-auto border-t border-line bg-surface px-6 pb-8 lg:hidden">
          <span className="micro mt-6 block text-ink-faint">Features</span>
          <div className="mt-2 flex flex-col">
            {CATEGORIES[0].items.map((it) => (
              <MenuRow key={it.title} item={it} onClick={() => setMobileOpen(false)} />
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-1 border-t border-line pt-4">
            <Link to="/exchanges" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink">Exchanges</Link>
            <Link to="/pricing" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink">Pricing</Link>
          </div>
          <Link
            to="/signup"
            onClick={() => setMobileOpen(false)}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-5 py-3 text-[15px] font-semibold text-white"
          >
            Get started →
          </Link>
        </div>
      )}
    </header>
    </OnHomeContext.Provider>
  )
}
