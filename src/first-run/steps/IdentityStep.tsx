import { useEffect, useState } from 'react'
import type { StepProps } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { TextField } from '../components/ui'

export function IdentityStep({ answers, update, onValidityChange }: StepProps) {
  const t = COPY.onboarding.identity
  const [touched, setTouched] = useState(false)
  const valid = answers.fullName.trim().length >= 2
  useEffect(() => { onValidityChange?.(valid) }, [valid, onValidityChange])
  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="fullName"
        label={t.label}
        placeholder={t.ph}
        value={answers.fullName}
        autoFocus
        required
        onChange={(v) => { update({ fullName: v }); if (!touched) setTouched(true) }}
        error={touched && !valid ? t.err : undefined}
      />
      <p className="text-[13px] text-ink-faint">{t.help}</p>
    </div>
  )
}
