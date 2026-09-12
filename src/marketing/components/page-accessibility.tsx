import { Link } from 'react-router-dom'
import { Accessibility, ArrowLeft, Mail, Check, AlertTriangle } from 'lucide-react'
import { PageShell } from './page-shell'

/* ============================================================================
   ACCESSIBILITY STATEMENT (/accessibility) — clean legal-document layout in the
   site's light palette. Text kept verbatim.
   ========================================================================== */

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3 text-[15.5px] leading-[1.75] text-ink-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Heading({ num, children }: { num: string; children: string }) {
  return (
    <h2 className="font-display text-[20px] font-bold text-ink">
      <span className="tnum mr-2 text-teal">{num}.</span> {children}
    </h2>
  )
}

export function AccessibilityPage() {
  return (
    <PageShell>
      <section className="px-6 pt-32 pb-24 md:px-10">
        <div className="mx-auto max-w-[760px]">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to the app
          </Link>

          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas-deep text-ink"><Accessibility className="h-5 w-5" strokeWidth={1.85} /></span>
            <span className="micro text-ink-faint">Accessibility</span>
          </div>
          <h1 data-animate="title" className="mt-7 font-display text-[clamp(2rem,4.2vw,3rem)] leading-[1.06] font-bold text-ink">
            Official Accessibility Statement — Orca Investment Platform
          </h1>
          <p className="mt-4 text-[13.5px] font-medium text-ink-mute">Last updated: June 17, 2026</p>

          <p className="mt-8 text-[15.5px] leading-[1.8] text-ink-2">
            The operators of the Orca Investment platform and community (hereinafter: “the site administration”)
            consider it of utmost importance to deliver their services equitably, respectfully and accessibly
            to the public at large, including people with disabilities. We invest resources and effort to adapt
            the website and the digital platform to the requirements of the law, believing that every person
            has an equal right to independent and effective use of the digital space.
          </p>

          {/* 1 */}
          <div className="mt-12 border-t border-line pt-10">
            <Heading num="1">Compliance Status</Heading>
            <div className="mt-4 space-y-4 text-[15.5px] leading-[1.8] text-ink-2">
              <p>The website and platform are in active development and beta deployment.</p>
              <p>
                Digital accessibility adaptations are performed in accordance with the Israeli Equal Rights for
                People with Disabilities Law, 5758-1998 and the regulations enacted under it, as well as the
                recommendations of the Israeli Standard (IS 5568) for web content accessibility at Level AA.
                This standard adopts the W3C Web Content Accessibility Guidelines (WCAG) 2.1.
              </p>
            </div>
            <div className="mt-5 flex gap-3 rounded-2xl border border-amber/30 bg-amber-soft/50 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" strokeWidth={2} />
              <p className="text-[14px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Legal clarification:</strong> as of the date of this
                statement, a dedicated automated accessibility plug-in has not yet been integrated into the
                platform. However, the platform’s core technological foundations were designed and developed
                from the outset to embed structural elements that support assistive technologies.
              </p>
            </div>
          </div>

          {/* 2 */}
          <div className="mt-12 border-t border-line pt-10">
            <Heading num="2">Native Core Accessibility Features</Heading>
            <p className="mt-4 text-[15.5px] leading-[1.8] text-ink-2">
              Despite the absence of an external accessibility plug-in, the following structural components are
              implemented in the system’s source code:
            </p>
            <Bullets
              items={[
                'Native Bidirectionality (Semantic RTL/LTR): the platform was built with first-class support for right-to-left and left-to-right reading directions. All content, labels and controls are based on author-curated, translated source code that prevents parsing errors by screen readers.',
                'UI Density & Font Scale: the system includes a dynamic engine that lets users select interface density and font scale within an 80%–130% range using relative units, in a manner that prevents layout breakage, text overlap or visual distortion.',
                'OS Zoom Compatibility: although pinch-to-zoom has been temporarily disabled in the mobile build in order to prevent critical trading execution errors, the system is fully compatible with the native zoom tools of operating systems and browsers.',
              ]}
            />
          </div>

          {/* 3 */}
          <div className="mt-12 border-t border-line pt-10">
            <Heading num="3">Known Accessibility Gaps &amp; Roadmap</Heading>
            <p className="mt-4 text-[15.5px] leading-[1.8] text-ink-2">
              The site administration runs a continuous process of accessibility monitoring and improvement.
              The following items are not yet fully accessible at this stage:
            </p>
            <Bullets
              items={[
                'Keyboard navigation: some elements of the dynamic menus are not fully navigable by keyboard alone (keyboard focus traps).',
                'Alternative text: real-time financial charts, market regime indicators and dynamic visualisations do not yet include full descriptive narration for users with visual impairments.',
                'Accessibility toolbar: integration of a dedicated accessibility toolbar (contrast adjustments, color-blind palettes and text-to-speech) is scheduled for full deployment during the third quarter of 2026.',
              ]}
            />
          </div>

          {/* 4 */}
          <div className="mt-12 border-t border-line pt-10">
            <Heading num="4">Physical Accessibility / Customer Service</Heading>
            <p className="mt-4 text-[15.5px] leading-[1.8] text-ink-2">
              The service is delivered entirely digitally; there is no walk-in office. Customer support
              channels operate exclusively through written digital means (email and text-based community
              platforms), which allow tailored responses for users with hearing or speech impairments.
            </p>
          </div>

          {/* 5 */}
          <div className="mt-12 border-t border-line pt-10">
            <Heading num="5">Accessibility Coordinator &amp; How to Report Issues</Heading>
            <p className="mt-4 text-[15.5px] leading-[1.8] text-ink-2">
              If, while using the platform, you encounter a difficulty, content that is not accessible, or a
              component that does not meet the standard, please contact us so we can address the issue as soon
              as possible.
            </p>
            <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
              <div className="text-[14px] font-bold text-ink">Orca Investment — Support &amp; Accessibility</div>
              <a href="mailto:innovationai@mail.com" className="mt-2 inline-flex items-center gap-2 text-[14px] font-medium text-indigo transition-colors hover:text-indigo-deep">
                <Mail className="h-4 w-4" strokeWidth={2} /> innovationai@mail.com
              </a>
              <div className="mt-1.5 text-[13px] text-ink-mute">Channel: digital correspondence only.</div>
            </div>
            <p className="mt-6 text-[15.5px] leading-[1.8] text-ink-2">
              When contacting us about accessibility, please include the following information so we can handle
              your request as effectively as possible:
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {[
                'A description of the issue you encountered.',
                'The page or component where you attempted the action.',
                'The browser and operating system you were using.',
                'The type of assistive technology in use, if any (e.g. screen readers such as NVDA / JAWS).',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15.5px] leading-[1.75] text-ink-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
