import { useParams } from 'react-router-dom'
import { PageShell } from './page-shell'
import { CTA } from './ui/primitives'
import { FeatureHero, type HeroBackdrop } from './features/blocks'
import { FEATURES } from './features/catalog'

/* Per-slug hero backdrop so the scaffold pages don't all wear the same shape. */
const BACKDROP: Record<string, HeroBackdrop | HeroBackdrop[]> = {
  risk: 'wave',
  ai: 'scene',
  'trader-mind': 'trader',
  'universal-import': 'none',
}

/* Generic feature page — renders the hero from the catalogue. These pages are
   the scaffold; each will be expanded with detailed sections like Dashboard. */
export function FeaturePage() {
  const { slug = '' } = useParams()
  const cfg = FEATURES[slug]

  if (!cfg) {
    return (
      <PageShell>
        <section className="mx-auto max-w-[720px] px-6 pt-40 pb-32 text-center md:px-10">
          <h1 className="font-display text-3xl font-bold text-ink">Feature not found</h1>
          <p className="mt-4 text-ink-mute">This page doesn’t exist yet.</p>
          <div className="mt-8">
            <CTA href="/">Back home</CTA>
          </div>
        </section>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <FeatureHero
        eyebrow={cfg.eyebrow}
        Icon={cfg.Icon}
        accent={cfg.accent}
        title={cfg.title}
        titleAccent={cfg.titleAccent}
        sub={cfg.sub}
        shot={cfg.shot}
        backdrop={BACKDROP[slug] ?? 'blob'}
      />

      {/* Closing CTA — body sections land here as each feature is built out. */}
      <section className="mx-auto max-w-[900px] px-6 pt-10 pb-24 text-center md:px-10">
        <h2 data-animate="title" className="font-display text-[clamp(1.6rem,3vw,2.3rem)] font-bold text-ink">
          See it on your own trades.
        </h2>
        <div data-reveal className="mx-auto mt-8 flex max-w-[380px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center [&>a]:w-full [&>a]:justify-center sm:[&>a]:w-auto">
          <CTA href="/signup">Start free</CTA>
          <CTA href="/pricing" variant="secondary">Compare plans</CTA>
        </div>
      </section>
    </PageShell>
  )
}
