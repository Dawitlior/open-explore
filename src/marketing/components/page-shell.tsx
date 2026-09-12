import { useEffect, useState, type ReactNode } from 'react'
import { detectTier } from '../lib/device-tier'
import type { Tier } from '../lib/device-tier'
import { useScrollEngine } from '../lib/use-scroll-engine'
import { usePremiumMotion } from '../lib/use-premium-motion'
import { NavBar } from './nav-bar'
import { SiteFooter } from './site-footer'
import { BackToTop } from './back-to-top'
import { MobileCtaBar } from './mobile-cta-bar'

/* ============================================================================
   PAGE SHELL — the shared chrome for every route: cool background, nav, footer,
   back-to-top, and the scroll/motion engines. Each page mounts its own shell so
   Lenis + reveal animations re-initialise on navigation.
   ========================================================================== */

export function PageShell({ children, darkNav = false }: { children: ReactNode; darkNav?: boolean }) {
  const [tier, setTier] = useState<Tier | null>(null)
  useEffect(() => {
    setTier(detectTier())
    window.scrollTo(0, 0)
  }, [])

  useScrollEngine(tier ?? 'none')
  usePremiumMotion(tier ?? 'none', tier !== null)

  return (
    <>
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
      <main>{children}</main>
      <SiteFooter />
      <BackToTop />
      <MobileCtaBar />
    </>
  )
}
