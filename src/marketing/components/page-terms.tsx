import { Link, useLocation } from 'react-router-dom'
import { ScrollText, AlertTriangle, ArrowLeft } from 'lucide-react'
import { PageShell } from './page-shell'

/** A back link shown only when the reader arrived from the auth screens. */
function useAuthBack() {
  const from = (useLocation().state as { from?: string } | null)?.from
  const label = from === '/login' ? 'Back to log in' : from === '/signup' ? 'Back to sign up' : null
  return label ? { to: from as string, label } : null
}

/* ============================================================================
   TERMS OF SERVICE (/terms) — a clean, serious legal document in the site's
   light palette. Single reading column, numbered sections, a highlighted notice.
   ========================================================================== */

type Clause = { id: string; label?: string; text: string }
type Section = { num: string; title: string; clauses: Clause[] }

const SECTIONS: Section[] = [
  {
    num: '1',
    title: 'Eligibility, Registration & Access Restrictions',
    clauses: [
      { id: '1.1', label: 'Age restriction', text: 'Use of the Platform is permitted only to users aged 18 or above who are legally competent to enter into binding actions. By registering, the User declares and confirms that they meet this age requirement.' },
      { id: '1.2', label: 'Anti-Compete', text: 'It is strictly prohibited to use the Platform, its content, design or logic in order to develop, produce, market or promote a competing system, directly or indirectly. The Operator reserves the sole right to block, immediately and without prior notice, any User reasonably suspected of acting on behalf of a business competitor or attempting to copy the System’s methodology.' },
      { id: '1.3', label: 'Accuracy of details', text: 'When registering, the User undertakes to provide accurate, complete and correct details. Knowingly providing false or inaccurate details will be grounds for immediate suspension and deletion of the account.' },
    ],
  },
  {
    num: '2',
    title: 'No Financial Advice & Limitation of Liability',
    clauses: [
      { id: '2.1', label: 'Technological tool only', text: 'The information, metrics, analytics and risk-management figures displayed in the Platform are produced for statistical, educational and self-discipline purposes only. The System, its content and alerts shall not be regarded as investment advice, a recommendation to execute trades, or a substitute for professional financial advice tailored to the User’s personal circumstances.' },
      { id: '2.2', label: 'Sole responsibility for trading', text: 'Every trading decision, definition of risk levels (such as R Units), management of positions or activation of protection and trading-halt mechanisms (Kill Switch) is performed by the User and is solely and fully their responsibility.' },
      { id: '2.3', label: 'Liability exclusion for financial loss', text: 'The Operator, its employees and anyone acting on its behalf shall not be liable in any way and under any circumstances for any damage, financial loss, loss of profit, or harm (direct, indirect, consequential or special) caused to the User or any third party as a result of relying on data displayed in the System, using the System, or being unable to use it.' },
    ],
  },
  {
    num: '3',
    title: 'Intellectual Property & Anti-Scraping',
    clauses: [
      { id: '3.1', label: 'Full ownership of intellectual property', text: 'All copyrights, trademarks, source code, architecture, algorithms, analytical methods, UI/UX design and ideas underlying the OrcaInvestment platform are the exclusive intellectual property of the Operator. No part of the Platform may be copied, distributed, publicly displayed, modified or commercially exploited without the express prior written consent of the Operator.' },
      { id: '3.2', label: 'No data mining or reverse engineering', text: 'It is strictly prohibited to operate applications, bots, crawlers, robots or any other automated tool for searching, scanning, copying, mining or automatically retrieving data and content from the Platform. Reverse engineering, decompiling or altering the System code is likewise strictly prohibited.' },
    ],
  },
  {
    num: '4',
    title: 'Service Availability & Faults (AS-IS)',
    clauses: [
      { id: '4.1', label: 'Service provided AS-IS', text: 'The Platform is provided on an “AS-IS” and “AS-AVAILABLE” basis. The Operator does not warrant that services will be uninterrupted, immune to unauthorised access, or free of errors, bugs or faults in communications, hardware or software systems.' },
      { id: '4.2', label: 'Changes and temporary downtime', text: 'The Operator reserves the sole right to change, update, add or remove features, interfaces and tools at any time, and to temporarily take the System down for maintenance, all without prior notice and without giving rise to any claim or demand from the User.' },
    ],
  },
  {
    num: '5',
    title: 'Indemnification',
    clauses: [
      { id: '5.1', label: 'User’s indemnification obligation', text: 'The User undertakes to indemnify, compensate and defend the Operator, its directors, business partners and employees against any claim, demand, damage, loss, loss of profit or expense (including attorneys’ fees and court costs) arising out of the User’s breach of these Terms or out of the User’s unlawful, negligent or unauthorised use of the Platform.' },
    ],
  },
  {
    num: '6',
    title: 'Usage Model, Future Pricing & Purchases Framework',
    clauses: [
      { id: '6.1', label: 'Free access at the current stage (Early Adopters)', text: 'As of the date of these Terms, the Operator makes the Platform’s core services and features available at no cost in order to grow the community. The User acknowledges and agrees that this free access is granted as a temporary courtesy and does not constitute any commitment, promise or vested right to receive the System free of charge in perpetuity.' },
      { id: '6.2', label: 'Right to change the business model and charge fees', text: 'The Operator reserves the full and exclusive right, at any time and in its sole discretion, to change the OrcaInvestment business model. This includes, among other things: charging monthly/annual subscription fees for use of the System (in whole or in part); moving existing features behind a paywall; or limiting data volume, trade count and API syncs on the free tier.' },
      { id: '6.3', label: 'Protection of ownership transfer, mergers and exits', text: 'The right to change the business model and reset free access is granted in full also to any third party or new legal entity that acquires the Platform, merges with it or assumes its management rights. In the event of a change of ownership, the acquiring entity is not obliged to grant free access to historical users and may demand payment immediately.' },
      { id: '6.4', label: 'Notice of transition to paid access', text: 'If a decision is made to charge fees, notice will be published on the Platform or sent to the User’s registered email address. A User who chooses not to pay the required fee will have their access (in whole or in part) blocked, and the Operator may disconnect their API connections.' },
      { id: '6.5', label: 'Legal framework for future paid services (cancellation policy)', text: 'To the extent that paid tiers are offered in the future, they will be subject to the Israeli Consumer Protection Law, 5741-1981 and its regulations. Cancellation of an annual/one-off transaction will be possible within 14 days of purchase, less statutory cancellation fees (5% of the transaction or NIS 100, whichever is lower) and less the pro-rata portion already supplied. Cancellation of a recurring monthly subscription will be possible at any time via the user interface, will take effect at the end of the current billing cycle, and will not entitle the User to a pro-rata refund for unused days within that month.' },
    ],
  },
]

