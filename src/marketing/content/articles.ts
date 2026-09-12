/* ============================================================================
   Trading Insights — the article registry. Each entry's Markdown body is
   auto-wired from src/content/articles/<slug>.md (drop a file named after the
   slug and it links itself). Entries without a matching file render an
   "in the works" state. Every article opens inside Orca at /resources/:slug.
   ========================================================================== */

// Auto-import every article body by filename.
const MD = import.meta.glob('./articles/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export type ArtCat = 'Data & Analytics' | 'Quant' | 'Risk' | 'Psychology'

export type Article = {
  slug: string
  cat: ArtCat
  title: string
  excerpt: string
  read: string
  img: string
  body?: string
  featured?: boolean
}

// Hotlink-friendly Pexels CDN photo, cropped to a consistent editorial ratio.
const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400&h=1050&fit=crop`

const META: Article[] = [
  // ── Data & Analytics ──────────────────────────────────────────────────────
  { slug: 'profit-factor-lying', cat: 'Data & Analytics', title: 'Profit Factor is Lying to You (A Little)', excerpt: 'What the single number hides, and the two cuts of your data that tell the real story.', read: '12 min read', img: px(35118208), featured: true },
  { slug: 'high-win-rate-trap', cat: 'Data & Analytics', title: 'The High Win-Rate Trap', excerpt: 'Why an 80% success rate is often the biggest warning sign of a failing strategy.', read: '8 min read', img: px(5834240) },
  { slug: 'outlier-analysis', cat: 'Data & Analytics', title: 'Outlier Analysis: Your Three Best and Worst Trades', excerpt: 'How deleting your three best and worst trades reveals the true face of your system.', read: '8 min read', img: px(6120177) },
  { slug: 'noise-vs-signal-hold', cat: 'Data & Analytics', title: 'Noise vs Signal in Hold Time', excerpt: 'How to measure a trade’s “decay point” — the moment time turns from enemy to friend.', read: '9 min read', img: px(16594725) },
  { slug: 'hidden-speed-metric', cat: 'Data & Analytics', title: 'The Hidden Speed Metric', excerpt: 'Time-to-target vs time-to-stop — and what it quietly says about your entry quality.', read: '8 min read', img: px(534216) },

  // ── Quant ─────────────────────────────────────────────────────────────────
  { slug: 'expectancy-in-r', cat: 'Quant', title: 'Expectancy in R: The Only Metric That Scales', excerpt: 'Why thinking in risk units beats thinking in dollars — and how to compute yours honestly.', read: '10 min read', img: px(7567223) },
  { slug: 'hidden-correlation', cat: 'Quant', title: 'Hidden Correlation in Your Portfolio', excerpt: 'Why holding five different assets feels like diversification but mathematically bets on one thing.', read: '8 min read', img: px(97080) },
  { slug: 'backtest-inflation', cat: 'Quant', title: 'Backtest Inflation', excerpt: 'How overfitting builds perfect past curves and empty future accounts — and how to test for it.', read: '9 min read', img: px(38933571) },
  { slug: 'liquidity-crisis-slippage', cat: 'Quant', title: 'The Liquidity-Crisis Nightmare', excerpt: 'How to model the real slippage of high-stress hours instead of the idealized fill.', read: '8 min read', img: px(38906370) },
  { slug: 'game-theory-quant', cat: 'Quant', title: 'Game Theory in Quant Trading', excerpt: 'Spotting when the big algorithms hunt your orders — and modeling to exploit the hunt.', read: '9 min read', img: px(11798249) },

  // ── Risk ──────────────────────────────────────────────────────────────────
  { slug: 'asymmetric-risk', cat: 'Risk', title: 'Asymmetric Risk Management', excerpt: 'The science of adding to a position as the market moves against you — genius or financial suicide.', read: '9 min read', img: px(39353380) },
  { slug: 'max-vs-average-drawdown', cat: 'Risk', title: 'Max Drawdown vs Average Drawdown', excerpt: 'Why your historical max drawdown is always a lie — and how to prepare for the day it breaks.', read: '8 min read', img: px(38877604) },
  { slug: 'recovery-math', cat: 'Risk', title: 'The Mathematics of Recovery', excerpt: 'Why a 50% loss demands a 100% gain just to break even — and how that reshapes position sizing.', read: '7 min read', img: px(6770610) },
  { slug: 'fractional-kelly', cat: 'Risk', title: 'The Adjusted Kelly Criterion', excerpt: 'How to compute the mathematically optimal position size without driving the account to ruin.', read: '9 min read', img: px(38808473) },

  // ── Psychology ────────────────────────────────────────────────────────────
  { slug: 'decision-fatigue', cat: 'Psychology', title: 'Decision Fatigue', excerpt: 'The data on why your fifth trade of the day is almost always a mistake — regardless of the market.', read: '7 min read', img: px(4349903) },
  { slug: 'inverse-fomo', cat: 'Psychology', title: 'The Inverse-FOMO Paradox', excerpt: 'The fear of exiting a winner too early — and why the brain prefers one bird in hand over ten in the tree.', read: '8 min read', img: px(8378726) },
  { slug: 'revenge-trading', cat: 'Psychology', title: 'Big-Loss Trauma & Revenge Trading', excerpt: 'The physiology of revenge trading — and the pre-trade check that saves you from yourself.', read: '8 min read', img: px(15528342) },
  { slug: 'discipline-erosion', cat: 'Psychology', title: 'The Hidden Erosion of Discipline', excerpt: 'Why the rules are easy in week one, and how small deviations quietly become fatal habits.', read: '8 min read', img: px(6192326) },
]

export const ARTICLES: Article[] = META.map((a) => ({ ...a, body: MD[`./articles/${a.slug}.md`] }))

export const getArticle = (slug: string | undefined) => ARTICLES.find((a) => a.slug === slug)
export const FEATURED_ARTICLE = ARTICLES.find((a) => a.featured) ?? ARTICLES[0]
