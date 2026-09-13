import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { detectTier } from '../lib/device-tier'
import type { Tier } from '../lib/device-tier'
import { useScrollEngine } from '../lib/use-scroll-engine'
import { usePremiumMotion } from '../lib/use-premium-motion'
import { engine } from '../lib/scroll-store'
import { NavBar } from './nav-bar'
import { SiteFooter } from './site-footer'
import { BackToTop } from './back-to-top'
import { MobileNav } from './mobile-nav'
import '../marketing.css'

/* ============================================================================
   PAGE SHELL — the shared chrome for every route: cool background, nav, footer,
   back-to-top, and the scroll/motion engines. Each page mounts its own shell so
   Lenis + reveal animations re-initialise on navigation.
   ========================================================================== */

export function PageShell({ children, darkNav = false }: { children: ReactNode; darkNav?: boolean }) {
  const [tier, setTier] = useState<Tier | null>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    setTier(detectTier())
  }, [])

  // Always land at the top on navigation (footer/nav links). Lenis owns the
  // scroll, so a plain window.scrollTo is ignored — reset the Lenis instance
  // too, on the next frame so it runs after the new page's engine is created.
  useEffect(() => {
    const toTop = () => {
      try { engine.lenis?.scrollTo(0, { immediate: true }) } catch { /* noop */ }
      window.scrollTo(0, 0)
    }
    toTop()
    const raf = requestAnimationFrame(toTop)
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  useScrollEngine(tier ?? 'none')
  usePremiumMotion(tier ?? 'none', tier !== null)

  return (
    <div className="orca-marketing">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1100px 620px at 50% -8%, rgba(124,58,237,0.06), transparent 62%),' +
            '#f6f6f8',
        }}
      />
      <NavBar darkNav={darkNav} />
      <main className="pb-24 lg:pb-0">{children}</main>
      <SiteFooter />
      <BackToTop />
      <MobileNav />
    </div>
  )
}
