import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import type { ReactElement } from 'react'

/* Light, brand-neutral fallback for lazy marketing pages — deliberately NOT the
   platform's OrcaBootLoader (that loader is exclusive to the signed-in product).
   A plain cool-canvas screen with a soft violet spinner; flashes only briefly. */
function MarketingFallback() {
  return (
    <div className="orca-marketing flex min-h-screen items-center justify-center bg-canvas">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-line"
        style={{ borderTopColor: '#7c3aed' }}
        aria-label="Loading"
      />
    </div>
  )
}
const s = (node: ReactElement) => <Suspense fallback={<MarketingFallback />}>{node}</Suspense>
// Home is eager so the landing paints immediately; every other marketing page is
// code-split so it never weighs down the first load. They render inside App's
// existing <Suspense> boot-loader fallback.
import { HomePage } from './components/page-home'

const PricingPage = lazy(() => import('./components/page-pricing').then((m) => ({ default: m.PricingPage })))
const ExchangesPage = lazy(() => import('./components/page-exchanges').then((m) => ({ default: m.ExchangesPage })))
const DashboardFeaturePage = lazy(() => import('./components/page-feature-dashboard').then((m) => ({ default: m.DashboardFeaturePage })))
const MorningAnalysisPage = lazy(() => import('./components/page-feature-morning').then((m) => ({ default: m.MorningAnalysisPage })))
const EodReviewPage = lazy(() => import('./components/page-feature-eod').then((m) => ({ default: m.EodReviewPage })))
const AnalyticsFeaturePage = lazy(() => import('./components/page-feature-analytics').then((m) => ({ default: m.AnalyticsFeaturePage })))
const JournalFeaturePage = lazy(() => import('./components/page-feature-journal').then((m) => ({ default: m.JournalFeaturePage })))
const EconomicCalendarPage = lazy(() => import('./components/page-feature-economic-calendar').then((m) => ({ default: m.EconomicCalendarPage })))
const RiskEngineFeaturePage = lazy(() => import('./components/page-feature-risk').then((m) => ({ default: m.RiskEngineFeaturePage })))
const TraderMindFeaturePage = lazy(() => import('./components/page-feature-trader-mind').then((m) => ({ default: m.TraderMindFeaturePage })))
const UniversalImportFeaturePage = lazy(() => import('./components/page-feature-universal-import').then((m) => ({ default: m.UniversalImportFeaturePage })))
const AiInsightsFeaturePage = lazy(() => import('./components/page-feature-ai').then((m) => ({ default: m.AiInsightsFeaturePage })))
const SecurityPage = lazy(() => import('./components/page-security').then((m) => ({ default: m.SecurityPage })))
const ResourcesPage = lazy(() => import('./components/page-resources').then((m) => ({ default: m.ResourcesPage })))
const ArticlePage = lazy(() => import('./components/page-article').then((m) => ({ default: m.ArticlePage })))
const TermsPage = lazy(() => import('./components/page-terms').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('./components/page-privacy').then((m) => ({ default: m.PrivacyPage })))
const AccessibilityPage = lazy(() => import('./components/page-accessibility').then((m) => ({ default: m.AccessibilityPage })))
const ContactPage = lazy(() => import('./components/page-contact').then((m) => ({ default: m.ContactPage })))
const OurGoalsPage = lazy(() => import('./components/page-our-goals').then((m) => ({ default: m.OurGoalsPage })))
const FeaturePage = lazy(() => import('./components/page-feature').then((m) => ({ default: m.FeaturePage })))

/** Remount the shared feature page per slug so scroll + title motion re-init. */
function KeyedFeaturePage() {
  const { slug } = useParams()
  return <FeaturePage key={slug} />
}

/* All PUBLIC marketing routes, as a flat list App.tsx maps into <Routes>.
   Auth (/auth, /login, /signup) is handled by the first-run AuthPage, not here. */
export const MARKETING_ROUTES: { path: string; element: ReactElement }[] = [
  { path: '/', element: s(<HomePage />) },
  { path: '/pricing', element: s(<PricingPage />) },
  { path: '/exchanges', element: s(<ExchangesPage />) },
  { path: '/features/dashboard', element: s(<DashboardFeaturePage />) },
  { path: '/features/morning', element: s(<MorningAnalysisPage />) },
  { path: '/features/eod', element: s(<EodReviewPage />) },
  { path: '/features/analytics', element: s(<AnalyticsFeaturePage />) },
  { path: '/features/journal', element: s(<JournalFeaturePage />) },
  { path: '/features/economic-calendar', element: s(<EconomicCalendarPage />) },
  { path: '/features/risk', element: s(<RiskEngineFeaturePage />) },
  { path: '/features/trader-mind', element: s(<TraderMindFeaturePage />) },
  { path: '/features/universal-import', element: s(<UniversalImportFeaturePage />) },
  { path: '/features/ai', element: s(<AiInsightsFeaturePage />) },
  { path: '/features/:slug', element: s(<KeyedFeaturePage />) },
  { path: '/security', element: s(<SecurityPage />) },
  { path: '/resources', element: s(<ResourcesPage />) },
  { path: '/resources/:slug', element: s(<ArticlePage />) },
  { path: '/terms', element: s(<TermsPage />) },
  { path: '/privacy', element: s(<PrivacyPage />) },
  { path: '/accessibility', element: s(<AccessibilityPage />) },
  { path: '/contact', element: s(<ContactPage />) },
  { path: '/our-goals', element: s(<OurGoalsPage />) },
]
