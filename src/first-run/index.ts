/* First-run UI package — presentation-only. Import these into the host app and
   wire props/callbacks (auth, saving, routing) externally. */
export * from './first-run.types'
export { AuthScreen } from './components/AuthScreen'
export { LegalStep } from './components/LegalStep'
export { OnboardingFlow } from './components/OnboardingFlow'
export { OnboardingProgress } from './components/OnboardingProgress'
export { CompletionScreen } from './components/CompletionScreen'
export { FirstRunDemo } from './FirstRunDemo'
