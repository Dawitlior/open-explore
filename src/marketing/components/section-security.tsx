import { Link } from 'react-router-dom'
import { Lock, ShieldCheck, KeyRound, BadgeCheck, ArrowRight } from 'lucide-react'
import { AssetImage, IconTile, type Accent } from './ui/primitives'

/* ============================================================================
   SECURITY — a wide, on-palette panel with a techy "security console" card row:
   gradient top-rail, mono status chips, faint grid, hover glow. Copy stays
   plain-but-modern; the facts come from the platform's white-box audit.
   ========================================================================== */

type Card = { Icon: typeof Lock; accent: Accent; tag: string; title: string; desc: string }

const CARDS: Card[] = [
  {
    Icon: Lock,
    accent: 'indigo',
    tag: 'READ-ONLY',
    title: 'Read-only access',
    desc: 'Linked with read-only keys — no trade, transfer or withdrawal scope. Funds never leave your exchange.',
  },
  {
    Icon: ShieldCheck,
    accent: 'teal',
    tag: 'ISOLATED',
    title: 'Account-level isolation',
    desc: 'Every record is scoped to your account at the database layer. Zero cross-user access, by design.',
  },
  {
    Icon: KeyRound,
    accent: 'indigo',
    tag: 'ENCRYPTED',
    title: 'Encrypted key vault',
    desc: 'Connection keys are sealed in an encrypted vault — never logged, never stored in plain text.',
  },
  {
    Icon: BadgeCheck,
    accent: 'teal',
    tag: 'AUDITED',
    title: 'White-box audited',
    desc: 'Cleared a full white-box audit across code, data and auth — zero critical findings.',
  },
]

export function SectionSecurity() {
  return (
    <section id="security" className="relative mx-auto w-full max-w-[1280px] px-6 py-28 md:px-10">
      <div
        className="relative overflow-hidden rounded-[36px] border border-line px-6 py-16 md:px-16 md:py-20"
        style={{
          background:
            'radial-gradient(760px 440px at 88% 4%, rgba(124,58,237,0.12), transparent 60%),' +
            'radial-gradient(620px 360px at 2% 100%, rgba(26,29,36,0.08), transparent 60%),' +
            '#f4effe',
        }}
      >
        {/* Faint tech grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
            maskImage: 'radial-gradient(circle at 50% 38%, black, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 38%, black, transparent 78%)',
          }}
        />

        {/* Header + illustration */}
        <div className="relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1fr]">
          <div data-side="left" className="relative order-2 lg:order-1">
            <div className="mx-auto max-w-[500px] rounded-[28px] bg-surface p-7 elev-3">
              <AssetImage
                src="/encryption.png"
                alt="Your funds stay yours — Orca connects read-only and keeps data encrypted"
                className="block w-full"
                fallback={<div className="aspect-square w-full rounded-2xl bg-canvas-deep" />}
              />
            </div>
          </div>

          <div data-side="right" className="order-1 lg:order-2">
            <span className="micro inline-flex items-center gap-2 rounded-full bg-indigo-soft px-3 py-1 text-indigo">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo" />
              Your security
            </span>
            <h2 className="mt-5 font-display text-[clamp(2.1rem,4vw,3.2rem)] leading-[1.06] font-bold text-ink">
              Your money and data are <span className="text-indigo">safe with Orca.</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-[17px] leading-[1.6] text-ink-mute">
              You connect Orca to your exchange in read-only mode. That means we can study your
              trades to help you improve — but we can never move, trade, or withdraw your money.
              Ever.
            </p>
            <Link
              to="/security"
              className="group mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold text-indigo"
            >
              Read our full security &amp; compliance
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
            </Link>
          </div>
        </div>

        {/* Security console — full width */}
        <div className="relative mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div
              key={c.title}
              data-reveal
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo/30 hover:elev-3"
            >
              {/* gradient top rail */}
              <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo via-violet to-teal opacity-80" />
              {/* faint dot grid */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage: 'radial-gradient(rgba(124,58,237,0.07) 1px, transparent 1px)',
                  backgroundSize: '13px 13px',
                }}
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <IconTile accent={c.accent}>
                    <c.Icon className="h-5 w-5" strokeWidth={1.75} />
                  </IconTile>
                  <span className="micro inline-flex items-center gap-1.5 text-teal">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-teal" />
                    Verified
                  </span>
                </div>
                <span className="micro mt-5 block text-ink-faint">{c.tag}</span>
                <h3 className="mt-1.5 text-[16px] font-bold text-ink">{c.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mute">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
