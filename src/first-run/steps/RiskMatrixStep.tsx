import { useEffect } from 'react'
import type { StepProps, RiskMatrix } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { cx } from '../components/ui'

/* Risk-matrix step — captures the four risk limits that feed the product's Risk
   Engine (mirrors user_preferences: risk_per_trade_default, daily/weekly/monthly
   _risk_limit). Presentation-only: the controller persists on save. */
/* USD budgets — defaults mirror the product's DEFAULT_PREFS exactly, so a user
   who accepts as-is lands on the same limits the old wizard produced. */
const FIELDS: { key: keyof RiskMatrix; def: number }[] = [
  { key: 'perTrade', def: 20 },
  { key: 'daily', def: 100 },
  { key: 'weekly', def: 400 },
  { key: 'monthly', def: 1500 },
]

export function RiskMatrixStep({ answers, update, onValidityChange }: StepProps) {
  const t = COPY.onboarding.riskMatrix
  const risk = answers.risk

  // Prefill sensible defaults once, so the step is valid and easy to accept.
  useEffect(() => {
    if (FIELDS.every((f) => risk[f.key] === null)) {
      update({ risk: { perTrade: 20, daily: 100, weekly: 400, monthly: 1500 } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const valid = FIELDS.every((f) => {
    const v = risk[f.key]
    return typeof v === 'number' && Number.isFinite(v) && v > 0
  })
  useEffect(() => { onValidityChange?.(valid) }, [valid, onValidityChange])

  const setField = (key: keyof RiskMatrix, raw: string) => {
    const n = raw === '' ? null : Number(raw)
    update({ risk: { ...risk, [key]: n } })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key }) => {
          const v = risk[key]
          const bad = v !== null && (!Number.isFinite(v as number) || (v as number) <= 0)
          return (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold text-ink">{t[key]}</span>
              <span className="relative flex items-center">
                <span className="pointer-events-none absolute left-4 text-[15px] font-semibold text-ink-faint">{t.unit}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={v === null ? '' : String(v)}
                  onChange={(e) => setField(key, e.target.value)}
                  className={cx(
                    'min-h-[48px] w-full rounded-lg border bg-surface pl-8 pr-4 text-[15px] text-ink outline-none transition-colors focus:ring-4 focus:ring-indigo/15',
                    bad ? 'border-rose focus:border-rose' : 'border-line focus:border-indigo/60',
                  )}
                />
              </span>
              <span className="text-[12px] text-ink-mute">{t[`${key}Help` as keyof typeof t]}</span>
            </label>
          )
        })}
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-faint">{t.hint}</p>
      {!valid && <p className="text-[12.5px] font-medium text-rose">{t.err}</p>}
    </div>
  )
}
