import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Brain, LineChart, ShieldCheck, Clock, ArrowRight, ArrowLeft, ArrowUpRight, Mail, Sparkles } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { ARTICLES, type ArtCat } from '../content/articles'

/* ============================================================================
   RESOURCES · TRADING INSIGHTS (/resources) — an editorial knowledge hub.
   The library is presented as a one-at-a-time carousel: a single article in
   focus, arrows to move on, looping endlessly so the shelf never feels to end.
   Two distinct CTA sections close it (newsletter, then "apply it in Orca").
   ========================================================================== */

const CAT_TINT: Record<ArtCat, string> = {
  Psychology: '#e5484d',
  'Data & Analytics': '#1a1d24',
  Quant: '#7c3aed',
  Risk: '#e0a53a',
}
const CAT_ICON: Record<ArtCat, typeof Brain> = {
  Psychology: Brain,
  'Data & Analytics': LineChart,
  Quant: Sparkles,
  Risk: ShieldCheck,
}
const FILTERS: (ArtCat | 'All')[] = ['All', 'Data & Analytics', 'Quant', 'Risk', 'Psychology']

function ResourcesHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-6 text-center md:px-10">
      <HoloGlow className="!inset-x-[28%] !top-[8%] !bottom-auto !h-[260px]" opacity={0.3} blur={80} />
      <div className="relative mx-auto max-w-[760px]">
        <span data-reveal className="micro inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-indigo">
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} /> Trading Insights
        </span>
        <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] leading-[1.04] font-bold text-ink">
          Sharpen the mind <span className="text-indigo">behind the trades.</span>
        </h1>
        <p data-reveal className="mx-auto mt-5 max-w-[560px] text-[16.5px] leading-[1.6] text-ink-mute">
          Long-form essays on trading psychology, data and quantitative edge — one deep read at a time,
          written for traders who treat this like a craft, not a casino.
        </p>
      </div>
    </section>
  )
}

