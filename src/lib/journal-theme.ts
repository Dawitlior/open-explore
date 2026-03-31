import type { TradingTheme } from './trading-theme';

// Journal dimension theme — Zen, editorial, deep purple/slate
export const journalTheme: TradingTheme = {
  bg: {
    primary: '#0d0b1a',
    secondary: '#12102a',
    tertiary: '#1a1735',
    card: '#16133a',
    surface: '#211d4a',
  },
  accent: {
    cyan: '#c4b5fd',      // Soft violet as primary accent
    cyanGlow: 'rgba(196,181,253,0.12)',
    teal: '#a78bfa',
    blue: '#818cf8',
    blueGlow: 'rgba(129,140,248,0.10)',
    purple: '#e879f9',
    purpleGlow: 'rgba(232,121,249,0.10)',
    orange: '#fbbf24',
    red: '#fb7185',
    redGlow: 'rgba(251,113,133,0.08)',
    green: '#86efac',
    greenGlow: 'rgba(134,239,172,0.08)',
  },
  text: {
    primary: '#ede9fe',
    secondary: '#a5a0d0',
    muted: '#7c75a8',
    dim: '#5b5580',
  },
  border: {
    subtle: 'rgba(196,181,253,0.06)',
    medium: 'rgba(196,181,253,0.12)',
    active: 'rgba(196,181,253,0.25)',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  shadow: {
    card: '0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(13,11,26,0.4)',
    elevated: '0 8px 32px rgba(0,0,0,0.5), 0 16px 48px rgba(13,11,26,0.3)',
    glow: (c: string) => `0 0 24px ${c}, 0 0 48px ${c}`,
  },
};

// Orca dimension override — Pure black + cyan
export const orcaTheme: TradingTheme = {
  bg: {
    primary: '#000000',
    secondary: '#050810',
    tertiary: '#0a0f1c',
    card: '#080d18',
    surface: '#0f1520',
  },
  accent: {
    cyan: '#00F2FF',
    cyanGlow: 'rgba(0,242,255,0.12)',
    teal: '#00c8d6',
    blue: '#3b82f6',
    blueGlow: 'rgba(59,130,246,0.10)',
    purple: '#8b5cf6',
    purpleGlow: 'rgba(139,92,246,0.08)',
    orange: '#f59e0b',
    red: '#ef4444',
    redGlow: 'rgba(239,68,68,0.08)',
    green: '#10b981',
    greenGlow: 'rgba(16,185,129,0.10)',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    muted: '#64748b',
    dim: '#475569',
  },
  border: {
    subtle: 'rgba(0,242,255,0.06)',
    medium: 'rgba(0,242,255,0.12)',
    active: 'rgba(0,242,255,0.25)',
  },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  shadow: {
    card: '0 1px 4px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
    elevated: '0 4px 24px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4)',
    glow: (c: string) => `0 0 20px ${c}, 0 0 40px ${c}`,
  },
};

export function getDimensionTheme(dimension: 'orca' | 'journal'): TradingTheme {
  return dimension === 'journal' ? journalTheme : orcaTheme;
}

export function getDimensionFont(dimension: 'orca' | 'journal'): string {
  return dimension === 'journal'
    ? "'Playfair Display', 'Georgia', serif"
    : "'Inter', system-ui, -apple-system, sans-serif";
}

export function getDimensionMonoFont(dimension: 'orca' | 'journal'): string {
  return dimension === 'journal'
    ? "'Georgia', serif"
    : "'JetBrains Mono', monospace";
}
