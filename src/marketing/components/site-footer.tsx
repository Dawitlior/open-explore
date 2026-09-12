import { Link } from 'react-router-dom'
import { ChevronRight, Mail, MapPin, MessageCircle, Send, AtSign, Globe } from 'lucide-react'

/* ============================================================================
   FOOTER — APPWAY-style: a soft wave lifts off the page into a lavender panel
   (a deliberately different colour from the rest of the site), four columns
   with accent-underlined headings and chevron links, a legible disclaimer, and
   a centered copyright line.
   ========================================================================== */

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Dashboard', href: '/features/dashboard' },
      { label: 'Trade Journal', href: '/features/journal' },
      { label: 'Analytics', href: '/features/analytics' },
      { label: 'Exchanges', href: '/exchanges' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Trading Insights', href: '/resources' },
      { label: 'Security & Compliance', href: '/security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our goals', href: '/our-goals' },
      { label: 'Get started', href: '/signup' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
]

const SOCIALS = [
  { Icon: MessageCircle, label: 'Discord', href: '#' },
  { Icon: Send, label: 'Telegram', href: '#' },
  { Icon: AtSign, label: 'X', href: '#' },
  { Icon: Globe, label: 'Website', href: '#' },
]

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="font-display text-[17px] font-bold text-ink">{children}</h4>
      <span className="mt-2 block h-[3px] w-8 rounded-full bg-indigo" />
    </div>
  )
}

function FooterLink({ href, label }: { href: string; label: string }) {
  const cls = 'group inline-flex items-center gap-2 text-[14.5px] text-ink-2 transition-colors duration-300 hover:text-indigo'
  const inner = (
    <>
      <ChevronRight className="h-4 w-4 text-indigo transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
      {label}
    </>
  )
  const isRoute = href.startsWith('/') && !href.startsWith('/#')
  return <li>{isRoute ? <Link to={href} className={cls}>{inner}</Link> : <a href={href} className={cls}>{inner}</a>}</li>
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24">
      {/* Wave lifting the lavender panel off the page */}
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="block h-[70px] w-full md:h-[90px]"
        style={{ fill: '#ece2fb' }}
      >
        <path d="M0,42 C240,92 480,8 720,40 C960,72 1200,18 1440,48 L1440,100 L0,100 Z" />
      </svg>

      <div
        style={{
          background:
            'radial-gradient(900px 480px at 50% 18%, rgba(124,58,237,0.16), transparent 62%), #ece2fb',
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 pt-8 pb-14 md:px-10">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.1fr]">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/orca-icon.png" alt="Orca Investment" className="h-10 w-10 rounded-full object-cover" />
                <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
                  Orca Investment
                </span>
              </div>
              <p className="mt-5 max-w-[320px] text-[14.5px] leading-relaxed text-ink-2">
                A smart, automated trading journal. Every trade, every stat, one better decision —
                built from a trader, to a trader.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="text-[13px] font-bold tracking-wide text-ink">Follow us</span>
                <div className="flex items-center gap-2">
                  {SOCIALS.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      aria-label={s.label}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-2 shadow-[0_2px_8px_-3px_rgba(74,58,110,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo hover:text-white"
                    >
                      <s.Icon className="h-4 w-4" strokeWidth={2} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Link columns */}
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <Heading>{col.title}</Heading>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <FooterLink key={l.label} href={l.href} label={l.label} />
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact */}
            <div>
              <Heading>Contact</Heading>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-indigo shadow-[0_2px_8px_-3px_rgba(74,58,110,0.25)]">
                    <Mail className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <a
                    href="mailto:hello@orcainvestment.com"
                    className="text-[14.5px] leading-relaxed text-ink-2 transition-colors hover:text-indigo"
                  >
                    hello@orcainvestment.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-indigo shadow-[0_2px_8px_-3px_rgba(74,58,110,0.25)]">
                    <MapPin className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="text-[14.5px] leading-relaxed text-ink-2">
                    Tel Aviv, Israel
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-indigo shadow-[0_2px_8px_-3px_rgba(74,58,110,0.25)]">
                    <Send className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <Link to="/contact" className="text-[14.5px] leading-relaxed font-medium text-ink-2 transition-colors hover:text-indigo">
                    Send us a message
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mx-auto mt-14 max-w-[820px] text-center text-[12.5px] leading-relaxed text-ink-mute">
            Orca Investment is not a signals service and does not provide investment advice. All data
            is based on your own trading activity and is intended for learning, process improvement
            and discipline. Trading involves risk; every user acts at their own discretion.
          </p>

          <div className="mt-8 border-t border-[#d8c9f2] pt-6 text-center">
            <span className="text-[13px] font-medium text-ink-2">
              © 2026 Orca Investment. All rights reserved. · Made in Tel Aviv
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