export function TermsPage() {
  const back = useAuthBack()
  return (
    <PageShell>
      <section className="px-6 pt-32 pb-24 md:px-10">
        <div className="mx-auto max-w-[760px]">
          {back && (
            <Link to={back.to} className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4" strokeWidth={2} /> {back.label}
            </Link>
          )}
          {/* header */}
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas-deep text-ink">
              <ScrollText className="h-5 w-5" strokeWidth={1.85} />
            </span>
            <span className="micro text-ink-faint">Legal</span>
          </div>
          <h1 data-animate="title" className="mt-7 font-display text-[clamp(2.2rem,4.4vw,3.2rem)] leading-[1.05] font-bold text-ink">
            OrcaInvestment — Terms of Service
          </h1>
          <p className="mt-4 text-[13.5px] font-medium text-ink-mute">
            Version <span className="tnum">v2.0_orca_investment</span> · Last updated: 2026-06-20
          </p>

          {/* binding-language notice */}
          <div className="mt-8 flex gap-3 rounded-2xl border border-amber/30 bg-amber-soft/50 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" strokeWidth={2} />
            <p className="text-[14px] leading-relaxed text-ink-2">
              <strong className="font-semibold text-ink">Notice.</strong> The legally binding text of this
              agreement is the Hebrew version, in accordance with the exclusive jurisdiction of the courts of
              Tel Aviv-Yafo. The English text below is provided for accessibility.
            </p>
          </div>

          {/* intro */}
          <div className="mt-12">
            <h2 className="font-display text-[20px] font-bold text-ink">Introduction &amp; Acceptance of Terms</h2>
            <div className="mt-4 space-y-4 text-[15.5px] leading-[1.8] text-ink-2">
              <p>
                Welcome to the OrcaInvestment platform (the “Platform” or the “System”). The Platform is
                operated by the system operator (the “Operator”) and provides traders in the financial markets
                with advanced tools for risk management, journaling and performance tracking via API
                connections, as well as analytics for self-discipline and trading psychology.
              </p>
              <p>
                These Terms of Service (the “Terms”) constitute a binding legal agreement between the Operator
                and any person who browses, registers, logs in or uses the Platform or its services in any way
                (the “User”).
              </p>
              <p>
                Please read these Terms carefully. Browsing the site, creating an account, or entering API keys
                into the System constitute full, absolute and irrevocable acceptance of every condition and
                clause set out in this document. If you do not agree to any term herein, you must immediately
                stop using the Platform; you are not permitted to use it in any manner.
              </p>
              <p className="text-[13.5px] text-ink-mute">
                Note: The Hebrew version of these Terms is the legally binding text. This English version is
                provided for accessibility only; in any inconsistency the Hebrew version prevails.
              </p>
            </div>
          </div>

          {/* numbered sections */}
          {SECTIONS.map((s) => (
            <div key={s.num} className="mt-12 border-t border-line pt-10">
              <h2 className="font-display text-[20px] font-bold text-ink">
                <span className="tnum mr-2 text-teal">{s.num}.</span> {s.title}
              </h2>
              <div className="mt-5 space-y-5">
                {s.clauses.map((c) => (
                  <p key={c.id} className="text-[15.5px] leading-[1.8] text-ink-2">
                    <span className="tnum font-semibold text-ink">{c.id}.</span>{' '}
                    {c.label && <strong className="font-semibold text-ink">{c.label}: </strong>}
                    {c.text}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* footer / signature */}
          <div className="mt-14 rounded-2xl border border-line bg-canvas-deep p-6 text-[13.5px] leading-relaxed text-ink-mute">
            Version <span className="tnum">v2.0_orca_investment</span> · Last updated: 2026-06-20. Ticking the
            acceptance checkbox and clicking the continue button constitute a binding electronic signature.
          </div>
        </div>
      </section>
    </PageShell>
  )
}
