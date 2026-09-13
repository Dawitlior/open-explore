import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Tag, X, ArrowRight } from 'lucide-react'
import {
  LineChart, BookText, Brain, ShieldCheck, Sparkles, CalendarClock, Sunrise, Moon, PlugZap, FileUp,
} from 'lucide-react'

/* ============================================================================
   MOBILE NAV — mobile-native, not a shrunk desktop menu. A thumb-zone bottom bar
   is the primary navigation; "Explore" opens a bottom sheet that slides up and
   is dismissible by swipe-down or backdrop tap. Light haptics on tap. Hidden on
   lg+ (desktop keeps the top nav). Replaces the top hamburger on phones.
   ========================================================================== */

const buzz = (ms = 8) => { try { navigator.vibrate?.(ms) } catch { /* unsupported */ } }

const FEATURES: { to: string; label: string; sub: string; Icon: typeof Home }[] = [
  { to: '/features/dashboard', label: 'Dashboard', sub: 'Your whole account at a glance', Icon: LayoutGrid },
  { to: '/features/journal', label: 'Trade Journal', sub: 'Synced & tagged automatically', Icon: BookText },
  { to: '/features/analytics', label: 'Analytics', sub: 'Dashboards, metrics and reports', Icon: LineChart },
  { to: '/features/risk', label: 'Risk Engine', sub: '4-tier capital protection', Icon: ShieldCheck },
  { to: '/features/trader-mind', label: 'Trader Mind', sub: 'Your behavioral mirror', Icon: Brain },
  { to: '/features/economic-calendar', label: 'Economic Calendar', sub: 'The day, market by market', Icon: CalendarClock },
  { to: '/features/morning', label: 'Morning Analysis', sub: 'Start the day prepared', Icon: Sunrise },
  { to: '/features/eod', label: 'End-of-Day Review', sub: 'Close the loop each night', Icon: Moon },
  { to: '/features/universal-import', label: 'Universal Import', sub: 'Drop any statement file', Icon: FileUp },
  { to: '/features/ai', label: 'AI Insights', sub: 'Patterns you would never spot', Icon: Sparkles },
]
const MORE: { to: string; label: string }[] = [
  { to: '/exchanges', label: 'Exchanges' },
  { to: '/resources', label: 'Resources' },
  { to: '/security', label: 'Security' },
  { to: '/our-goals', label: 'Our goals' },
  { to: '/contact', label: 'Contact' },
]

function BottomSheet({ onClose }: { onClose: () => void }) {
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef(0)
  const dragging = useRef(false)

  useEffect(() => { const r = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(r) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => { setEntered(false); setTimeout(onClose, 260) }

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; dragging.current = true }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => { dragging.current = false; if (dragY > 90) { buzz(10); close() } else setDragY(0) }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div
        onClick={close}
        className="absolute inset-0 bg-ink/45 transition-opacity duration-300"
        style={{ opacity: entered ? 1 : 0 }}
      />
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-[28px] border-t border-line bg-surface"
        style={{
          transform: `translateY(${entered ? dragY : 900}px)`,
          transition: dragging.current ? 'none' : 'transform 0.32s cubic-bezier(0.22,1,0.36,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -20px 60px -20px rgba(15,17,22,0.35)',
        }}
      >
        {/* drag handle */}
        <div className="flex shrink-0 flex-col items-center pt-3 pb-1">
          <span className="h-1.5 w-11 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-2">
          <span className="micro text-ink-faint">Explore Orca</span>
          <button onClick={close} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute hover:bg-canvas-deep">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col gap-1">
            {FEATURES.map(({ to, label, sub, Icon }) => (
              <Link key={to} to={to} onClick={() => buzz()} className="flex items-center gap-3.5 rounded-2xl px-3 py-2.5 active:bg-canvas-deep">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-soft text-indigo">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{label}</span>
                  <span className="block truncate text-[12.5px] text-ink-mute">{sub}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-4">
            {MORE.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => buzz()} className="rounded-xl border border-line bg-surface px-4 py-3 text-center text-[14px] font-semibold text-ink active:bg-canvas-deep">
                {label}
              </Link>
            ))}
          </div>
          <Link to="/login" onClick={() => buzz()} className="mt-2 flex min-h-[48px] items-center justify-center rounded-xl border border-line bg-surface text-[15px] font-semibold text-ink active:bg-canvas-deep">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}

export function MobileNav() {
  const { pathname } = useLocation()
  const [sheet, setSheet] = useState(false)
  useEffect(() => { setSheet(false) }, [pathname])

  const isHome = pathname === '/'
  const isPricing = pathname === '/pricing'
  const tab = 'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10.5px] font-semibold transition-colors'

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="mx-3 mb-3 flex items-center gap-1 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-[0_-6px_28px_-10px_rgba(15,17,22,0.28)] backdrop-blur">
          <Link to="/" onClick={() => buzz()} className={`${tab} ${isHome ? 'text-indigo' : 'text-ink-mute'}`}>
            <Home className="h-5 w-5" strokeWidth={2} /> Home
          </Link>
          <button onClick={() => { buzz(); setSheet(true) }} className={`${tab} ${sheet ? 'text-indigo' : 'text-ink-mute'}`}>
            <LayoutGrid className="h-5 w-5" strokeWidth={2} /> Explore
          </button>
          <Link to="/pricing" onClick={() => buzz()} className={`${tab} ${isPricing ? 'text-indigo' : 'text-ink-mute'}`}>
            <Tag className="h-5 w-5" strokeWidth={2} /> Pricing
          </Link>
          <Link
            to="/signup"
            onClick={() => buzz(10)}
            className="ml-1 flex min-h-[46px] flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-3 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)]"
          >
            Start free <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>
      </nav>
      {sheet && <BottomSheet onClose={() => setSheet(false)} />}
    </>
  )
}
