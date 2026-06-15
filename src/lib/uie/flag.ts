/**
 * UIE feature flag. Default ON. Kill-switch via localStorage:
 *   localStorage.setItem('uie_enabled', '0')
 * Returning false routes uploads through the legacy parsers untouched.
 */
export function isUIEEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem('uie_enabled');
    if (v === '0' || v === 'false') return false;
    return true;
  } catch {
    return true;
  }
}
