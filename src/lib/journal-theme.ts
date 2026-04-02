import type { TradingTheme } from './trading-theme';

// ═══ WHITE-GOLD JOURNAL DIMENSION ═══
// Cream/Ivory background, Brushed Gold + Deep Slate accents
// Complete departure from Orca's black/cyan DNA

export const journalTheme: TradingTheme = {
  bg: {
    primary: '#FAF8F5',       // Warm ivory
    secondary: '#F5F1EC',     // Cream
    tertiary: '#EDE8E0',      // Light parchment
    card: '#FFFFFF',          // Pure white cards
    surface: '#F0EBE3',      // Soft surface
  },
  accent: {
    cyan: '#D4AF37',          // Brushed Gold (primary accent)
    cyanGlow: 'rgba(212,175,55,0.12)',
    teal: '#B8962E',          // Dark gold
    blue: '#8B7355',          // Warm bronze
    blueGlow: 'rgba(139,115,85,0.10)',
    purple: '#C9A96E',        // Light gold
    purpleGlow: 'rgba(201,169,110,0.10)',
    orange: '#D4AF37',        // Gold accent
    red: '#C44536',           // Muted red
    redGlow: 'rgba(196,69,54,0.08)',
    green: '#2D6A4F',         // Deep forest green
    greenGlow: 'rgba(45,106,79,0.08)',
  },
  text: {
    primary: '#1A1A2E',       // Deep slate (almost black)
    secondary: '#4A4A5A',     // Medium slate
    muted: '#8A8A9A',         // Muted gray
    dim: '#B0B0BE',           // Light gray
  },
  border: {
    subtle: 'rgba(212,175,55,0.12)',
    medium: 'rgba(212,175,55,0.20)',
    active: 'rgba(212,175,55,0.35)',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  shadow: {
    card: '0 2px 12px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
    elevated: '0 8px 32px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.04)',
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
    ? "'Inter', system-ui, sans-serif"
    : "'JetBrains Mono', monospace";
}
