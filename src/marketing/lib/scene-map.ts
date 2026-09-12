/**
 * The spine of the whole experience.
 *
 * Every scene owns a slice of scroll AND a fixed anchor in world space. The
 * camera flies down -Z through all six of them in one continuous shot, which
 * is why they can share a single WebGL context instead of one canvas each.
 */

export const SCENES = {
  hero: { range: [0.0, 0.15] as const, z: 0 },
  platform: { range: [0.15, 0.35] as const, z: -70 },
  journal: { range: [0.35, 0.55] as const, z: -140 },
  quantLab: { range: [0.55, 0.75] as const, z: -210 },
  risk: { range: [0.75, 0.88] as const, z: -280 },
  mainframe: { range: [0.88, 1.0] as const, z: -350 },
} as const

export type SceneKey = keyof typeof SCENES

/**
 * Camera keyframes in document-progress space. Position/target/fov are
 * smoothstep-interpolated between neighbours, so the shot reads as one
 * continuous dolly rather than six cuts.
 */
export interface CameraKey {
  at: number
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
}

/* ============================================================================
   WAYPOINT FLY-THROUGH SYSTEM
   The camera flies a CatmullRom spline through these waypoints. Each waypoint
   owns a `hold` band in scroll-progress space: inside it the camera parks and
   ambient-orbits while that section's DOM overlay is pinned in; between bands
   the camera swoops to the next angle. `fly`/`hold` alternate → the "arrive,
   read, fly on" rhythm. Angles change hard between waypoints for drama.
   ========================================================================== */

export interface Waypoint {
  key: SceneKey
  /** Scroll-progress centre of this waypoint's hold. */
  at: number
  /** Transit vantage — the high isometric point on the fly-through spline. */
  pos: [number, number, number]
  /** Inspection vantage — dropped, closer, frontal eye-level on the module.
   *  The camera dollies here as the waypoint locks, and back to `pos` on exit. */
  inspect: [number, number, number]
  look: [number, number, number]
  fov: number
  /** FOV at the inspection vantage (usually a touch tighter — a real lens push). */
  inspectFov: number
}

export const WAYPOINTS: Waypoint[] = [
  // W1 · HERO — macro overview of the whole citadel campus; dolly toward the
  // central engine on lock. The citadel is ~34u wide so the camera sits far.
  { key: 'hero', at: 0.06, pos: [26, 22, 26], inspect: [10, 9, 20], look: [6, 1.5, -2], fov: 20, inspectFov: 28 },
  // W2 · PLATFORM — swoop low-left, then dolly frontal on the stack
  { key: 'platform', at: 0.24, pos: [-12, 4, -52], inspect: [0, 1, -58], look: [0, 0, -70], fov: 42, inspectFov: 34 },
  // W3 · JOURNAL — high-right transit, drop to eye-level on the terminal
  { key: 'journal', at: 0.42, pos: [11, 9, -124], inspect: [0.5, 1.5, -128], look: [0, 0, -140], fov: 40, inspectFov: 34 },
  // W4 · QUANT LAB — top-down transit, dolly down over the data deck
  { key: 'quantLab', at: 0.6, pos: [0, 18, -195], inspect: [0, 4, -199], look: [0, 0, -210], fov: 46, inspectFov: 36 },
  // W5 · RISK — low transit, frontal on the command centre
  { key: 'risk', at: 0.78, pos: [-8, 2, -267], inspect: [0, 1, -271], look: [0, 0, -280], fov: 42, inspectFov: 34 },
  // W6 · MAINFRAME — pull back high, then settle frontal
  { key: 'mainframe', at: 0.93, pos: [7, 11, -333], inspect: [0, 2, -338], look: [0, -0.5, -350], fov: 48, inspectFov: 38 },
]

/** Half-width of each hold band in progress space. */
export const HOLD_HALF = 0.055

export const CAMERA_PATH: CameraKey[] = [
  // 1 · HERO — fixed ISOMETRIC vantage over the clay miniature. The camera
  // sits high on the classic 45° diagonal at a long distance with a narrow
  // FOV, which flattens perspective toward orthographic: foreground and
  // background blocks read at the same scale (the isometric signature).
  { at: 0.0, pos: [15, 13, 15], look: [0, 0.5, 0], fov: 22 },
  // A slow, gentle sweep/drop toward the core — no page cut, just a glide.
  { at: 0.13, pos: [11, 10, 13], look: [0, 0.8, 0], fov: 24 },

  // 2 · PLATFORM — pull back and dive into the depth tunnel of the panels.
  { at: 0.2, pos: [0, -2.5, -56], look: [0, 0, -70], fov: 45 },
  { at: 0.33, pos: [4.5, 1.2, -58], look: [0, 0, -70], fov: 50 },

  // 3 · JOURNAL — camera pans right into the terminal
  { at: 0.4, pos: [-6, 0.5, -126], look: [0, 0, -140], fov: 46 },
  { at: 0.53, pos: [6.5, 1.6, -127], look: [0.5, 0, -140], fov: 48 },

  // 4 · QUANT LAB — lifted, looking down over the data volume
  { at: 0.6, pos: [0, 5.5, -196], look: [0, 0, -210], fov: 52 },
  { at: 0.73, pos: [-3.5, 1.5, -195], look: [0, 0.5, -210], fov: 47 },

  // 5 · RISK — dead-centre, inside the protection rings
  { at: 0.79, pos: [0, 0, -266], look: [0, 0, -280], fov: 44 },
  { at: 0.87, pos: [0, 0, -270.5], look: [0, 0, -280], fov: 44 },

  // 6 · MAINFRAME — arrive, then pull back to reveal the whole ecosystem
  { at: 0.93, pos: [0, 0, -336], look: [0, 0, -350], fov: 46 },
  { at: 1.0, pos: [0, 3.5, -322], look: [0, -0.5, -350], fov: 62 },
]

/** Section ids, in document order — used by the nav for active-link tracking. */
export const SECTION_IDS = [
  'faq',
] as const

export const SECTION_LABELS: Record<(typeof SECTION_IDS)[number], string> = {
  faq: 'FAQ',
}
