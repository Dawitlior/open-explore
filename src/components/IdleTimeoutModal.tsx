// Screen Lock removed per Phase 1 architectural cleanup.
// Component kept as a no-op shim so any lingering imports compile until they're pruned.
export function IdleTimeoutModal(_props: { isRTL?: boolean; lang?: 'he' | 'en' }) {
  return null;
}
export default IdleTimeoutModal;
