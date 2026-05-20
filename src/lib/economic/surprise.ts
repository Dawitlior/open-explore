/** Returns surprise % (actual vs forecast) or null when not computable. */
export function computeSurprise(
  actual: string | null,
  forecast: string | null,
): number | null {
  const a = parseFloat(String(actual ?? '').replace(/[^\d.\-]/g, ''));
  const f = parseFloat(String(forecast ?? '').replace(/[^\d.\-]/g, ''));
  if (!isFinite(a) || !isFinite(f) || f === 0) return null;
  return ((a - f) / Math.abs(f)) * 100;
}

export function surpriseTone(
  surprisePct: number | null,
): 'positive' | 'negative' | 'inline' | 'unknown' {
  if (surprisePct == null) return 'unknown';
  if (Math.abs(surprisePct) < 1) return 'inline';
  return surprisePct > 0 ? 'positive' : 'negative';
}
