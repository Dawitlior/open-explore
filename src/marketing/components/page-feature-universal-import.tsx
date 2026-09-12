import { useState, type ReactNode } from 'react'
import {
  FileUp,
  UploadCloud,
  Sparkles,
  Play,
  Check,
  ChevronDown,
  ArrowRight,
  Rows3,
  Ban,
  HelpCircle,
  MessagesSquare,
  RefreshCw,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react'
import { PageShell } from './page-shell'

/* ============================================================================
   UNIVERSAL IMPORT (/features/universal-import) — the "Appure" design the founder
   chose, in a MONOCHROME palette (black / charcoal / grey — no violet), with
   Appure's line-art personality restored: hand-drawn squiggles and arrows,
   skewed panels behind the visuals, and a marker highlight on the accent word.
   Content: the engine reads any statement (no supported-brokers list), rebuilds
   trades, asks when unsure, and never invents data. Two isolated CTAs.
   ========================================================================== */

const INK = '#0f1116'

/* ── Appure line-art accents ────────────────────────────────────────────── */
function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg className={'pointer-events-none absolute ' + className} width="48" height="14" viewBox="0 0 48 14" fill="none" aria-hidden>
      <path d="M2 8C6 2 10 2 14 8s8 6 12 0 8-6 12 0 6 4 8 2" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
function DecoArrow({ className = '' }: { className?: string }) {
  return (
    <svg className={'pointer-events-none absolute ' + className} width="42" height="36" viewBox="0 0 42 36" fill="none" aria-hidden>
      <path d="M4 4c16 3 26 11 31 26" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26 27l9 4-1-10" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Dots({ className = '' }: { className?: string }) {
  return (
    <svg className={'pointer-events-none absolute ' + className} width="46" height="46" viewBox="0 0 46 46" fill={INK} aria-hidden>
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}-${c}`} cx={5 + c * 18} cy={5 + r * 18} r={2.4} />))}
    </svg>
  )
}

/* ── shared bits (monochrome) ───────────────────────────────────────────── */
function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-bold tracking-[0.14em] text-ink-mute uppercase">{children}</span>
}
/** Accent word with a soft black marker highlight (Appure two-tone, monochrome). */
function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span aria-hidden className="absolute inset-x-[-3px] bottom-[0.1em] z-0 h-[0.32em] rounded-sm bg-ink/12" />
    </span>
  )
}
function PrimaryBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="rounded-xl bg-ink px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(15,17,22,0.5)] transition-transform hover:-translate-y-0.5">
      {children}
    </a>
  )
}
function GhostBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-colors hover:border-ink/40">
      {children}
    </a>
  )
}
function LearnMore({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center gap-2 text-[14px] font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink">
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
    </a>
  )
}

/* soft grey slab, skewed like Appure's panel behind a visual */
function Slab({ skew = -6 }: { skew?: number }) {
  return <span aria-hidden className="absolute -inset-4 -z-10 rounded-[28px] bg-canvas-deep" style={{ transform: `skewX(${skew}deg)` }} />
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-16 md:px-10 md:pt-44 md:pb-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Eyebrow>Universal Import</Eyebrow>
          <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.6rem,5.6vw,4.4rem)] leading-[1.02] font-bold text-ink">
            Drag any report. <Mark>Orca reads it.</Mark>
          </h1>
          <p data-reveal className="mt-6 max-w-[480px] text-[16.5px] leading-[1.6] text-ink-mute">
            Every broker exports a different format; every trader builds a different Excel. Most tools keep a
            rigid list of “supported brokers” — and lock out the rest. Orca reads the file itself.
          </p>
          <div data-reveal className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:flex [&>a]:w-full [&>a]:items-center [&>a]:justify-center sm:[&>a]:inline-flex sm:[&>a]:w-auto">
            <PrimaryBtn href="/signup">Import a file</PrimaryBtn>
            <GhostBtn href="/#demo">
              <Play className="h-4 w-4 fill-ink text-ink" strokeWidth={0} /> Watch how it works
            </GhostBtn>
          </div>
        </div>

        <div data-reveal className="relative flex justify-center">
          <span aria-hidden className="absolute -z-10 h-[360px] w-[360px] rounded-[44%_56%_58%_42%/46%_44%_56%_54%] bg-canvas-deep" />
          {/* line-art accents */}
          <Squiggle className="-left-2 top-6 text-ink" />
          <DecoArrow className="-right-1 top-0 rotate-[18deg]" />
          <Dots className="-bottom-3 -left-4 opacity-70" />
          {/* dropzone card */}
          <div className="w-full max-w-[420px] rounded-[24px] border border-line bg-surface p-6 elev-3">
            <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-canvas-deep/50 px-6 py-9 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white"><UploadCloud className="h-7 w-7" strokeWidth={1.8} /></span>
              <p className="mt-4 text-[15px] font-bold text-ink">Drop any statement</p>
              <p className="mt-1 text-[12.5px] text-ink-mute">XLSX · XLS · CSV · TSV · TXT — or no extension at all</p>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-ink" strokeWidth={1.8} />
              <span className="flex-1 truncate text-[13px] font-medium text-ink">bybit-export-aug.xlsx</span>
              <span className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white"><Check className="h-3 w-3" strokeWidth={3} /> 126 trades</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[12px] text-ink-faint">
              <Sparkles className="h-3.5 w-3.5 text-ink" strokeWidth={2} /> Reading structure — no template needed
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Reading, not matching — column mapping visual ──────────────────────── */
function ReadingNotMatching() {
  const rows = [
    { from: 'Sym', to: 'Symbol', tag: 'auto' },
    { from: 'Qty', to: 'Quantity', tag: 'auto' },
    { from: 'Amount', to: 'Fee rate', tag: 'read' },
    { from: 'Dt', to: 'Entry date', tag: 'auto' },
  ]
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div data-reveal className="relative order-2 lg:order-1">
          <Slab skew={-6} />
          <Squiggle className="-right-2 -top-3 text-ink" />
          <div className="rounded-[24px] border border-line bg-surface p-6 elev-3 md:p-7">
            <div className="mb-3 grid grid-cols-[1fr_28px_1fr] gap-3 text-[11px] font-bold tracking-widest text-ink-faint uppercase">
              <span>Your file</span><span /><span>Orca field</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {rows.map((r) => (
                <div key={r.from} className="grid grid-cols-[1fr_28px_1fr] items-center gap-3">
                  <span className="truncate rounded-lg border border-line bg-canvas px-3 py-2.5 text-[13px] font-medium text-ink-mute">{r.from}</span>
                  <ArrowRight className="mx-auto h-4 w-4 text-ink" strokeWidth={2.5} />
                  <span className="flex items-center justify-between rounded-lg border border-ink/15 bg-canvas-deep px-3 py-2.5 text-[13px] font-semibold text-ink">
                    {r.to}
                    <span className={'ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ' + (r.tag === 'auto' ? 'bg-ink text-white' : 'border border-ink/40 text-ink')}>{r.tag}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] leading-snug text-ink-faint">
              “Amount” holds values under 0.01 → read as a <b className="text-ink-mute">fee rate</b>, not a sum. The content decides — not the header.
            </p>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>Reading, not matching</Eyebrow>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-bold text-ink">
            It reads your file — <Mark>not a list</Mark>
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            Instead of a hardcoded adapter per broker, Orca profiles every column — what it actually contains —
            and builds the mapping in real time. A column named “Amount” could be size, value or a fee; the
            engine reads the numbers to decide.
          </p>
          <div data-reveal className="mt-7"><LearnMore href="/#demo">See it read a file</LearnMore></div>
        </div>
      </div>
    </section>
  )
}

/* ── How it works (3 steps + dashed connectors) ─────────────────────────── */
const STEPS = [
  { Icon: UploadCloud, title: 'Drop the file', body: 'Any statement from any broker — or the messy Excel you built yourself. No template, no setup.' },
  { Icon: Sparkles, title: 'Orca reads & asks', body: 'It detects the trades, skips the summary rows, and flags anything genuinely ambiguous for you.' },
  { Icon: Check, title: 'Confirm — it’s in', body: 'One click and it lands in your journal. Next time the same file comes in, it just works.' },
]
function HowItWorks() {
  return (
    <section className="relative px-6 py-20 md:px-10 md:py-28" style={{ background: 'var(--color-canvas-deep)' }}>
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>How it works</Eyebrow>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1] font-bold text-ink">
          From a raw file to a clean journal in three steps
        </h2>
      </div>
      <div className="relative mx-auto mt-16 grid max-w-[1000px] gap-10 md:grid-cols-3">
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-8 hidden h-16 w-full md:block" viewBox="0 0 1000 60" preserveAspectRatio="none">
          <path d="M180,30 C280,-10 380,70 500,30" fill="none" stroke="#c3c7cf" strokeWidth={2} strokeDasharray="5 7" />
          <path d="M500,30 C620,-10 720,70 820,30" fill="none" stroke="#c3c7cf" strokeWidth={2} strokeDasharray="5 7" />
        </svg>
        {STEPS.map((s, i) => (
          <div key={s.title} data-reveal className="relative flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-ink elev-2"><s.Icon className="h-7 w-7" strokeWidth={1.7} /></span>
            <span className="mt-4 text-[12px] font-bold tracking-widest text-ink-faint">STEP {i + 1}</span>
            <h3 className="mt-1 font-display text-[18px] font-bold text-ink">{s.title}</h3>
            <p className="mt-2 max-w-[280px] text-[13.5px] leading-[1.6] text-ink-mute">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Sneak peek — the conversational moment + stats ─────────────────────── */
function ConversationalMoment() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>In plain language</Eyebrow>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-bold text-ink">
            It talks you through it — <Mark>nothing hidden</Mark>
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            Transparency is part of the deal: the engine tells you exactly what it found, what it skipped and
            why, and asks about the one thing it isn’t sure of — instead of guessing behind your back.
          </p>
          <div data-reveal className="mt-8 flex gap-10">
            {[['6', 'file types'], ['0', 'templates to set up'], ['1', 'click to confirm']].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-[34px] font-bold text-ink">{n}</div>
                <div className="mt-1 text-[13px] text-ink-mute">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div data-reveal className="relative order-first lg:order-last">
          <Slab skew={6} />
          <DecoArrow className="-left-3 -top-2 -scale-x-100 rotate-[8deg]" />
          <Dots className="-bottom-4 -right-3 opacity-70" />
          <div className="rounded-[24px] border border-line bg-surface p-6 elev-3 md:p-7">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white"><MessagesSquare className="h-4 w-4" strokeWidth={2} /></span>
              <span className="text-[13px] font-bold text-ink">Orca · Import</span>
            </div>
            <div className="mt-4 space-y-2.5 text-[13.5px] leading-[1.55]">
              <p className="rounded-2xl rounded-tl-sm bg-canvas-deep px-4 py-2.5 text-ink">Found <b>126 trades</b>. Skipped <b>3 rows</b> — they’re summaries.</p>
              <p className="rounded-2xl rounded-tl-sm bg-canvas-deep px-4 py-2.5 text-ink">One column could be <b>Return %</b> or <b>R</b> — which is it?</p>
              <div className="flex gap-2 pt-1">
                <span className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink">Return %</span>
                <span className="rounded-lg bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white">It’s R ✓</span>
              </div>
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-[13.5px] font-semibold text-white">
              Confirm &amp; import <Check className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-ink-faint"><RefreshCw className="h-3.5 w-3.5 text-ink" strokeWidth={2} /> Remembered — next time this file just works.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Rebuilds trades — FIFO reconstruction visual ───────────────────────── */
function Reconstruction() {
  const fills = [
    { side: 'BUY', qty: '0.50', px: '61,200' },
    { side: 'BUY', qty: '0.50', px: '60,400' },
    { side: 'SELL', qty: '1.00', px: '63,900' },
  ]
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div data-reveal className="relative order-2 lg:order-1">
          <Slab skew={-6} />
          <Squiggle className="-left-2 -top-3 text-ink" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[24px] border border-line bg-surface p-6 elev-3 md:p-7">
            <div>
              <span className="mb-2 block text-[11px] font-bold tracking-widest text-ink-faint uppercase">Raw fills</span>
              <div className="flex flex-col gap-2">
                {fills.map((f, i) => (
                  <div key={i} className="rounded-lg border border-line bg-canvas px-3 py-2 text-[12px]">
                    <span className="font-bold text-ink">{f.side}</span>
                    <span className="tnum ml-1 text-ink-mute">{f.qty} @ {f.px}</span>
                  </div>
                ))}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-ink" strokeWidth={2.5} />
            <div className="rounded-xl border border-ink/15 bg-canvas-deep p-4">
              <span className="text-[11px] font-bold tracking-widest text-ink uppercase">Trade</span>
              <div className="mt-2 space-y-1 text-[12px] text-ink">
                <div className="flex justify-between"><span className="text-ink-mute">Entry</span><span className="tnum font-semibold">60,800</span></div>
                <div className="flex justify-between"><span className="text-ink-mute">Exit</span><span className="tnum font-semibold">63,900</span></div>
                <div className="flex justify-between"><span className="text-ink-mute">Fees</span><span className="tnum font-semibold">−18.40</span></div>
                <div className="mt-1 flex justify-between border-t border-ink/15 pt-1"><span className="font-bold">Result</span><span className="tnum font-bold text-ink">+2.4R</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>Beyond mapping</Eyebrow>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-bold text-ink">
            It rebuilds trades you <Mark>never typed</Mark>
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            Hand it a raw stream of buys and sells and Orca reconstructs the whole trade with FIFO — entry,
            exit, P&amp;L, fees and funding — handling partial closes, position flips and leftovers. Perfect for a
            crypto fills log that was never a list of trades.
          </p>
          <div data-reveal className="mt-7"><LearnMore href="/features/journal">See the journal it builds</LearnMore></div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #1 — mid black band ─────────────────────────────────────────────── */
function MessiestCTA() {
  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="relative mx-auto max-w-[1080px] overflow-hidden rounded-[28px] px-8 py-14 text-center md:px-16 md:py-20" style={{ background: 'linear-gradient(135deg,#1a1d24 0%,#0f1116 100%)' }}>
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(600px 260px at 50% -10%, rgba(255,255,255,0.10), transparent 60%)' }} />
        <Squiggle className="left-10 top-8 text-white [&_path]:stroke-white/40" />
        <Dots className="right-10 bottom-8 opacity-30 [&_circle]:fill-white" />
        <div className="relative">
          <h2 data-animate="title" className="mx-auto max-w-[640px] font-display text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.12] font-bold text-white">
            Throw your messiest export at it
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[15.5px] leading-[1.6] text-white/70">
            The weird broker, the hand-built spreadsheet, the file with no extension. If it holds trades, Orca reads it.
          </p>
          <div data-reveal className="mt-9 flex justify-center">
            <a href="/signup" className="rounded-xl bg-white px-8 py-3.5 text-[14.5px] font-semibold text-ink shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5">
              Import a file
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── More features — honest by design triad ─────────────────────────────── */
const HONEST = [
  { Icon: Rows3, title: 'Never drops a row silently', body: 'Every skipped row is shown and counted — summaries, duplicates, blanks. Transparency is the contract.' },
  { Icon: Ban, title: 'Never invents a balance', body: 'Equity points are saved only when they came from your file. A made-up number would poison every risk metric.' },
  { Icon: HelpCircle, title: 'Asks when it’s unsure', body: 'An ambiguous date like 03/04 isn’t guessed. Orca flags it and asks — then remembers your answer.' },
]
function HonestByDesign() {
  return (
    <section className="mx-auto max-w-[1160px] px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>Honest by design</Eyebrow>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1] font-bold text-ink">
          A reader you can trust with your record
        </h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {HONEST.map((p) => (
          <div key={p.title} data-reveal className="rounded-2xl border border-line bg-surface p-7 elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white"><p.Icon className="h-6 w-6" strokeWidth={1.8} /></span>
            <h3 className="mt-5 font-display text-[18px] font-bold text-ink">{p.title}</h3>
            <p className="mt-2 text-[14px] leading-[1.65] text-ink-mute">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── FAQ ─────────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'Which brokers are supported?', a: 'There’s no list. Orca reads the file itself, so it works with any broker or exchange — and with the custom spreadsheet you built yourself.', Icon: FileUp },
  { q: 'What file types can I drop?', a: 'XLSX, XLS, XLSM, CSV, TSV and TXT — and even a file with no valid extension. It tries to parse it either way.', Icon: FileSpreadsheet },
  { q: 'Does it store my file?', a: 'The file is decoded locally in your browser. Only the resulting canonical trades are saved to your account — never the raw file.', Icon: ShieldCheck },
  { q: 'What if a column is ambiguous?', a: 'It flags it and asks you to confirm rather than guessing — then remembers your choice, so the same file just works next time.', Icon: HelpCircle },
]
function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>Good to know</Eyebrow>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.1] font-bold text-ink">
          Frequently asked questions
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <button key={f.q} onClick={() => setOpen(isOpen ? -1 : i)} className={'rounded-2xl border bg-surface p-6 text-left transition-all duration-300 ' + (isOpen ? 'border-ink/30 elev-2' : 'border-line hover:border-ink/20')}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas-deep text-ink"><f.Icon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                <span className="flex-1 font-display text-[16px] font-bold text-ink">{f.q}</span>
                <ChevronDown className={'h-5 w-5 text-ink-faint transition-transform duration-300 ' + (isOpen ? 'rotate-180' : '')} strokeWidth={2} />
              </div>
              {isOpen && <p className="mt-3 pl-12 text-[14px] leading-[1.65] text-ink-mute">{f.a}</p>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ── CTA #2 — closing trial band ─────────────────────────────────────────── */
function TrialCTA() {
  return (
    <section className="px-6 pb-8 md:px-10 md:pb-16">
      <div className="mx-auto grid max-w-[1120px] items-center gap-8 rounded-[28px] border border-line bg-canvas-deep px-8 py-12 md:grid-cols-2 md:px-14 md:py-16">
        <div>
          <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.08] font-bold text-ink">
            Bring your first statement today
          </h2>
          <p data-reveal className="mt-4 max-w-[420px] text-[15px] leading-[1.6] text-ink-mute">
            Free with your account. Drag the file in, confirm once, and your history is live.
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap [&>a]:flex [&>a]:w-full [&>a]:items-center [&>a]:justify-center sm:[&>a]:inline-flex sm:[&>a]:w-auto">
            <PrimaryBtn href="/signup">Start free</PrimaryBtn>
            <GhostBtn href="/#demo">
              <FileUp className="h-4 w-4 text-ink" strokeWidth={2} /> See it in action
            </GhostBtn>
          </div>
          <span className="flex items-center gap-1.5 text-[13px] text-ink-faint"><Check className="h-4 w-4 text-ink" strokeWidth={2.5} /> No credit card required</span>
        </div>
      </div>
    </section>
  )
}

export function UniversalImportFeaturePage() {
  return (
    <PageShell>
      <Hero />
      <ReadingNotMatching />
      <HowItWorks />
      <ConversationalMoment />
      <Reconstruction />
      <MessiestCTA />
      <HonestByDesign />
      <Faq />
      <TrialCTA />
    </PageShell>
  )
}
