import type { ThemeId } from '@/hooks/use-settings';
// ThemeId now: 'midnight' | 'indigo' | 'platinum'

export interface TradingTheme {
  id?: ThemeId;
  bg: { primary: string; secondary: string; tertiary: string; card: string; surface: string };
  accent: { cyan: string; cyanGlow: string; teal: string; blue: string; blueGlow: string; purple: string; purpleGlow: string; orange: string; red: string; redGlow: string; green: string; greenGlow: string };
  text: { primary: string; secondary: string; muted: string; dim: string };
  border: { subtle: string; medium: string; active: string };
  radius: { sm: number; md: number; lg: number; xl: number };
  shadow: { card: string; elevated: string; glow: (c: string) => string };
  // CSS var mapping — source of truth for HSL tokens (without "hsl()" wrapper)
  cssVars?: Record<string, string>;
}

/* ════════════════════════════════════════════════
   1) MIDNIGHT — Cyan / Carbon (kept, signature)
   ════════════════════════════════════════════════ */
const midnight: TradingTheme = {
  id: 'midnight',
  bg: { primary: '#020202', secondary: '#080808', tertiary: '#0d0d0d', card: '#0a0a0a', surface: '#111111' },
  accent: {
    cyan: '#00f2ff', cyanGlow: 'rgba(0,242,255,0.18)',
    teal: '#06d6a0',
    blue: '#3b82f6', blueGlow: 'rgba(59,130,246,0.14)',
    purple: '#8b5cf6', purpleGlow: 'rgba(139,92,246,0.12)',
    orange: '#f59e0b',
    red: '#ff1e1e', redGlow: 'rgba(255,30,30,0.14)',
    green: '#10b981', greenGlow: 'rgba(16,185,129,0.14)',
  },
  text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b', dim: '#475569' },
  border: { subtle: 'rgba(255,255,255,0.05)', medium: 'rgba(255,255,255,0.10)', active: 'rgba(0,242,255,0.35)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
    elevated: '0 4px 24px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)',
    glow: (c: string) => `0 0 20px ${c}, 0 0 40px ${c}`,
  },
  cssVars: {
    background: '0 0% 0.8%',
    foreground: '210 20% 96%',
    card: '0 0% 3.1%',
    popover: '0 0% 3.1%',
    primary: '184 100% 50%',
    primaryFg: '0 0% 0%',
    secondary: '0 0% 6%',
    muted: '0 0% 9%',
    mutedFg: '215 12% 55%',
    accent: '184 100% 50%',
    destructive: '0 100% 56%',
    ring: '184 100% 50%',
    sidebar: '0 0% 2%',
    auroraA: '184 100% 50%',
    auroraB: '258 90% 66%',
    glowSpot: '184 100% 50%',
  },
};

/* ════════════════════════════════════════════════
   2) INDIGO NOIR — Institutional purple-black-indigo
   ════════════════════════════════════════════════ */
const indigo: TradingTheme = {
  id: 'indigo',
  bg: { primary: '#06030f', secondary: '#0c0820', tertiary: '#120c2d', card: '#0e0a24', surface: '#16113a' },
  accent: {
    cyan: '#a78bfa', cyanGlow: 'rgba(167,139,250,0.20)', // primary = violet
    teal: '#7c3aed',
    blue: '#6366f1', blueGlow: 'rgba(99,102,241,0.16)',
    purple: '#c084fc', purpleGlow: 'rgba(192,132,252,0.16)',
    orange: '#f59e0b',
    red: '#f43f5e', redGlow: 'rgba(244,63,94,0.16)',
    green: '#34d399', greenGlow: 'rgba(52,211,153,0.16)',
  },
  text: { primary: '#ede9fe', secondary: '#a5a0c9', muted: '#7670a3', dim: '#534e80' },
  border: { subtle: 'rgba(167,139,250,0.07)', medium: 'rgba(167,139,250,0.14)', active: 'rgba(167,139,250,0.40)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.5), 0 6px 22px rgba(70,40,160,0.18)',
    elevated: '0 6px 30px rgba(0,0,0,0.55), 0 10px 40px rgba(80,50,180,0.25)',
    glow: (c: string) => `0 0 22px ${c}, 0 0 44px ${c}`,
  },
  cssVars: {
    background: '255 60% 4%',
    foreground: '258 90% 95%',
    card: '258 50% 9%',
    popover: '258 50% 9%',
    primary: '258 90% 76%',
    primaryFg: '255 60% 4%',
    secondary: '258 40% 14%',
    muted: '258 30% 16%',
    mutedFg: '258 20% 65%',
    accent: '258 90% 76%',
    destructive: '350 90% 60%',
    ring: '258 90% 76%',
    sidebar: '258 60% 6%',
    auroraA: '258 90% 66%',
    auroraB: '230 90% 60%',
    glowSpot: '258 90% 76%',
  },
};

