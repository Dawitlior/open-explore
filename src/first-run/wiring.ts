/* ============================================================================
   FIRST-RUN WIRING — the glue between the presentation-only first-run UI and the
   product's real backend. Mirrors the exact contracts the old Auth.tsx /
   LegalGate / OnboardingWizard used, so the graft is behaviourally identical:
     • Google OAuth  → lovable.auth on Lovable/localhost hosts, else supabase
     • Legal accept  → user_preferences (legal/privacy_accepted…) + consent_log
     • Onboarding    → scopedStorage keys (name, done, trader-mind prompt)
   Theme + risk persistence use hooks and live in <FirstRunGate>, not here.
   ========================================================================== */
import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import { scopedStorage } from '@/lib/scoped-storage'
import { getSetting, setSetting } from '@/lib/storage'
import type { Answers } from './first-run.types'

const isLovableHost = () =>
  /(^|\.)lovable\.app$|(^|\.)lovableproject\.com$|localhost|127\.0\.0\.1/.test(window.location.hostname)

/** Start Google OAuth — identical behaviour to the product's old Auth.tsx. */
export async function signInWithGoogle(): Promise<void> {
  try { localStorage.setItem('orca-pending-consent', '1') } catch { /* noop */ }
  if (!isLovableHost()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth`, queryParams: { prompt: 'select_account' } },
    })
    if (error) throw error
    return // browser navigates away to Google
  }
  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
    extraParams: { prompt: 'select_account' },
  })
  if (result?.error) throw result.error
  // On success the helper sets the session; onAuthStateChange takes over.
}

export type LegalStatus = { terms: boolean; privacy: boolean }

const legalCacheKey = (uid: string, kind: 'legal' | 'privacy') => `orca:${kind}-accepted:${uid}`

/** Read whether Terms + Privacy are already signed (cache-seeded, DB-authoritative). */
export async function readLegalStatus(uid: string): Promise<LegalStatus> {
  let terms = false
  let privacy = false
  try {
    terms = localStorage.getItem(legalCacheKey(uid, 'legal')) === '1'
    privacy = localStorage.getItem(legalCacheKey(uid, 'privacy')) === '1'
  } catch { /* noop */ }
  const { data, error } = await supabase
    .from('user_preferences')
    .select('legal_accepted, privacy_accepted')
    .eq('user_id', uid)
    .maybeSingle()
  if (!error && data) {
    terms = !!data.legal_accepted
    privacy = !!data.privacy_accepted
    try {
      if (terms) localStorage.setItem(legalCacheKey(uid, 'legal'), '1')
      if (privacy) localStorage.setItem(legalCacheKey(uid, 'privacy'), '1')
    } catch { /* noop */ }
  }
  return { terms, privacy }
}

async function writeConsentRow(uid: string, kind: 'terms' | 'privacy', version: string) {
  try {
    await supabase.from('consent_log').insert({
      user_id: uid,
      version,
      choices: { [kind]: true } as Record<string, boolean>,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    })
  } catch { /* audit is non-blocking */ }
}

/** Record a Terms/Privacy signature — same fields the old LegalGate wrote. */
export async function acceptLegal(uid: string, kind: 'terms' | 'privacy', version: string): Promise<void> {
  const nowIso = new Date().toISOString()
  const patch: Record<string, unknown> = { user_id: uid }
  if (kind === 'terms') {
    patch.legal_accepted = true
    patch.legal_accepted_at = nowIso
    patch.legal_version = version
  } else {
    patch.privacy_accepted = true
    patch.privacy_accepted_at = nowIso
    patch.privacy_version = version
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('user_preferences').upsert(patch as any, { onConflict: 'user_id' })
  if (error) throw error
  try { localStorage.setItem(legalCacheKey(uid, kind === 'terms' ? 'legal' : 'privacy'), '1') } catch { /* noop */ }
  void writeConsentRow(uid, kind, version)
}

/* ── Onboarding persistence — local keys, identical to the old OnboardingWizard. */
const ONBOARDING_DONE_KEY = 'orca-onboarding-done'
const NAME_KEY = 'orca-user-name'
const PROFILE_KEY = 'orca-user-profile'
const TRADER_MIND_PENDING_KEY = 'orca-trader-mind-prompt-pending'

export function isOnboardingDone(): boolean {
  return scopedStorage.getSync(ONBOARDING_DONE_KEY) === '1'
}

/** Cache only the "done" flag locally (used when the cloud says a returning
   user on a new device already onboarded — no need to re-run the flow). */
export function markOnboardingDoneLocal(): void {
  void scopedStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

/** Cross-device onboarding flag — stored in the cloud settings store (same one
   that syncs theme/lang), so a returning user on a new device is NOT re-onboarded.
   Degrades to false on any error (falls back to the local flag). */
export async function isOnboardingDoneCloud(): Promise<boolean> {
  try { return (await getSetting<string>('onboarding_completed')) === '1' } catch { return false }
}

export async function markOnboardingCompleteCloud(): Promise<void> {
  try { await setSetting('onboarding_completed', '1') } catch { /* non-blocking */ }
}

/** Persist the local onboarding facts (name, experience, done flag) exactly as
   the old wizard did, so the rest of the product keeps working unchanged. */
export function persistOnboardingLocal(answers: Answers): void {
  void scopedStorage.setItem(ONBOARDING_DONE_KEY, '1')
  if (answers.fullName.trim()) void scopedStorage.setItem(NAME_KEY, answers.fullName.trim())
  if (answers.experienceLevel) void scopedStorage.setItem(PROFILE_KEY, answers.experienceLevel)
  // Trader Mind is opt-in from the sidebar — never auto-launched after onboarding.
  void scopedStorage.removeItem(TRADER_MIND_PENDING_KEY)
}