/* One-at-a-time, endlessly-looping article carousel. */
function ArticleCarousel() {
  const [cat, setCat] = useState<'All' | ArtCat>('All')
  const list = cat === 'All' ? ARTICLES : ARTICLES.filter((a) => a.cat === cat)
  const [i, setI] = useState(0)
  const n = list.length
  const idx = ((i % n) + n) % n
  const a = list[idx]
  const Icon = CAT_ICON[a.cat]
  const tint = CAT_TINT[a.cat]

  const pick = (c: 'All' | ArtCat) => {
    setCat(c)
    setI(0)
  }
  const arrow =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink elev-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo/45 hover:text-indigo'

  return (
    <section className="px-6 pb-16 pt-4 md:px-10 md:pb-24">
      <div className="mx-auto max-w-[1240px]">
        {/* category filter */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-2">
          {FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => pick(c)}
              className={
                'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ' +
                (cat === c ? 'bg-ink text-white shadow-sm' : 'border border-line bg-surface text-ink-mute hover:text-ink')
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* stage */}
        <div className="relative">
          {/* desktop side arrows */}
          <button aria-label="Previous article" onClick={() => setI(i - 1)} className={arrow + ' absolute top-1/2 left-0 z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:flex xl:-translate-x-8'}>
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button aria-label="Next article" onClick={() => setI(i + 1)} className={arrow + ' absolute top-1/2 right-0 z-20 hidden translate-x-1/2 -translate-y-1/2 lg:flex xl:translate-x-8'}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>

          {/* the single article in focus — big, image-led */}
          <Link
            key={a.slug}
            to={`/resources/${a.slug}`}
            className="swap-in group grid overflow-hidden rounded-[32px] border border-line bg-surface elev-2 transition-all duration-300 hover:-translate-y-1 hover:elev-3 md:min-h-[560px] md:grid-cols-2 lg:min-h-[600px]"
          >
            {/* image half */}
            <div className="relative min-h-[280px] overflow-hidden md:min-h-full">
              <img
                src={a.img}
                alt={a.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(180deg, rgba(15,17,22,0.05) 0%, rgba(15,17,22,0.35) 100%), radial-gradient(120% 90% at 15% 10%, ${tint}40, transparent 55%)` }}
              />
              <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white shadow-sm backdrop-blur-sm" style={{ backgroundColor: tint }}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.5} /> {a.cat}
              </span>
            </div>

            {/* content half */}
            <div className="flex flex-col justify-center gap-5 p-8 md:p-12 lg:p-14">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-faint">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} /> {a.read}
              </span>
              <h2 className="font-display text-[clamp(1.9rem,3.3vw,2.9rem)] leading-[1.06] font-bold text-ink">
                {a.title}
              </h2>
              <p className="max-w-[520px] text-[16px] leading-[1.7] text-ink-mute">{a.excerpt}</p>
              <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
                Read the article
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </span>
            </div>
          </Link>

          {/* controls — arrows loop forever, no total shown (the shelf never ends) */}
          <div className="mt-10 flex items-center justify-center gap-5">
            <button aria-label="Previous article" onClick={() => setI(i - 1)} className={arrow + ' lg:hidden'}>
              <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <span className="micro text-ink-faint">More insights ahead</span>
            <button aria-label="Next article" onClick={() => setI(i + 1)} className={arrow + ' lg:hidden'}>
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>

          {/* desktop "next" nudge under the card */}
          <div className="mt-9 hidden items-center justify-center lg:flex">
            <button onClick={() => setI(i + 1)} className="group inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink-mute transition-colors hover:text-indigo">
              Next insight
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #1 — newsletter capture. Angle: a weekly intellectual habit. ─────── */
function NewsletterCTA() {
  return (
    <section className="px-6 py-16 md:px-10 md:py-24">
      <div
        className="mx-auto flex max-w-[900px] flex-col items-center gap-6 rounded-[28px] px-6 py-12 text-center md:px-12"
        style={{ background: 'radial-gradient(600px 300px at 50% -10%, rgba(124,58,237,0.18), transparent 60%), #f4effe' }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo text-white"><Mail className="h-5 w-5" strokeWidth={2} /></span>
        <h2 className="font-display text-[clamp(1.6rem,2.8vw,2.2rem)] font-bold text-ink">
          One sharp idea, every Sunday.
        </h2>
        <p className="max-w-[460px] text-[14.5px] leading-relaxed text-ink-mute">
          A single, well-argued piece on psychology, data or risk — the kind you actually finish. No spam,
          no fluff, unsubscribe in a click.
        </p>
        <form className="flex w-full max-w-[440px] flex-col gap-2.5 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            required
            placeholder="you@email.com"
            className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-indigo/50 focus:ring-4 focus:ring-indigo/10"
          />
          <button type="submit" className="rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5">
            Subscribe
          </button>
        </form>
        <span className="text-[12px] text-ink-faint">Join traders who read to get better, not to get tips.</span>
      </div>
    </section>
  )
}

/* ── CTA #2 — closing. Angle: reading → measuring; move from theory to action. */
function TheoryToActionCTA() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-8 overflow-hidden rounded-[28px] border border-line bg-surface p-8 elev-2 md:flex-row md:justify-between md:p-12">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-display text-[40px] font-extrabold leading-none">
            <span className="text-ink-faint">1</span>
            <ArrowRight className="h-6 w-6 text-indigo" strokeWidth={2.5} />
            <span className="text-indigo">2</span>
          </div>
          <div>
            <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.15] font-bold text-ink">
              Reading is step one. <br className="hidden sm:block" />Measuring yours is step two.
            </h2>
            <p className="mt-2 max-w-[460px] text-[14px] leading-relaxed text-ink-mute">
              Every idea here gets sharper when it’s pointed at your own trades. See where your real edge
              hides — in your data, not an article.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <a
            href="/features/analytics"
            className="group inline-flex items-center gap-2 rounded-full border-2 border-indigo px-6 py-3 text-[14px] font-semibold text-indigo transition-colors hover:bg-indigo hover:text-white"
          >
            Measure your edge
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.25} />
          </a>
        </div>
      </div>
    </section>
  )
}

export function ResourcesPage() {
  return (
    <PageShell>
      <ResourcesHero />
      <ArticleCarousel />
      <NewsletterCTA />
      <TheoryToActionCTA />
    </PageShell>
  )
}