/* ════════════════════════════════════════════════
   3) CRIMSON ONYX — Bloomberg-style burgundy-onyx
   ════════════════════════════════════════════════ */
const crimson: TradingTheme = {
  id: 'crimson',
  bg: { primary: '#0a0303', secondary: '#120606', tertiary: '#1a0a0a', card: '#150707', surface: '#1f0c0c' },
  accent: {
    cyan: '#ff5f70', cyanGlow: 'rgba(255,95,112,0.20)', // primary = crimson
    teal: '#dc2626',
    blue: '#fb923c', blueGlow: 'rgba(251,146,60,0.16)',
    purple: '#f472b6', purpleGlow: 'rgba(244,114,182,0.16)',
    orange: '#facc15',
    red: '#ef4444', redGlow: 'rgba(239,68,68,0.18)',
    green: '#22c55e', greenGlow: 'rgba(34,197,94,0.16)',
  },
  text: { primary: '#fef2f2', secondary: '#d6a5a5', muted: '#9d7373', dim: '#6e4f4f' },
  border: { subtle: 'rgba(255,95,112,0.06)', medium: 'rgba(255,95,112,0.14)', active: 'rgba(255,95,112,0.42)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.55), 0 6px 22px rgba(160,40,40,0.18)',
    elevated: '0 6px 30px rgba(0,0,0,0.6), 0 10px 40px rgba(180,40,40,0.22)',
    glow: (c: string) => `0 0 22px ${c}, 0 0 44px ${c}`,
  },
  cssVars: {
    background: '0 60% 3%',
    foreground: '0 90% 96%',
    card: '0 50% 7%',
    popover: '0 50% 7%',
    primary: '352 100% 68%',
    primaryFg: '0 60% 3%',
    secondary: '0 40% 12%',
    muted: '0 30% 14%',
    mutedFg: '0 20% 65%',
    accent: '352 100% 68%',
    destructive: '0 90% 60%',
    ring: '352 100% 68%',
    sidebar: '0 60% 5%',
    auroraA: '352 100% 60%',
    auroraB: '20 100% 55%',
    glowSpot: '352 100% 68%',
  },
};

export const themes: Record<ThemeId, TradingTheme> = { midnight, indigo, crimson };

export function getTheme(id: ThemeId): TradingTheme {
  return themes[id] || midnight;
}

/**
 * applyThemeToDOM — pushes the active theme's HSL tokens to :root so that
 * every component that reads from CSS vars (shadcn ui, orca-glass, aurora,
 * scrollbars, selection, etc.) updates instantly when the user switches.
 */
export function applyThemeToDOM(id: ThemeId) {
  if (typeof document === 'undefined') return;
  const theme = getTheme(id);
  const v = theme.cssVars || {};
  const r = document.documentElement;

  const set = (name: string, val?: string) => { if (val) r.style.setProperty(name, val); };

  set('--background', v.background);
  set('--foreground', v.foreground);
  set('--card', v.card);
  set('--card-foreground', v.foreground);
  set('--popover', v.popover);
  set('--popover-foreground', v.foreground);
  set('--primary', v.primary);
  set('--primary-foreground', v.primaryFg);
  set('--secondary', v.secondary);
  set('--secondary-foreground', v.foreground);
  set('--muted', v.muted);
  set('--muted-foreground', v.mutedFg);
  set('--accent', v.accent);
  set('--accent-foreground', v.primaryFg);
  set('--destructive', v.destructive);
  set('--ring', v.ring);

  set('--sidebar-background', v.sidebar);
  set('--sidebar-foreground', v.mutedFg);
  set('--sidebar-primary', v.primary);
  set('--sidebar-primary-foreground', v.primaryFg);
  set('--sidebar-accent', v.secondary);
  set('--sidebar-accent-foreground', v.foreground);
  set('--sidebar-ring', v.ring);

  // Custom orca tokens used by the global aurora + glass
  set('--orca-aurora-a', v.auroraA);
  set('--orca-aurora-b', v.auroraB);
  set('--orca-glow-spot', v.glowSpot);
  set('--orca-primary-h', v.primary);

  r.setAttribute('data-theme', id);
}

export function ttStyle(T: TradingTheme) {
  return {
    background: T.bg.card,
    border: `1px solid ${T.border.medium}`,
    borderRadius: T.radius.md,
    color: T.text.primary,
    fontSize: 12,
    boxShadow: T.shadow.elevated,
    padding: '8px 12px',
    backdropFilter: 'blur(12px)',
  };
}

// Recharts cursor: completely invisible — kills the white rectangle hover bug
export const INVISIBLE_CURSOR = { fill: 'transparent', stroke: 'transparent' } as const;
export function cursorStyle(_T: TradingTheme) {
  return INVISIBLE_CURSOR;
}

export const modeColors: Record<string, string> = {
  live: '#10b981', review: '#3b82f6', research: '#8b5cf6', recovery: '#f59e0b', beginner: '#22d3ee',
};

// Legacy
export const T = midnight;
