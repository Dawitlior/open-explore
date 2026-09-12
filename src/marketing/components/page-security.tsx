import type { ReactNode } from 'react'
import { ShieldCheck, Lock, KeyRound, Check, Ban, FileText, ArrowUpRight } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'

/* ============================================================================
   SECURITY & COMPLIANCE (/security) — deliberately NOT like the other pages.
   A serious, document-style long read: each chapter pins its heading to the
   side while the body scrolls past, the way a trust/legal document reads.
   Two isolated CTA sections close it (see the CTA architecture rule).
   ========================================================================== */

const SCOPES = [
  { label: 'Read your balances', on: true },
  { label: 'Read your closed trade history', on: true },
  { label: 'Withdraw or transfer funds', on: false },
  { label: 'Place or close trades', on: false },
  { label: 'Move assets between accounts', on: false },
]

function ScopeList() {
  return (
    <ul className="mt-6 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      {SCOPES.map((s) => (
        <li key={s.label} className="flex items-center justify-between gap-3 px-1 py-1.5">
          <span className={'text-[14px] ' + (s.on ? 'font-medium text-ink' : 'text-ink-faint line-through')}>{s.label}</span>
          {s.on ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-teal px-2 py-0.5 text-[10.5px] font-bold text-white"><Check className="h-3 w-3" strokeWidth={3} /> Allowed</span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-soft px-2 py-0.5 text-[10.5px] font-bold text-rose"><Ban className="h-3 w-3" strokeWidth={2.5} /> Blocked</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function SpecList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-ink">
          <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
          {i}
        </li>
      ))}
    </ul>
  )
}

/* Red-flag list — the warning signs when connecting any tool to a broker. */
function FlagList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-rose/20 bg-rose-soft/40 p-5">
      <div className="micro mb-3 text-rose">{title}</div>
      <ul className="flex flex-col gap-2.5">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose text-white"><Ban className="h-2.5 w-2.5" strokeWidth={2.5} /></span>
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

