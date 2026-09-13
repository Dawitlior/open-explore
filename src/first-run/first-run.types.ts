/* ============================================================================
   FIRST-RUN UI — shared types (UI-only handoff package).
   Every screen is a presentation component: it receives data + a `status`
   through props and reports intent through callbacks. It never knows how auth,
   saving or permissions actually work. Lovable wires those after handoff.
   ========================================================================== */

export type Lang = 'he' | 'en'

/** Visual status pushed in from the outside — drives loading/error/success UI. */
export type UiStatus = 'idle' | 'loading' | 'submitting' | 'success' | 'error'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

/** Color palette ids — mirror the product's ThemeId (platinum = Light · Indigo). */
export type ColorTheme = 'midnight' | 'blue' | 'graphite' | 'platinum'

/** Risk matrix — mirrors the product's user_preferences risk fields (percent). */
export type RiskMatrix = {
  perTrade: number | null
  daily: number | null
  weekly: number | null
  monthly: number | null
}

/** The onboarding answer shape. Nullable fields are unset until chosen. */
export type Answers = {
  fullName: string
  communityMember: boolean | null
  experienceLevel: ExperienceLevel | null
  colorTheme: ColorTheme | null
  risk: RiskMatrix
  commitmentAccepted: boolean
}

export const EMPTY_ANSWERS: Answers = {
  fullName: '',
  communityMember: null,
  experienceLevel: null,
  colorTheme: null,
  risk: { perTrade: null, daily: null, weekly: null, monthly: null },
  commitmentAccepted: false,
}

/** A block of legal copy, injected from the outside (never hardcoded as truth). */
export type LegalSection = {
  heading?: string
  paragraphs?: string[]
  bullets?: string[]
}

export type LegalKind = 'terms' | 'privacy'

/* ── component contracts (from the handoff spec) ─────────────────────────── */

export type AuthScreenProps = {
  lang: Lang
  status: UiStatus
  errorMessage?: string
  offline?: boolean
  onGoogleSignIn(): void
  onBack?(): void
  onOpenLegal?(kind: LegalKind): void
}

export type LegalStepProps = {
  lang: Lang
  kind: LegalKind
  title: string
  sections: LegalSection[]
  versionLabel?: string
  status: UiStatus
  errorMessage?: string
  /** e.g. "1 of 2" — optional progress hint shown in the header. */
  progressLabel?: string
  onAccept(): void
  onBack?(): void
}

export type OnboardingStepId =
  | 'identity'
  | 'experience'
  | 'palette'
  | 'riskMatrix'
  | 'briefing'
  | 'commitment'

export type OnboardingFlowProps = {
  lang: Lang
  status: UiStatus
  errorMessage?: string
  initialStep?: OnboardingStepId
  initialAnswers?: Partial<Answers>
  /** Optional real QR for the community step; a marked placeholder is shown if absent. */
  communityQrSrc?: string
  onSaveStep(step: OnboardingStepId, answers: Partial<Answers>): void
  onComplete(answers: Answers): void
  onBackToStart?(): void
}

export type CompletionScreenProps = {
  lang: Lang
  fullName?: string
  onEnterApp(): void
}

/** Props each individual onboarding step receives from the flow orchestrator. */
export type StepProps = {
  lang: Lang
  answers: Answers
  update(patch: Partial<Answers>): void
  /** true once the step's own validation passes — the flow uses it to gate Next. */
  onValidityChange?(valid: boolean): void
  communityQrSrc?: string
}
