import { useParams } from 'react-router-dom'
import type { ReactElement } from 'react'
import { HomePage } from './components/page-home'
import { PricingPage } from './components/page-pricing'
import { ExchangesPage } from './components/page-exchanges'
import { FeaturePage } from './components/page-feature'
import { DashboardFeaturePage } from './components/page-feature-dashboard'
import { MorningAnalysisPage } from './components/page-feature-morning'
import { EodReviewPage } from './components/page-feature-eod'
import { AnalyticsFeaturePage } from './components/page-feature-analytics'
import { JournalFeaturePage } from './components/page-feature-journal'
import { SecurityPage } from './components/page-security'
import { ResourcesPage } from './components/page-resources'
import { EconomicCalendarPage } from './components/page-feature-economic-calendar'
import { TermsPage } from './components/page-terms'
import { PrivacyPage } from './components/page-privacy'
import { AccessibilityPage } from './components/page-accessibility'
import { ContactPage } from './components/page-contact'
import { ArticlePage } from './components/page-article'
import { OurGoalsPage } from './components/page-our-goals'
import { RiskEngineFeaturePage } from './components/page-feature-risk'
import { TraderMindFeaturePage } from './components/page-feature-trader-mind'
import { UniversalImportFeaturePage } from './components/page-feature-universal-import'
import { AiInsightsFeaturePage } from './components/page-feature-ai'

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