type Chapter = { n: string; kicker: string; title: string; body: ReactNode }
const CHAPTERS: Chapter[] = [
  {
    n: '01',
    kicker: 'Before Orca',
    title: 'What connecting a broker actually means',
    body: (
      <>
        <p>
          Long before any journal or analytics tool enters the picture, every trader who wants software to
          see their account faces the same small, quiet decision — and most people click straight through it.
          To let an app read your trades, you don’t hand over your username and password. You create an
          <strong className="font-semibold text-ink"> API key</strong>.
        </p>
        <p>
          An API key is a pair of secret strings — a public key and a private secret — that your broker or
          exchange generates on your behalf. Think of it as a delegated, revocable passcode: it lets one
          specific program talk to your account through the broker’s API, without ever knowing your real
          login or your password. You can create several, give each a name, and switch any of them off at any
          time, from the broker’s side, without affecting anything else.
        </p>
        <p>
          The part that decides whether this is safe or reckless is not the key itself — it’s the
          <em> permissions</em> you attach to it. Every key carries a scope: read data, place trades, withdraw
          funds, move money between accounts. The broker lets you choose which of those the key is allowed to
          do. That single choice, made in about five seconds and rarely read twice, is where almost all of the
          risk in this entire process actually lives.
        </p>
      </>
    ),
  },
  {
    n: '02',
    kicker: 'Where it goes wrong',
    title: 'The permissions nobody reads',
    body: (
      <>
        <p>
          Here is how it goes wrong, and it goes wrong constantly. A tool promises a two-minute setup and
          asks you to paste in a key with full access — read, trade, <em>and</em> withdraw — “so everything
          just works.” It’s faster for them to build and faster for you to click. It is also the single most
          dangerous thing you can do with a trading account.
        </p>
        <p>
          A full-access key is a bearer token: whoever holds it can act as you. If that key ever leaks — from
          the tool’s database, an unencrypted log file, a screenshot pasted into a support chat, a config file
          pushed to a public repo — an attacker needs neither your password nor your 2FA. If withdrawal
          permission was enabled “just in case,” they can simply move your funds out. This is, by a wide
          margin, the most common way traders lose money to “a platform,” and it almost never involves
          breaking any encryption. It involves a key that was handed a power it never needed.
        </p>
        <p>
          The warning signs are remarkably consistent. Once you’ve seen them, you can’t unsee them — and any
          single one of them is a reason to stop and reconsider before you connect anything.
        </p>
        <FlagList
          title="Red flags when connecting any tool"
          items={[
            'It asks for withdrawal or trading permission it never actually uses',
            'It tells you to turn OFF the broker’s IP allowlist “to avoid errors”',
            'It wants the key pasted into a chat, a form, or a spreadsheet',
            'There’s no clear way to see what it can access, or to revoke it',
            'Its “security” page is a vague banner, not a description of controls',
          ]}
        />
      </>
    ),
  },
  {
    n: '03',
    kicker: 'The standard',
    title: 'How it should be done',
    body: (
      <>
        <p>
          Done properly, the whole thing becomes almost boring — which is exactly the point. The tool asks
          for the least it can possibly function with: permission to <strong className="font-semibold text-ink">read</strong>, and
          nothing more. If a feature doesn’t need withdrawal or trading, that permission is never in the
          request, so it can never be misused, leaked, or turned against you later.
        </p>
        <p>
          The key itself is then treated as a secret for its entire life: encrypted the moment it arrives,
          stored in an isolated vault kept apart from ordinary data, encrypted again with a key unique to your
          account, and never written to a log or shown back to a human. Access is scoped, audited, and
          revocable in one click — by you, from the broker, at any moment. A professional setup also leans on
          the broker’s own defences, like IP allowlisting, instead of asking you to weaken them.
        </p>
        <p>
          And it tells you all of this in plain language rather than hiding behind a “bank-grade security”
          sticker. Transparency is itself a control: a platform willing to write down exactly what it can and
          cannot do is a platform that has genuinely thought about it. Everything below is how Orca does each
          of these — specifically, and without the marketing gloss.
        </p>
      </>
    ),
  },
  {
    n: '04',
    kicker: 'The permission model',
    title: 'Read-only, by design',
    body: (
      <>
        <p>
          When you connect a broker or exchange, Orca asks for a single kind of credential — an API key
          scoped to <strong className="font-semibold text-ink">read</strong>. It can retrieve your balances
          and your closed trade history, and that is the entire extent of its reach into your account.
        </p>
        <p>
          The permissions that let software move money — withdraw, transfer, or place and close orders — are
          never requested during setup. Because they are never granted, they can never be exercised: not by
          us, not by a bug in our code, and not by anyone who managed to compromise our systems. The safest
          permission is the one that was never asked for.
        </p>
        <p>
          This is a structural guarantee, not a policy promise. A policy can be quietly changed; a permission
          that was never issued cannot be switched on after the fact. And because the connection is entirely
          in your hands, revoking the key on your broker’s side simply stops Orca from receiving new data —
          nothing else about your account is touched or affected.
        </p>
        <ScopeList />
      </>
    ),
  },
  {
    n: '05',
    kicker: 'Data in transit & at rest',
    title: 'Encrypted at every layer',
    body: (
      <>
        <p>
          Every byte that moves between your browser, our services and your broker travels over TLS 1.3, the
          current transport-security standard. Nothing crosses the network in the clear, and sensitive fields
          are never written to logs in a form that could later expose them.
        </p>
        <p>
          At rest, your data is stored under AES-256 encryption on infrastructure governed by least-privilege
          access — each service can reach only the data it strictly needs, and no more. Backups are encrypted
          to the same standard, and are themselves access-controlled and rotated on a schedule.
        </p>
        <p>
          Encryption in transit and at rest is the baseline, not the whole story. It is paired with network
          segmentation and strict access controls, so that a weakness in any one layer does not quietly
          expose the layers beneath it.
        </p>
        <SpecList items={['TLS 1.3 in transit', 'AES-256 at rest', 'Per-account key vault', 'Hard tenant isolation']} />
      </>
    ),
  },
  {
    n: '06',
    kicker: 'Key custody',
    title: 'Your keys live in isolation',
    body: (
      <>
        <p>
          Read-only API keys are never stored in plaintext and never sit beside ordinary application data.
          They live in a segregated vault and are encrypted with per-account keys, so a single compromise can
          never cascade from one user to the next.
        </p>
        <p>
          Access to that vault is tightly scoped and audited. The application reaches for a key only at the
          moment it needs to sync, and even inside Orca no engineer can read your raw keys — the system is
          deliberately built so that the most sensitive material stays sealed from the people who operate it.
        </p>
        <p>
          Isolation is enforced per account at every layer: one tenant’s data, keys and cache can never be
          reached from another’s session. The blast radius of any single failure is kept as small as the
          architecture allows, by default rather than by exception.
        </p>
      </>
    ),
  },
  {
    n: '07',
    kicker: 'Your data, your control',
    title: 'You own it — and can leave with it',
    body: (
      <>
        <p>
          Your journal is yours. You can export every trade to CSV at any time, and you can delete your
          account whenever you choose — deletion permanently erases your personal data rather than hiding it
          behind a flag.
        </p>
        <p>
          We do not sell your personal data, and we do not share it with third parties for advertising. Our
          data-handling is built around GDPR data-rights principles: the right to access your data, the right
          to take it with you, and the right to have it erased.
        </p>
        <p>
          Aggregated, fully anonymised statistics that can never identify an individual trader are handled
          separately, and exactly how is spelled out in our Privacy Policy. Your identity and your raw records
          stay under your control.
        </p>
      </>
    ),
  },
  {
    n: '08',
    kicker: 'Standards & review',
    title: 'Built to standards, and reviewed',
    body: (
      <>
        <p>
          Orca’s controls are designed around modern SaaS security practice and GDPR principles. The
          platform’s security posture is reviewed by an external party, and the summary is published for you
          to read rather than described in vague marketing language.
        </p>
        <p>
          We treat security as a living process, not a certificate on a wall. Controls are revisited as the
          platform grows, as new integrations are added, and as the threat landscape shifts — the review is a
          checkpoint on an ongoing process, not a finish line.
        </p>
        <p>
          The platform is in active development. Where a control is still maturing, we say so plainly rather
          than implying a level of assurance we have not yet reached — the same honesty you’ll find in our
          public accessibility statement.
        </p>
      </>
    ),
  },
  {
    n: '09',
    kicker: 'Availability & disclosure',
    title: 'Monitored, and honest about limits',
    body: (
      <>
        <p>
          The platform is monitored continuously, and we maintain a responsible-disclosure channel so
          security researchers can report issues directly. Confirmed vulnerabilities are triaged and fixed on
          priority, in order of the risk they carry.
        </p>
        <p>
          No system on the internet is fully hermetic, and we won’t pretend otherwise. What we can stand
          behind is an architecture that limits blast radius by default — read-only access, key isolation,
          encryption and tenant separation — so that even a bad day cannot cost you your capital.
        </p>
        <p>
          If something does go wrong, the design ensures the worst case is bounded. Because Orca can only ever
          read, no incident on our side can move, withdraw or trade a single unit of your money.
        </p>
      </>
    ),
  },
]

