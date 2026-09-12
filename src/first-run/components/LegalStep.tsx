import { useState } from 'react'
import type { LegalStepProps } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { Button, ScreenShell, StatusBanner, cx } from './ui'

export function LegalStep({ lang, kind, title, sections, versionLabel, status, errorMessage, progressLabel, onAccept, onBack }: LegalStepProps) {
  const t = COPY.legal
  const [agreed, setAgreed] = useState(false)
  const submitting = status === 'submitting' || status === 'loading'
  const agreeLabel = kind === 'terms' ? t.agreeTerms : t.agreePrivacy

  return (
    <ScreenShell
      lang={lang}
      wide
      title={title}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t.read}</span>
          {(versionLabel || progressLabel) && (
            <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-faint">
              {progressLabel && <span className="rounded-full bg-canvas-deep px-2 py-0.5 font-semibold">{progressLabel}</span>}
              {versionLabel && <span>{t.version} {versionLabel}</span>}
            </span>
          )}
        </span>
      }
      footer={
        <div className="flex flex-col gap-3">
          {status === 'error' && (
            <StatusBanner tone="error" onRetry={onAccept} retryLabel={t.retry}>{errorMessage ?? t.saveErr}</StatusBanner>
          )}
          <label className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors', agreed ? 'border-indigo bg-indigo-soft' : 'border-line bg-surface hover:border-indigo/40')}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-indigo" aria-describedby="consent-note" />
            <span className="text-[13.5px] font-medium text-ink">{agreeLabel}</span>
          </label>
          <p id="consent-note" className="text-[11.5px] text-ink-faint">{t.consent}</p>
          <div className="flex items-center justify-between gap-3">
            {onBack ? <Button variant="ghost" onClick={onBack}>{t.back}</Button> : <span />}
            <Button onClick={onAccept} disabled={!agreed} loading={submitting}>
              {submitting ? t.saving : t.accept}
            </Button>
          </div>
        </div>
      }
    >
      {/* scrollable legal body — content comes from props, never hardcoded as truth */}
      <div className="relative">
        <div className="legal-scroll max-h-[46vh] overflow-y-auto rounded-xl border border-line bg-canvas/60 p-5 pr-4">
          {sections.map((s, i) => (
            <section key={i} className={i > 0 ? 'mt-6' : ''}>
              {s.heading && <h2 className="font-display text-[15px] font-bold text-ink">{s.heading}</h2>}
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="mt-2 text-[13.5px] leading-[1.7] text-ink-2">{p}</p>
              ))}
              {s.bullets && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-[13.5px] leading-[1.6] text-ink-2">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <span className="mt-2 block text-center text-[11.5px] text-ink-faint">{t.scrollHint}</span>
      </div>
    </ScreenShell>
  )
}
