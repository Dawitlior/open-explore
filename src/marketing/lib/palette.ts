/**
 * Shared colour source for the WebGL layer.
 *
 * The marketing canvas is warm bone (reference theme); the product-UI replicas
 * rendered inside the canvas keep the platform's own identity. three.js needs
 * numeric hex, and a single source stops the 3D and DOM drifting apart.
 */
export const PALETTE = {
  // Porcelain field — matches the clay ground and the DOM background bed.
  canvas: '#0a0c12',
  canvasDeep: '#06080d',
  surface: '#161922',
  plat: '#1b1e27',

  indigo: '#22d3ee',
  indigoDeep: '#06b6d4',
  violet: '#a78bfa',
  teal: '#2dd4a7',
  rose: '#fb5b74',
  amber: '#f0b84a',

  ink: '#eef1f6',
  inkMute: '#949bab',
  line: '#272b36',
} as const

/**
 * On a near-white background, additive blending is unusable — it can only add
 * light, so every "glow" saturates to white and disappears. Everything in this
 * scene uses normal alpha blending with saturated pigment instead.
 */
export const BLEND_NOTE = 'normal-blending-only' as const