/* Serious document header — restrained, not the marketing hero of other pages. */
function SecurityHeader() {
  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-8 md:px-10">
      <HoloGlow className="!inset-x-[28%] !top-[8%] !bottom-auto !h-[240px]" opacity={0.22} blur={90} />
      <div className="relative mx-auto max-w-[1080px]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-indigo text-white elev-2">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="micro text-ink-faint">Security &amp; Compliance</span>
        </div>
        <h1 data-animate="title" className="mt-7 max-w-[820px] font-display text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.05] font-bold text-ink">
          How your data and your capital stay yours.
        </h1>
        <p data-reveal className="mt-5 max-w-[600px] text-[17px] leading-[1.7] text-ink-mute">
          This is the long version — the actual controls, in plain language, one chapter at a time. Read it
          top to bottom, or jump to what you care about. Nothing here is marketing.
        </p>
        <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6">
          {['Read-only by design', 'Encrypted end to end', 'You own your data'].map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <Check className="h-4 w-4 text-teal" strokeWidth={2.5} /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* The long read — sticky side heading per chapter, body flows past it. */
function SecurityLongRead() {
  return (
    <section className="px-6 md:px-10">
      <div className="mx-auto max-w-[920px]">
        {CHAPTERS.map((ch) => (
          <div key={ch.n} className="grid gap-4 border-t border-line py-12 md:grid-cols-[168px_minmax(0,1fr)] md:gap-10 md:py-16">
            {/* small, quiet side heading — a label, not a display title */}
            <div className="md:sticky md:top-28 md:self-start">
              <div className="flex items-center gap-2">
                <span className="tnum text-[11px] font-bold text-teal">{ch.n}</span>
                <span className="h-px w-5 bg-teal/40" />
              </div>
              <div className="micro mt-2 text-ink-faint">{ch.kicker}</div>
              <h2 className="mt-1 text-[14.5px] leading-snug font-semibold text-ink">{ch.title}</h2>
            </div>
            <div className="max-w-[640px] space-y-4 text-[15.5px] leading-[1.8] text-ink-2">
              {ch.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── CTA #1 — the whitepaper. A document/dossier, angle: proof for skeptics. ── */
function WhitepaperCTA() {
  return (
    <section className="px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-[1000px] items-center gap-10 overflow-hidden rounded-[28px] border border-line bg-[#0f1720] p-8 md:grid-cols-[1.3fr_1fr] md:p-12">
        <div>
          <span className="micro font-semibold text-teal/90">Don’t take our word for it</span>
          <h2 className="mt-3 font-display text-[clamp(1.6rem,2.8vw,2.2rem)] leading-[1.15] font-bold text-white">
            Read the independent security review.
          </h2>
          <p className="mt-4 max-w-[440px] text-[14.5px] leading-relaxed text-white/70">
            The full write-up of how Orca handles keys, encryption, isolation and data — the same document
            our own engineers work from. No marketing, just the controls.
          </p>
          <a
            href="/orca-security-audit.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#0f1720] transition-transform hover:-translate-y-0.5"
          >
            <FileText className="h-4 w-4" strokeWidth={2} />
            Open the security review
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.25} />
          </a>
        </div>
        <div className="relative mx-auto w-full max-w-[240px]">
          <div className="rotate-[-4deg] rounded-xl bg-white/5 p-3 shadow-2xl ring-1 ring-white/10">
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-soft text-teal"><ShieldCheck className="h-4 w-4" strokeWidth={2} /></span>
                <span className="text-[10px] font-bold tracking-wide text-ink uppercase">Security review</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {[100, 92, 84, 96, 70, 88, 60].map((w, i) => (
                  <span key={i} className="block h-1.5 rounded bg-[#e7e9ee]" style={{ width: w + '%' }} />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 text-[9px] font-semibold text-teal">
                <Check className="h-3 w-3" strokeWidth={3} /> Reviewed · PDF
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #2 — closing. Calm reassurance, angle: nothing to lose by starting. ── */
function ReadOnlyStartCTA() {
  return (
    <section className="px-6 py-24 text-center md:px-10 md:py-32">
      <div className="relative mx-auto max-w-[720px]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface elev-2">
          <Lock className="h-7 w-7 text-teal" strokeWidth={1.75} />
        </span>
        <h2 data-animate="title" className="mt-6 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-bold text-ink">
          The safest way to try it is to try it.
        </h2>
        <p data-reveal className="mx-auto mt-4 max-w-[500px] text-[15.5px] leading-relaxed text-ink-mute">
          Connect a broker in read-only and watch your history flow in. Your keys can’t move a cent — so
          there is, quite literally, nothing to lose.
        </p>
        <div data-reveal className="mt-8">
          <CTA href="/signup">Connect read-only</CTA>
        </div>
      </div>
    </section>
  )
}

export function SecurityPage() {
  return (
    <PageShell>
      <SecurityHeader />
      <SecurityLongRead />
      <WhitepaperCTA />
      <ReadOnlyStartCTA />
    </PageShell>
  )
}
