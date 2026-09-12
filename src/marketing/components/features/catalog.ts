import { Gauge, BookText, BarChart3, ShieldCheck, Brain, Sparkles, FileUp, Sunrise, Moon } from 'lucide-react'
import type { Accent } from '../ui/primitives'

/* ============================================================================
   Feature catalogue — the pages behind the nav "Overview" mega-menu.
   Each is its own page at /features/<slug>. The Dashboard page is built out
   in full (page-feature-dashboard.tsx); the rest render from this config via
   the generic template (page-feature.tsx) with a hero, ready to expand.
   ========================================================================== */

export type FeatureConfig = {
  slug: string
  eyebrow: string
  Icon: typeof Gauge
  accent: Accent
  title: string
  titleAccent: string
  sub: string
  shot: string
}

export const FEATURES: Record<string, FeatureConfig> = {
  dashboard: {
    slug: 'dashboard',
    eyebrow: 'Dashboard',
    Icon: Gauge,
    accent: 'indigo',
    title: 'Your whole account,',
    titleAccent: 'one honest screen.',
    sub: 'Every number on the Orca dashboard answers one question — where is your edge, and where is it quietly leaking.',
    shot: '/dashboard.png',
  },
  journal: {
    slug: 'journal',
    eyebrow: 'Trade Journal',
    Icon: BookText,
    accent: 'violet',
    title: 'Your journal',
    titleAccent: 'writes itself.',
    sub: 'Orca syncs, tags and scores every trade the moment it closes — no spreadsheets, no missed entries, no end-of-day catch-up.',
    shot: '/carousel/calendar.png',
  },
  analytics: {
    slug: 'analytics',
    eyebrow: 'Analytics',
    Icon: BarChart3,
    accent: 'teal',
    title: 'Numbers that change',
    titleAccent: 'how you trade.',
    sub: 'Dashboards, metrics and reports that turn a wall of trades into the two or three decisions that actually move your P&L.',
    shot: '/carousel/analytics.png',
  },
  risk: {
    slug: 'risk',
    eyebrow: 'Risk Engine',
    Icon: ShieldCheck,
    accent: 'amber',
    title: 'Four layers between you',
    titleAccent: 'and a blow-up.',
    sub: 'Position, daily, weekly and account guardrails watch every trade — so one bad day never turns into a bad month.',
    shot: '/encryption.png',
  },
  'trader-mind': {
    slug: 'trader-mind',
    eyebrow: 'Trader Mind',
    Icon: Brain,
    accent: 'rose',
    title: 'The behavioral mirror',
    titleAccent: 'you can’t argue with.',
    sub: 'Orca learns your patterns and shows you, objectively, when discipline slips and emotion takes the wheel.',
    shot: '/carousel/insights.png',
  },
  ai: {
    slug: 'ai',
    eyebrow: 'AI Insights',
    Icon: Sparkles,
    accent: 'violet',
    title: 'Patterns you’d',
    titleAccent: 'never catch alone.',
    sub: 'The signal buried in hundreds of trades — surfaced in plain language, so you know exactly what to fix next.',
    shot: '/carousel/insights.png',
  },
  morning: {
    slug: 'morning',
    eyebrow: 'Market Morning Analysis',
    Icon: Sunrise,
    accent: 'amber',
    title: 'Win the day',
    titleAccent: 'before it starts.',
    sub: 'A guided pre-market routine — read yesterday, read today, read yourself — so you sit down already knowing your plan, your levels and your limits.',
    shot: '/morning-analysis.png',
  },
  eod: {
    slug: 'eod',
    eyebrow: 'End of Day Review',
    Icon: Moon,
    accent: 'amber',
    title: 'Close the day,',
    titleAccent: 'keep the lesson.',
    sub: 'The complement to your morning routine — review what actually happened, score the session honestly, and turn today’s trades into tomorrow’s edge.',
    shot: '/eod-review.png',
  },
  'universal-import': {
    slug: 'universal-import',
    eyebrow: 'Universal Import',
    Icon: FileUp,
    accent: 'teal',
    title: 'Any broker. Any file.',
    titleAccent: 'Imported.',
    sub: 'No API? Drop a CSV, XLSX or PDF statement and Orca reads it all — cleaned, tagged and ready in seconds.',
    shot: '/search.png',
  },
}

export const FEATURE_LIST = Object.values(FEATURES)
