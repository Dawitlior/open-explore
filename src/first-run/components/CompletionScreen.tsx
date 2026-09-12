import type { CompletionScreenProps } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { Button, ScreenShell } from './ui'

export function CompletionScreen({ lang, fullName, onEnterApp }: CompletionScreenProps) {
  const t = COPY.completion
  return (
    <ScreenShell lang={lang} title={<span className="flex flex-col items-center gap-5 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-white">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span>{t.title(fullName)}</span>
    </span>}>
      <div className="flex flex-col items-center gap-7 text-center">
        <p className="max-w-[420px] text-[15px] leading-relaxed text-ink-mute">{t.sub}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {t.pills.map((p) => (
            <span key={p} className="rounded-full border border-line bg-canvas-deep/60 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2">{p}</span>
          ))}
        </div>
        <Button onClick={onEnterApp} full>{t.enter}</Button>
      </div>
    </ScreenShell>
  )
}
