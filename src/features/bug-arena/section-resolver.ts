/**
 * Maps an ORCA route to a Hebrew section name used by the Bug Arena board
 * for grouping bugs. The board groups bugs by section, so consistent names
 * here keep the forum tidy. Unknown routes bucket into "כללי".
 */
export function mapRouteToHebrewArea(route: string): string {
  const r = (route || '').toLowerCase();
  if (r.startsWith('/bugs')) return 'באג ארנה';
  if (r.startsWith('/welcome')) return 'דף נחיתה';
  if (r.startsWith('/auth') || r.startsWith('/reset-password')) return 'התחברות';
  if (r.startsWith('/terms') || r.startsWith('/privacy')) return 'מסמכים משפטיים';

  // The main app lives at "/" and switches dimensions internally via hash/state.
  // Try to read the active dimension from the URL hash if present.
  const hash = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
  if (hash.includes('journal')) return 'יומן מסחר';
  if (hash.includes('calendar')) return 'יומן הוצאות';
  if (hash.includes('weekly')) return 'סקירה שבועית';
  if (hash.includes('analytics')) return 'אנליטיקה';
  if (hash.includes('psych')) return 'פסיכולוגיה';
  if (hash.includes('risk')) return 'ניהול סיכונים';
  if (hash.includes('radar') || hash.includes('macro')) return 'רדאר מאקרו';
  if (hash.includes('settings')) return 'הגדרות';
  if (hash.includes('insights') || hash.includes('ai')) return 'תובנות AI';
  if (hash.includes('backtest')) return 'בקטסט';
  if (hash.includes('trader-mind')) return 'Trader Mind';
  if (r === '/') return 'דשבורד';

  return 'כללי';
}
