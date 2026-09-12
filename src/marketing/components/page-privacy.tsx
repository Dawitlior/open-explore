import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react'
import { PageShell } from './page-shell'

/* ============================================================================
   PRIVACY POLICY (/privacy) — clean legal document in the site's light palette.
   Text kept verbatim; single reading column, numbered sections, notice callout.
   ========================================================================== */

type Clause = { id: string; label?: string; text: string }
type Section = { num: string; title: string; lead?: string; clauses: Clause[] }

const SECTIONS: Section[] = [
  {
    num: '1',
    title: 'Types of Information Collected',
    lead: 'The System collects and processes three principal types of information:',
    clauses: [
      { id: '1.1', label: 'Active Identity Data', text: 'email address, first and last name, and digital login identifiers voluntarily provided by the User during registration or login via third-party providers (such as Google OAuth).' },
      { id: '1.2', label: 'Usage Telemetry', text: 'IP addresses, browser type, device type, operating system, browsing times, pages viewed and click data. This information is collected automatically using cookies and external analytics tools for security, server performance monitoring and improvement of the user experience.' },
      { id: '1.3', label: 'Raw Trading & Performance Data', text: 'trade history, open and closed positions, traded volume, profit and loss (PnL) metrics, entry and exit prices, and precise execution times. This data is automatically pulled from the User’s external trading accounts using the API keys they enter into the System.' },
    ],
  },
  {
    num: '2',
    title: 'API Key Connection — User Duties & Liability Exclusion',
    clauses: [
      { id: '2.1', label: 'Read-Only obligation', text: 'It is the User’s sole and absolute obligation to verify, before entering an API key into the System, that the key is configured on the broker/exchange side with read-only permission, with no withdrawal permission and no active trading/execution permission.' },
      { id: '2.2', label: 'Full liability exclusion for leakage or breach', text: 'The Operator does not check or supervise the permission level of the key on the broker side. Entering a key with permissions broader than allowed is performed at the User’s sole and full responsibility. The Operator excludes any liability, direct or indirect, for any damage, forced trading action or withdrawal of funds carried out in the User’s broker account, including in the event of a cyber incident, data leak or breach of OrcaInvestment servers.' },
    ],
  },
  {
    num: '3',
    title: 'Anonymisation, Pseudonymisation & Data Monetisation',
    lead: 'The System’s architecture relies on broad statistical data processing. By accepting this document, the User grants the Operator an irrevocable right to act in accordance with the following mechanism:',
    clauses: [
      { id: '3.1', label: 'Strict pseudonymisation', text: 'The System maintains a complete technological and structural separation between the User’s identifying details (name and email) and their trading data, trade journal and discipline metrics. Trading data is encoded under a random anonymous identifier (UUID) detached from personal identity.' },
      { id: '3.2', label: 'Aggregated statistical pool', text: 'All anonymous trading data from the System’s users is fused and aggregated into a collective statistical dataset, which analyses market trends, heatmaps, community sentiment and broad trading-psychology metrics.' },
      { id: '3.3', label: 'Monetisation rights', text: 'The Operator reserves the full, exclusive and permanent right to process, analyse, sell, license or share this aggregated, anonymous, collective dataset with third parties — including institutional bodies, hedge funds, brokers or market makers — for commercial, research or business purposes, without owing the users any compensation. The Operator undertakes that any data shared or monetised will not, under any circumstances, enable the identification of a single trader or the exposure of their personal details.' },
    ],
  },
  {
    num: '4',
    title: 'Information Security, Storage & International Vendors',
    clauses: [
      { id: '4.1', label: 'Security standard', text: 'The Operator implements accepted technological security measures, including transport encryption (SSL) and encryption of API keys at rest in the database. However, the User acknowledges that there is no fully hermetic security solution on the internet and that the System is not fully immune to malicious intrusions.' },
      { id: '4.2', label: 'Transfer of information outside the country', text: 'The System’s servers and databases are operated and stored using leading international cloud providers (such as AWS / Google Cloud servers) and external software vendors, which may be located outside the State of Israel. The User expressly consents to the transfer and storage of information abroad.' },
    ],
  },
  {
    num: '5',
    title: 'User Rights, Account Deletion & Anonymous Data Carve-Out',
    clauses: [
      { id: '5.1', label: 'Right to delete identity', text: 'The User is entitled at any time to request the closure of their account and the deletion of their personal details from the System’s databases. Upon receipt of such a written request, the Operator will permanently delete the User’s name, email address and OAuth account, and disconnect their API connections.' },
      { id: '5.2', label: 'Carve-out for anonymous data', text: 'It is hereby clarified and emphasised that the deletion request does not apply to the trading journals, trade records, statistical data and discipline metrics that have already undergone anonymisation and been embedded in the System’s aggregated statistical dataset. This data is detached from the User’s identity, cannot be retrieved retroactively, and will remain the full and permanent property of the Operator for its commercial purposes even after account closure.' },
    ],
  },
  {
    num: '6',
    title: 'Marketing Communications & Newsletters',
    clauses: [
      { id: '6.1', label: 'Marketing consent (Israeli Communications Law)', text: 'When registering with the System or providing details as part of the OrcaInvestment community, the User grants their express and informed consent to receive notices, professional newsletters, market updates, event invitations and marketing content from the Operator or its business partners, to the email address they provided, in accordance with section 30A of the Israeli Communications Law (Telecommunications and Broadcasts), 5742-1982.' },
      { id: '6.2', label: 'Easy opt-out', text: 'The User may withdraw this consent at any time and remove themselves from the marketing list by clicking the unsubscribe link at the bottom of every marketing email or by contacting customer support. This opt-out does not apply to operational and essential system messages (such as changes to the Terms, password resets or critical system alerts).' },
    ],
  },
  {
    num: '7',
    title: 'Client-Side Storage (LocalStorage / Session Token)',
    clauses: [
      { id: '7.1', label: 'Authentication token', text: 'To maintain a persistent session (“Remember Me”), the System stores in the user’s browser (LocalStorage) a signed JWT issued by the authentication provider (Supabase Auth). This token grants access to the user’s own account only, is time-limited (approximately one hour before refresh), and contains no password or API keys.' },
      { id: '7.2', label: 'UI cache only', text: 'In addition to the token, the System may store in the browser UI preferences (language, theme, privacy mode), the active portfolio identifier, and transient form drafts. This cache is namespaced per-user, is wiped on sign-out, and contains no API keys, no passwords, and no full raw trading records.' },
      { id: '7.3', label: 'Physical device responsibility', text: 'The User acknowledges that physical access to their device/browser is their sole responsibility. A malicious actor with access to the unlocked device, or a browser extension with permission to read LocalStorage, may access the account. We recommend signing out when finished on shared machines and avoiding the installation of untrusted browser extensions.' },
      { id: '7.4', label: 'Revoking the session', text: 'Signing out of the System immediately deletes the token and the user’s cache from the browser and invalidates the token on the server side.' },
    ],
  },
  {
    num: '8',
    title: 'Governing Law & Exclusive Jurisdiction',
    clauses: [
      { id: '8.1', label: 'Governing law', text: 'These Terms and this Privacy Policy, their interpretation, enforcement and any matter arising from them, shall be governed exclusively by the laws of the State of Israel, without application of international conflict-of-laws rules.' },
      { id: '8.2', label: 'Exclusive jurisdiction', text: 'The competent courts of the Tel Aviv-Yafo district shall have sole, exclusive and final jurisdiction over any dispute, claim or legal matter connected with or arising from the use of the OrcaInvestment platform or this Privacy Policy.' },
    ],
  },
]

