/* ============================================================================
   FIRST-RUN UI — token map (single source; no hard-coded hex in components).
   Components use these Tailwind token *classes*, which resolve to CSS variables
   declared in src/styles/globals.css (@theme). Lovable can remap the right-hand
   values to the platform's own design tokens at connect time without touching
   any component. Roles below describe how each token is used in this package.
   ========================================================================== */

export const FIRST_RUN_TOKENS = {
  // surfaces
  canvas: { cssVar: '--color-canvas', class: 'bg-canvas', hex: '#f6f6f8', role: 'page background behind cards' },
  canvasDeep: { cssVar: '--color-canvas-deep', class: 'bg-canvas-deep', hex: '#eef0f3', role: 'insets, inactive progress, quiet panels' },
  surface: { cssVar: '--color-surface', class: 'bg-surface', hex: '#ffffff', role: 'card / field surface' },
  line: { cssVar: '--color-line', class: 'border-line', hex: '#e7e8ec', role: 'hairline borders, dividers' },

  // text
  ink: { cssVar: '--color-ink', class: 'text-ink', hex: '#0f1116', role: 'primary text / headings' },
  ink2: { cssVar: '--color-ink-2', class: 'text-ink-2', hex: '#3a3d45', role: 'body copy' },
  inkMute: { cssVar: '--color-ink-mute', class: 'text-ink-mute', hex: '#6b7180', role: 'secondary text' },
  inkFaint: { cssVar: '--color-ink-faint', class: 'text-ink-faint', hex: '#9aa0ac', role: 'hints, placeholders, meta' },

  // accent (disciplined — used for the primary action, selection, focus)
  accent: { cssVar: '--color-indigo', class: 'bg-indigo / text-indigo', hex: '#7c3aed', role: 'primary CTA, selected state, focus ring, progress fill' },
  accentSoft: { cssVar: '--color-indigo-soft', class: 'bg-indigo-soft', hex: '#f1e9fe', role: 'selected card tint' },

  // status
  error: { cssVar: '--color-rose', class: 'text-rose / border-rose', hex: '#e5484d', role: 'validation + error banner' },
  errorSoft: { cssVar: '--color-rose-soft', class: 'bg-rose-soft', hex: '#fde8e8', role: 'error banner background' },
  amber: { cssVar: '--color-amber', class: 'text-amber / bg-amber-soft', hex: '#e0a53a', role: 'placeholder / “demo only” markers' },

  // elevation utilities (box-shadow tokens from globals.css)
  elevation: { classes: ['elev-1', 'elev-2', 'elev-3'], role: 'card depth (low → high)' },

  // shape
  radius: { card: 'rounded-2xl (16px)', control: 'rounded-lg (8px)', role: 'cards vs. buttons/inputs' },

  // typography (project fonts)
  fontDisplay: { class: 'font-display', role: 'headings' },
  fontBody: { class: '(default sans)', role: 'body + controls' },

  // a11y
  focusRing: { class: 'focus-visible:ring-4 focus-visible:ring-indigo/25', role: 'visible keyboard focus' },
  minTarget: { value: '44px', role: 'minimum touch target (buttons/inputs use min-h-[44px]+)' },
} as const

export type FirstRunTokens = typeof FIRST_RUN_TOKENS
