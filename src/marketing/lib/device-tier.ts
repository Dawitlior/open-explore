/**
 * Three-tier capability probe, resolved once at boot.
 *
 *   high — full 3D, DPR up to 2, bloom, cursor parallax
 *   low  — 3D at DPR 1, quarter particle counts, no bloom, no parallax
 *   none — canvas never mounts; CSS-only parallax carries the page
 *
 * Content is identical across all three. The 3D layer is decoration over a
 * complete document — it never carries information the HTML doesn't already
 * have. That is what keeps the page crawlable and screen-reader complete.
 */

export type Tier = 'high' | 'low' | 'none'

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'none'

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'none'
  if (!hasWebGL2()) return 'none'

  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.innerWidth < 1024

  if (coarse || narrow || cores <= 4 || memory <= 4) return 'low'
  return 'high'
}

/** Cursor parallax is a lie on touch devices — there is no hover state. */
export function tierHasParallax(tier: Tier): boolean {
  return tier === 'high'
}
