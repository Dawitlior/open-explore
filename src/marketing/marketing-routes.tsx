import { lazy } from 'react'
import { useParams } from 'react-router-dom'
import type { ReactElement } from 'react'
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
  { path: '/', element: <HomePage /> },
  { path: '/pricing', element: <PricingPage /> },
  { path: '/exchanges', element: <ExchangesPage /> },
  { path: '/features/dashboard', element: <DashboardFeaturePage /> },
  { path: '/features/morning', element: <MorningAnalysisPage /> },
  { path: '/features/eod', element: <EodReviewPage /> },
  { path: '/features/analytics', element: <AnalyticsFeaturePage /> },
  { path: '/features/journal', element: <JournalFeaturePage /> },
  { path: '/features/economic-calendar', element: <EconomicCalendarPage /> },
  { path: '/features/risk', element: <RiskEngineFeaturePage /> },
  { path: '/features/trader-mind', element: <TraderMindFeaturePage /> },
  { path: '/features/universal-import', element: <UniversalImportFeaturePage /> },
  { path: '/features/ai', element: <AiInsightsFeaturePage /> },
  { path: '/features/:slug', element: <KeyedFeaturePage /> },
  { path: '/security', element: <SecurityPage /> },
  { path: '/resources', element: <ResourcesPage /> },
  { path: '/resources/:slug', element: <ArticlePage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/accessibility', element: <AccessibilityPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/our-goals', element: <OurGoalsPage /> },
]
