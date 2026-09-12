/**
 * Frame-rate state that must NEVER pass through React.
 *
 * Scroll progress and pointer position update at display refresh rate. Routing
 * them through useState would re-render the component tree 120x/second on a
 * ProMotion panel. Instead they live in mutable module singletons that the
 * render loop reads directly inside useFrame — React renders the DOM once.
 */

export const scroll = {
  /** Normalised document progress, 0 → 1. */
  progress: 0,
  /** Signed scroll velocity in px/frame, smoothed. Drives motion-reactive FX. */
  velocity: 0,
}

/**
 * Handle to the live Lenis instance, set at boot by useScrollEngine. Lets UI
 * (e.g. the back-to-top button) drive a controlled smooth scroll instead of a
 * native jump that would fight Lenis's virtual scroll.
 */
export const engine: {
  lenis: { scrollTo: (target: number | string | HTMLElement, opts?: Record<string, unknown>) => void } | null
} = { lenis: null }

export const pointer = {
  /** Raw normalised cursor, -1 → 1 on both axes, origin at viewport centre. */
  x: 0,
  y: 0,
  /** Inertially smoothed cursor. Use this for parallax — raw values judder. */
  sx: 0,
  sy: 0,
}

/** Set once at boot by the device-tier probe; scenes read it to size buffers. */
export const quality = {
  particleScale: 1,
  bloom: true,
}

/**
 * Flight state, written by the camera rig every frame, read by the DOM overlay
 * layer. `holdness` is 1 while the camera is parked at a waypoint and 0 mid-
 * flight — the DOM overlays fade with it, so a section's UI "pins in" exactly
 * when the camera settles and clears out as it swoops away.
 */
export const flight = {
  /** 0 = flying, 1 = fully parked at a waypoint. */
  holdness: 0,
  /** Index of the nearest waypoint (the section currently in focus). */
  waypoint: 0,
  /** World point the camera is looking at — the depth-of-field focal target, so
   *  the subject stays sharp while near/far edges fall out of focus. */
  fx: 0,
  fy: 0,
  fz: 0,
}

/**
 * Progress local to a scroll range, clamped 0 → 1.
 * Feed a scene its own [start, end] and it gets a private timeline.
 */
export function rangeProgress(start: number, end: number): number {
  return Math.min(1, Math.max(0, (scroll.progress - start) / (end - start)))
}

/**
 * How "present" a scene is, 0 → 1, with a soft band either side of its range.
 * Used for opacity and for cheap frustum-independent culling: at 0 the whole
 * group is flipped invisible and drops out of the render list entirely.
 */
export function rangePresence(start: number, end: number, band = 0.045): number {
  const p = scroll.progress
  if (p < start - band || p > end + band) return 0
  if (p < start) return (p - (start - band)) / band
  if (p > end) return ((end + band) - p) / band
  return 1
}
