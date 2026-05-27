/**
 * Billing enforcement flag.
 *
 * While the SaaS funnel is still being built, we want users to FREELY
 * navigate between Standard / Advanced / Ultimate features so we can
 * validate every surface. The lock badges still render (so the UX is
 * visible and testable), but <TierGate> does NOT block access.
 *
 * Flip to `true` on launch day to activate hard gating.
 */
export const ENFORCE_TIER_GATES = false;
