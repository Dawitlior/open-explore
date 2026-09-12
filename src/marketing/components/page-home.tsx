import { PageShell } from './page-shell'
import { SectionHero } from './section-hero'
import { SectionMetrics } from './section-metrics'
import { SectionTeaser } from './section-teaser'
import { SectionShowcase } from './section-showcase'
import { SectionInside } from './section-inside'
import { SectionSecurity } from './section-security'
import { SectionIntegrations } from './section-integrations'
import { SectionEngine } from './section-engine'
import { SectionGoals } from './section-goals'
import { SectionNoCard } from './section-no-card'
import { SectionApps } from './section-apps'
import { SectionFaq } from './section-faq'
import { SectionCta } from './section-cta'

export function HomePage() {
  return (
    <PageShell>
      <SectionHero />
      <SectionMetrics />
      <SectionTeaser />
      <SectionShowcase />
      <SectionInside />
      <SectionNoCard />
      <SectionSecurity />
      <SectionIntegrations />
      <SectionEngine />
      <SectionGoals />
      <SectionApps />
      <SectionFaq />
      <SectionCta />
    </PageShell>
  )
}
