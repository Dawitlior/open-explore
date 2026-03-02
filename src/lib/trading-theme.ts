import type { ThemeId } from '@/hooks/use-settings';

export interface TradingTheme {
  bg: { primary: string; secondary: string; tertiary: string; card: string; surface: string };
  accent: { cyan: string; cyanGlow: string; teal: string; blue: string; blueGlow: string; purple: string; purpleGlow: string; orange: string; red: string; redGlow: string; green: string; greenGlow: string };
  text: { primary: string; secondary: string; muted: string; dim: string };
  border: { subtle: string; medium: string; active: string };
  radius: { sm: number; md: number; lg: number; xl: number };
  shadow: { card: string; elevated: string; glow: (c: string) => string };
}

const midnight: TradingTheme = {
  bg: { primary: '#0a0e1a', secondary: '#0f1528', tertiary: '#141b2d', card: '#111827', surface: '#1e293b' },
  accent: { cyan: '#06d6a0', cyanGlow: 'rgba(6,214,160,0.15)', teal: '#0d9488', blue: '#3b82f6', blueGlow: 'rgba(59,130,246,0.12)', purple: '#8b5cf6', purpleGlow: 'rgba(139,92,246,0.1)', orange: '#f59e0b', red: '#ef4444', redGlow: 'rgba(239,68,68,0.1)', green: '#10b981', greenGlow: 'rgba(16,185,129,0.12)' },
  text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b', dim: '#475569' },
  border: { subtle: 'rgba(148,163,184,0.08)', medium: 'rgba(148,163,184,0.15)', active: 'rgba(6,214,160,0.3)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: { card: '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)', elevated: '0 4px 24px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.2)', glow: (c: string) => `0 0 20px ${c}, 0 0 40px ${c}` }
};

const arctic: TradingTheme = {
  bg: { primary: '#f8fafc', secondary: '#f1f5f9', tertiary: '#e2e8f0', card: '#ffffff', surface: '#f1f5f9' },
  accent: { cyan: '#0891b2', cyanGlow: 'rgba(8,145,178,0.1)', teal: '#0d9488', blue: '#2563eb', blueGlow: 'rgba(37,99,235,0.08)', purple: '#7c3aed', purpleGlow: 'rgba(124,58,237,0.06)', orange: '#d97706', red: '#dc2626', redGlow: 'rgba(220,38,38,0.06)', green: '#059669', greenGlow: 'rgba(5,150,105,0.08)' },
  text: { primary: '#0f172a', secondary: '#475569', muted: '#64748b', dim: '#94a3b8' },
  border: { subtle: 'rgba(15,23,42,0.06)', medium: 'rgba(15,23,42,0.12)', active: 'rgba(8,145,178,0.3)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: { card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', elevated: '0 4px 24px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04)', glow: (c: string) => `0 0 20px ${c}, 0 0 40px ${c}` }
};

const ember: TradingTheme = {
  bg: { primary: '#1a0f0a', secondary: '#231510', tertiary: '#2d1b14', card: '#1f1410', surface: '#2a1e18' },
  accent: { cyan: '#fb923c', cyanGlow: 'rgba(251,146,60,0.15)', teal: '#ea580c', blue: '#60a5fa', blueGlow: 'rgba(96,165,250,0.12)', purple: '#c084fc', purpleGlow: 'rgba(192,132,252,0.1)', orange: '#fbbf24', red: '#f87171', redGlow: 'rgba(248,113,113,0.1)', green: '#34d399', greenGlow: 'rgba(52,211,153,0.12)' },
  text: { primary: '#fef3c7', secondary: '#d6a77a', muted: '#a0826d', dim: '#7a5c4f' },
  border: { subtle: 'rgba(214,167,122,0.08)', medium: 'rgba(214,167,122,0.15)', active: 'rgba(251,146,60,0.3)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: { card: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)', elevated: '0 4px 24px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)', glow: (c: string) => `0 0 20px ${c}, 0 0 40px ${c}` }
};

export const themes: Record<ThemeId, TradingTheme> = { midnight, arctic, ember };

export function getTheme(id: ThemeId): TradingTheme {
  return themes[id] || midnight;
}

export function ttStyle(T: TradingTheme) {
  return { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.primary, fontSize: 12 };
}

export const modeColors: Record<string, string> = { live: '#10b981', review: '#3b82f6', research: '#8b5cf6', recovery: '#f59e0b' };

// Legacy export for backward compatibility
export const T = midnight;
