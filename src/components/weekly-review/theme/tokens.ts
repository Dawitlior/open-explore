// Reflection Room — Design Tokens (Phase 0)
// Fixed dark palette. Independent of ORCA's `T` theme. Single source of truth
// for the Weekly Review surface restyle. Do not hardcode colors elsewhere.

export const REFLECTION_TOKENS = {
  bg: {
    app: '#0E1116',
    surface1: '#161A21',
    surface2: '#1C2129',
    surface3: '#232932',
  },
  divider: {
    default: '#2A313B',
    strong: '#39424F',
  },
  text: {
    primary: '#ECEFF4',
    secondary: '#A8B0BD',
    disabled: '#5A6371',
    inverse: '#0E1116',
  },
  accent: {
    success: '#34D399',
    successSoft: '#34D39922',
    warning: '#F6C453',
    warningSoft: '#F6C45322',
    error: '#F2545B',
    errorSoft: '#F2545B22',
    info: '#5BB3FF',
    neutral: '#7A8696',
  },
  // Locked parity contract — Phase 1 ScoreRing + Grade bind to these EXACT thresholds.
  thresholds: {
    score: { success: 80, warning: 50 }, // >=80 success, >=50 warning, else error
    grade: {
      success: ['A+', 'A'] as const,
      warning: ['B', 'C'] as const,
      error: ['D', 'F'] as const,
    },
  },
  typography: {
    fontFamilyUI: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
    h1: { fontSize: 22, fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: 18, fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: 15, fontWeight: 600, lineHeight: 1.35 },
    body1: { fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
    body2: { fontSize: 13, fontWeight: 500, lineHeight: 1.5 },
    caption: { fontSize: 12, fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.4px' },
    monoLg: { fontSize: 18, fontWeight: 600, lineHeight: 1.2 },
    monoMd: { fontSize: 14, fontWeight: 600, lineHeight: 1.2 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 },
  elevation: {
    e0: 'none',
    e1: '0 1px 0 #00000040, 0 1px 2px #00000033',
    e2: '0 4px 12px #00000055',
    e3: '0 12px 32px #00000080',
  },
  motion: {
    durFast: 120,
    durStd: 200,
    durSlow: 320,
    easeStd: 'cubic-bezier(0.2, 0, 0, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

export type ReflectionTokens = typeof REFLECTION_TOKENS;
