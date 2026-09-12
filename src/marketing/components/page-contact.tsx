import { Send, ArrowRight, Clock } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow, type Accent } from './ui/primitives'
import { Sparkles } from './features/blocks'

/* ============================================================================
   CONTACT (/contact) — "Get in touch": three ways to reach us, then a form.
   Modeled on a clean SaaS contact layout but rebuilt in Orca's light editorial
   palette — and digital-only, consistent with our accessibility statement
   (no phone line; email, in-app chat and community instead).
   ========================================================================== */

const METHODS: { img: string; accent: Accent; title: string; body: string; link: string; href: string }[] = [
  { img: '/icons/info-icon-2.webp', accent: 'teal', title: 'Email us', body: 'Send us a note and a real person replies — usually well within 24 hours.', link: 'hello@orcainvestment.com', href: 'mailto:hello@orcainvestment.com' },
  { img: '/icons/info-icon-1.webp', accent: 'violet', title: 'Message us', body: 'In-app chat and text support, Monday to Friday, 9 AM–5 PM.', link: 'Open in-app chat', href: '/signup' },
  { img: '/icons/info-icon-3.webp', accent: 'indigo', title: 'Community', body: 'Join the trader community on Discord and Telegram — questions, ideas, wins.', link: 'Join the community', href: '#' },
]

const GAP_SPARKS = [
  { top: '12%', left: '6%', size: 12, delay: '0s' },
  { top: '18%', left: '92%', size: 10, delay: '1.1s' },
  { top: '84%', left: '8%', size: 11, delay: '0.7s' },
  { top: '88%', left: '90%', size: 12, delay: '1.7s' },
]

function ContactHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-8 text-center md:px-10 md:pt-40">
      <HoloGlow className="!inset-x-[26%] !top-[8%] !bottom-auto !h-[300px]" opacity={0.28} blur={90} />
      <div className="relative mx-auto max-w-[720px]">
        <span data-reveal className="micro inline-flex items-center gap-2 font-semibold text-indigo">
          <Send className="h-3.5 w-3.5" strokeWidth={2} /> Contact
        </span>
        <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.04] font-bold text-ink">
          Get in touch. <span className="text-indigo">We’re listening.</span>
        </h1>
        <p data-reveal className="mx-auto mt-5 max-w-[520px] text-[16.5px] leading-[1.6] text-ink-mute">
          Questions, feedback, or a hiccup with a sync — reach out however you like, and a real person gets
          back to you.
        </p>
      </div>
    </section>
  )
}

function MethodsSection() {
  return (
    <section className="px-6 py-12 md:px-10 md:py-16">
      <div className="mx-auto grid max-w-[1120px] gap-5 md:grid-cols-3">
        {METHODS.map((m) => {
          const isRoute = m.href.startsWith('/')
          return (
            <div key={m.title} data-reveal className="group flex flex-col rounded-3xl border border-line bg-surface p-7 elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas-deep">
                <img src={m.img} alt="" className="h-9 w-9 object-contain" draggable={false} />
              </span>
              <h3 className="mt-5 font-display text-[19px] font-bold text-ink">{m.title}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-mute">{m.body}</p>
              <a
                href={m.href}
                {...(isRoute ? {} : { target: m.href.startsWith('mailto') ? undefined : '_blank', rel: 'noopener noreferrer' })}
                className={'mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold ' + ACCENT_LINK[m.accent]}
              >
                {m.link}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
              </a>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const ACCENT_LINK: Record<Accent, string> = {
  indigo: 'text-indigo',
  teal: 'text-teal',
  rose: 'text-rose',
  amber: 'text-amber',
  violet: 'text-violet',
}

function Field({ label, type = 'text', placeholder, full = false }: { label: string; type?: string; placeholder: string; full?: boolean }) {
  return (
    <label className={'flex flex-col gap-2 ' + (full ? 'sm:col-span-2' : '')}>
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-full border border-line bg-surface px-5 py-3.5 text-[14.5px] text-ink outline-none transition-all placeholder:text-ink-faint focus:border-indigo/50 focus:ring-4 focus:ring-indigo/10"
      />
    </label>
  )
}

function FormSection() {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
      <Sparkles points={GAP_SPARKS} color="rgba(124,58,237,0.35)" />
      <div className="mx-auto grid max-w-[1120px] items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* left copy */}
        <div data-side="left">
          <span className="micro font-semibold text-indigo">Any query</span>
          <span className="mt-3 block h-[3px] w-9 rounded-full bg-indigo" />
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.08] font-bold text-ink">
            Fill out the form <span className="text-indigo">and we’ll take it from here.</span>
          </h2>
          <p className="mt-5 max-w-[420px] text-[15.5px] leading-[1.7] text-ink-mute">
            Tell us what’s on your mind — a question, a bug, a partnership idea. The more detail you give,
            the faster we can actually help.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 elev-1">
            <Clock className="h-4 w-4 text-teal" strokeWidth={2} /> Typical reply time: under 24 hours
          </div>
          <img src="/icons/contact-1.webp" alt="" draggable={false} className="mt-10 hidden w-full max-w-[440px] select-none lg:block" />
        </div>

        {/* right form */}
        <div data-side="right" className="relative">
          <HoloGlow className="!inset-x-[-6%] !inset-y-[-8%]" opacity={0.2} blur={70} />
          <form onSubmit={(e) => e.preventDefault()} className="relative rounded-[28px] border border-line bg-surface p-6 elev-3 md:p-8">
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="Full name*" placeholder="Jane Trader" />
              <Field label="Email*" type="email" placeholder="you@email.com" />
              <Field label="Subject*" placeholder="What’s this about?" />
              <Field label="Company / handle" placeholder="Optional" />
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-[13px] font-semibold text-ink-2">Your message*</span>
                <textarea
                  rows={5}
                  placeholder="Tell us what you need…"
                  className="w-full resize-none rounded-[20px] border border-line bg-surface px-5 py-4 text-[14.5px] text-ink outline-none transition-all placeholder:text-ink-faint focus:border-indigo/50 focus:ring-4 focus:ring-indigo/10"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span className="text-center text-[12px] text-ink-faint sm:text-left">We’ll only use your details to reply. No spam.</span>
              <button
                type="submit"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-7 py-4 text-[15px] font-semibold text-white shadow-[0_10px_26px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5 sm:w-auto sm:py-3.5 sm:text-[14.5px]"
              >
                Send message
                <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

/* Distinct closing CTA — the fastest "answer" is trying it. */
function SkipTheFormCTA() {
  return (
    <section className="px-6 pb-32 md:px-10">
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-5 rounded-[26px] border border-line bg-canvas-deep px-6 py-10 text-center md:flex-row md:justify-between md:gap-8 md:px-12 md:text-left">
        <div>
          <h2 className="font-display text-[clamp(1.4rem,2.4vw,1.9rem)] leading-[1.15] font-bold text-ink">
            Not a support question?
          </h2>
          <p className="mt-2 max-w-[440px] text-[14.5px] leading-relaxed text-ink-mute">
            The fastest answer to “is it any good?” is ten minutes with your own trades. Start free — no card,
            read-only.
          </p>
        </div>
        <CTA href="/signup" className="shrink-0">Start free</CTA>
      </div>
    </section>
  )
}

export function ContactPage() {
  return (
    <PageShell>
      <ContactHero />
      <MethodsSection />
      <FormSection />
      <SkipTheFormCTA />
    </PageShell>
  )
}
