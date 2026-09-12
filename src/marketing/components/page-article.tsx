import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { LineChart, Sparkles, ShieldCheck, Brain, ArrowLeft, ArrowRight, Clock, PenLine, Info } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { getArticle, ARTICLES, type ArtCat } from '../content/articles'

/* ============================================================================
   ARTICLE (/resources/:slug) — a real editorial reading page, inside Orca.
   Markdown body with KaTeX math; articles without a body yet show an
   "in the works" state. Never links off-site.
   ========================================================================== */

const CAT_TINT: Record<ArtCat, string> = {
  'Data & Analytics': '#1a1d24',
  Quant: '#7c3aed',
  Risk: '#e0a53a',
  Psychology: '#e5484d',
}
const CAT_ICON: Record<ArtCat, typeof Brain> = {
  'Data & Analytics': LineChart,
  Quant: Sparkles,
  Risk: ShieldCheck,
  Psychology: Brain,
}

function NotFound() {
  return (
    <PageShell>
      <section className="mx-auto max-w-[640px] px-6 pt-40 pb-32 text-center md:px-10">
        <h1 className="font-display text-3xl font-bold text-ink">Article not found</h1>
        <p className="mt-4 text-ink-mute">This piece doesn’t exist — or hasn’t been published yet.</p>
        <div className="mt-8"><CTA href="/resources">Back to Trading Insights</CTA></div>
      </section>
    </PageShell>
  )
}

function Disclaimer() {
  return (
    <div className="mb-9 flex gap-2.5 rounded-xl border border-line bg-canvas-deep px-4 py-3 text-[12.5px] leading-relaxed text-ink-mute">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2} />
      <p>
        <strong className="font-semibold text-ink-2">For education only.</strong> This article is
        informational and is not financial, investment or trading advice. Trading carries a substantial risk
        of loss; all formulas and examples are hypothetical and do not guarantee future results. Orca is a
        journaling and analytics tool, not a signals or advisory service. Always do your own research and
        trade at your own discretion.
      </p>
    </div>
  )
}

export function ArticlePage() {
  const { slug } = useParams()
  const article = getArticle(slug)
  if (!article) return <NotFound />

  const Icon = CAT_ICON[article.cat]
  const tint = CAT_TINT[article.cat]
  // Promote single-line `$$ … $$` display formulas to proper block form so
  // remark-math renders them as centered display equations, not inline.
  const md = article.body?.replace(/^\$\$\s*(.+?)\s*\$\$\s*$/gm, (_m, f) => `\n\n$$\n${f}\n$$\n\n`)
  // three "keep reading" suggestions from the same or adjacent categories
  const more = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3)

  return (
    <PageShell>
      <article className="px-6 pt-32 pb-8 md:px-10">
        {/* header */}
        <header className="mx-auto max-w-[760px]">
          <Link to="/resources" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} /> All insights
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: tint }}>
              <Icon className="h-3 w-3" strokeWidth={2.5} /> {article.cat}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} /> {article.read}
            </span>
          </div>
          <h1 className="mt-5 font-display text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.06] font-bold tracking-[-0.02em] text-ink">
            {article.title}
          </h1>
          <p className="mt-5 text-[17.5px] leading-[1.5] font-medium text-ink-mute">{article.excerpt}</p>
        </header>

        {/* cover image */}
        <figure className="mx-auto mt-9 max-w-[1000px]">
          <div className="relative aspect-[21/9] overflow-hidden rounded-[24px] border border-line elev-2">
            <img src={article.img} alt={article.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 12% 8%, ${tint}33, transparent 55%)` }} />
          </div>
        </figure>

        {/* body */}
        <div className="mx-auto mt-8 max-w-[720px]">
          <Disclaimer />
          {md ? (
            <div className="article-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {md}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[24px] border border-line bg-surface p-10 text-center elev-1">
              <HoloGlow className="!inset-x-[20%] !inset-y-[10%]" opacity={0.24} blur={70} />
              <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tint + '1a', color: tint }}>
                <PenLine className="h-5 w-5" strokeWidth={2} />
              </span>
              <h2 className="relative mt-5 font-display text-[22px] font-bold text-ink">This one’s in the works.</h2>
              <p className="relative mx-auto mt-3 max-w-[440px] text-[15px] leading-relaxed text-ink-mute">
                We’re writing this piece now. Want it the moment it lands? Get the Sunday email — one sharp idea a week.
              </p>
              <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap [&>a]:w-full [&>a]:max-w-[340px] [&>a]:justify-center sm:[&>a]:w-auto">
                <CTA href="/resources">Browse published insights</CTA>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* keep reading */}
      <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-24 md:px-10">
        <div className="border-t border-line pt-12">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-ink">Keep reading</h2>
            <Link to="/resources" className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-indigo">
              All insights
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {more.map((a) => {
              const AIcon = CAT_ICON[a.cat]
              const aTint = CAT_TINT[a.cat]
              return (
                <Link key={a.slug} to={`/resources/${a.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-3">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={a.img} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white" style={{ backgroundColor: aTint }}>
                      <AIcon className="h-3 w-3" strokeWidth={2.5} /> {a.cat}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-[16px] leading-snug font-bold text-ink">{a.title}</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-mute">{a.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-ink-faint"><Clock className="h-3.5 w-3.5" strokeWidth={2} /> {a.read}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </PageShell>
  )
}