export function PrivacyPage() {
  const from = (useLocation().state as { from?: string } | null)?.from
  const authBack = from === '/login' ? 'Back to log in' : from === '/signup' ? 'Back to sign up' : null
  return (
    <PageShell>
      <section className="px-6 pt-32 pb-24 md:px-10">
        <div className="mx-auto max-w-[760px]">
          <Link to={authBack ? (from as string) : '/'} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} /> {authBack ?? 'Back to the app'}
          </Link>

          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas-deep text-ink"><ShieldCheck className="h-5 w-5" strokeWidth={1.85} /></span>
            <span className="micro text-ink-faint">Legal</span>
          </div>
          <h1 data-animate="title" className="mt-7 font-display text-[clamp(2.2rem,4.4vw,3.2rem)] leading-[1.05] font-bold text-ink">
            OrcaInvestment — Privacy Policy
          </h1>
          <p className="mt-4 text-[13.5px] font-medium text-ink-mute">
            Version <span className="tnum">v2.0_orca_investment</span> · Last updated: 2026-06-20
          </p>

          <div className="mt-8 flex gap-3 rounded-2xl border border-amber/30 bg-amber-soft/50 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" strokeWidth={2} />
            <p className="text-[14px] leading-relaxed text-ink-2">
              <strong className="font-semibold text-ink">Notice.</strong> The legally binding text of this
              policy is the Hebrew version. The English text below is provided for accessibility.
            </p>
          </div>

          <div className="mt-12">
            <h2 className="font-display text-[20px] font-bold text-ink">General</h2>
            <div className="mt-4 space-y-4 text-[15.5px] leading-[1.8] text-ink-2">
              <p>
                The OrcaInvestment platform (the “System” or the “Operator”) attaches the utmost importance to
                protecting users’ privacy. This Privacy Policy describes the types of information collected by
                the System during use, how it is processed, the essential use made of it for anonymous
                statistical research, and the terms under which it is stored.
              </p>
              <p>
                By registering with the System and connecting your trading accounts, you grant the Operator
                your express consent to the collection, processing and management of the information in
                accordance with the principles set out below.
              </p>
              <p className="text-[13.5px] text-ink-mute">
                Note: The Hebrew version of this Privacy Policy is the legally binding text. This English
                version is provided for accessibility only; in any inconsistency the Hebrew version prevails.
              </p>
            </div>
          </div>

          {SECTIONS.map((s) => (
            <div key={s.num} className="mt-12 border-t border-line pt-10">
              <h2 className="font-display text-[20px] font-bold text-ink">
                <span className="tnum mr-2 text-teal">{s.num}.</span> {s.title}
              </h2>
              {s.lead && <p className="mt-4 text-[15.5px] leading-[1.8] text-ink-2">{s.lead}</p>}
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
        </div>
      </section>
    </PageShell>
  )
}
