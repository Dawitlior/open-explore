import type { ThemeId } from '@/hooks/use-settings';
// ThemeId now: 'midnight' | 'blue' | 'platinum' | 'graphite'

export interface ChartTokens {
  /** cartesian / polar grid lines */
  grid: string;
  /** axis tick label color */
  axis: string;
  /** axis line color */
  axisLine: string;
  /** tooltip surface */
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  /** semantic P&L */
  profit: string;
  loss: string;
  neutral: string;
  /** area/bar fill opacity multiplier (light themes need far less) */
  fillOpacity: number;
  /** categorical series palette — always 8 entries */
  series: string[];
  /** sequential heatmap ramp, cold → hot (5 stops) */
  heat: string[];
}

export interface StateTokens {
  profit: string;
  loss: string;
  neutral: string;
  warn: string;
  info: string;
  profitSoft: string;
  lossSoft: string;
  warnSoft: string;
  infoSoft: string;
}

export interface SurfaceTokens {
  /** page background */
  base: string;
  /** default card */
  raised: string;
  /** inset wells, table stripes, inputs */
  sunken: string;
  /** modals / popovers / dropdowns */
  overlay: string;
  /** translucent "glass" fill used by .orca-glass style panels */
  glass: string;
  /** hover wash over any surface */
  hover: string;
  /** scrim behind modals */
  scrim: string;
}

export interface TradingTheme {
  id?: ThemeId;
  /** true for light-background themes — components branch on this, never on the id */
  isLight: boolean;
  bg: { primary: string; secondary: string; tertiary: string; card: string; surface: string };
  accent: { cyan: string; cyanGlow: string; teal: string; blue: string; blueGlow: string; purple: string; purpleGlow: string; orange: string; red: string; redGlow: string; green: string; greenGlow: string };
  text: { primary: string; secondary: string; muted: string; dim: string };
  border: { subtle: string; medium: string; active: string };
  radius: { sm: number; md: number; lg: number; xl: number };
  shadow: { card: string; elevated: string; glow: (c: string) => string };
  surface: SurfaceTokens;
  state: StateTokens;
  chart: ChartTokens;
  // CSS var mapping — source of truth for HSL tokens (without "hsl()" wrapper)
  cssVars?: Record<string, string>;
}

/* Shared dark-theme token factories — keeps the four themes in sync */
function darkSurface(card: string, base: string, sunken: string): SurfaceTokens {
  return {
    base,
    raised: card,
    sunken,
    overlay: card,
    glass: 'rgba(255,255,255,0.03)',
    hover: 'rgba(255,255,255,0.05)',
    scrim: 'rgba(0,0,0,0.72)',
  };
}

function darkState(green: string, red: string, orange: string, blue: string, muted: string): StateTokens {
  return {
    profit: green, loss: red, neutral: muted, warn: orange, info: blue,
    profitSoft: 'rgba(34,197,94,0.14)',
    lossSoft: 'rgba(239,68,68,0.14)',
    warnSoft: 'rgba(245,158,11,0.14)',
    infoSoft: 'rgba(56,189,248,0.14)',
  };
}

function darkChart(green: string, red: string, series: string[]): ChartTokens {
  return {
    grid: 'rgba(255,255,255,0.06)',
    axis: 'rgba(255,255,255,0.45)',
    axisLine: 'rgba(255,255,255,0.10)',
    tooltipBg: 'rgba(12,14,18,0.96)',
    tooltipBorder: 'rgba(255,255,255,0.12)',
    tooltipShadow: '0 8px 32px rgba(0,0,0,0.6)',
    profit: green,
    loss: red,
    neutral: '#64748B',
    fillOpacity: 1,
    series,
    heat: ['#0b1220', '#123047', '#1b5e73', '#2f9e8f', '#7ce3a1'],
  };
}


/* ════════════════════════════════════════════════
   1) MIDNIGHT — Cyan / Carbon (kept, signature)
   ════════════════════════════════════════════════ */
const midnight: TradingTheme = {
  id: 'midnight',
  isLight: false,
  surface: darkSurface('#121814', '#0A0F0A', '#0E130F'),
  state: darkState('#22C55E', '#F2545B', '#F59E0B', '#7DD3FC', '#7A857A'),
  chart: darkChart('#22C55E', '#F2545B', ['#C6F84E', '#34D97F', '#7DD3FC', '#A3E635', '#F59E0B', '#F2545B', '#22C55E', '#94A3B8']),
  // Deep near-black base with warm-green undertone + lime accent (per new brand ref)
  bg: { primary: '#0A0F0A', secondary: '#101610', tertiary: '#161C18', card: '#121814', surface: '#1A211C' },
  accent: {
    cyan: '#C6F84E', cyanGlow: 'rgba(198,248,78,0.22)',
    teal: '#34D97F',
    blue: '#7DD3FC', blueGlow: 'rgba(125,211,252,0.12)',
    purple: '#A3E635', purpleGlow: 'rgba(163,230,53,0.14)',
    orange: '#F59E0B',
    red: '#F2545B', redGlow: 'rgba(242,84,91,0.18)',
    green: '#22C55E', greenGlow: 'rgba(34,197,94,0.18)',
  },
  text: { primary: '#F1F5F1', secondary: '#A8B0A5', muted: '#7A857A', dim: '#525C55' },
  border: { subtle: 'rgba(198,248,78,0.06)', medium: 'rgba(255,255,255,0.10)', active: 'rgba(198,248,78,0.42)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.5)',
    elevated: '0 6px 28px rgba(0,0,0,0.7), 0 12px 40px rgba(0,0,0,0.5)',
    glow: (c: string) => `0 0 22px ${c}, 0 0 44px ${c}`,
  },
  cssVars: {
    background: '120 15% 5%',
    foreground: '90 10% 96%',
    card: '135 12% 8%',
    popover: '135 12% 8%',
    primary: '75 92% 64%',
    primaryFg: '120 30% 8%',
    secondary: '135 10% 12%',
    muted: '135 8% 15%',
    mutedFg: '120 6% 62%',
    accent: '75 92% 64%',
    destructive: '356 85% 58%',
    ring: '75 92% 64%',
    sidebar: '135 15% 4%',
    auroraA: '75 92% 64%',
    auroraB: '142 71% 45%',
    glowSpot: '75 92% 74%',
  },
};


/* ════════════════════════════════════════════════
   2) BLUE — Deep Navy & Sky Blue
   ════════════════════════════════════════════════ */
const blue: TradingTheme = {
  id: 'blue',
  isLight: false,
  surface: darkSurface('#131c30', '#0B1120', '#0F1728'),
  state: darkState('#34D399', '#F87171', '#F59E0B', '#38BDF8', '#64748B'),
  chart: darkChart('#34D399', '#F87171', ['#38BDF8', '#34D399', '#F59E0B', '#A78BFA', '#F87171', '#2563EB', '#7DD3FC', '#94A3B8']),



  bg: { primary: '#0B1120', secondary: '#111a2e', tertiary: '#1E293B', card: '#131c30', surface: '#1E293B' },
  accent: {
    cyan: '#38BDF8', cyanGlow: 'rgba(56,189,248,0.20)',
    teal: '#0EA5E9',
    blue: '#2563EB', blueGlow: 'rgba(37,99,235,0.16)',
    purple: '#7DD3FC', purpleGlow: 'rgba(125,211,252,0.14)',
    orange: '#F59E0B',
    red: '#F87171', redGlow: 'rgba(248,113,113,0.16)',
    green: '#34D399', greenGlow: 'rgba(52,211,153,0.16)',
  },
  text: { primary: '#E6EEF8', secondary: '#94A3B8', muted: '#64748B', dim: '#475569' },
  border: { subtle: 'rgba(148,197,255,0.06)', medium: 'rgba(148,197,255,0.14)', active: 'rgba(56,189,248,0.42)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.5), 0 6px 22px rgba(15,30,70,0.30)',
    elevated: '0 6px 30px rgba(0,0,0,0.55), 0 10px 40px rgba(15,30,90,0.35)',
    glow: (c: string) => `0 0 22px ${c}, 0 0 44px ${c}`,
  },
  cssVars: {
    background: '220 60% 8%',
    foreground: '213 31% 94%',
    card: '220 45% 13%',
    popover: '220 45% 13%',
    primary: '199 89% 60%',
    primaryFg: '220 60% 8%',
    secondary: '217 33% 17%',
    muted: '217 25% 20%',
    mutedFg: '215 20% 65%',
    accent: '199 89% 60%',
    destructive: '0 84% 70%',
    ring: '199 89% 60%',
    sidebar: '220 55% 10%',
    auroraA: '199 89% 60%',
    auroraB: '217 70% 55%',
    glowSpot: '199 89% 70%',
  },
};



/* ════════════════════════════════════════════════
   4) PLATINUM (technical id) — "LIGHT" Indigo SaaS
   Soft blue-grey canvas, pure-white cards, indigo
   accent, teal/rose P&L. No neon, no glow: elevation
   is expressed with real shadows.
   ════════════════════════════════════════════════ */
const platinum: TradingTheme = {
  id: 'platinum',
  isLight: true,
  bg: { primary: '#F7F8FC', secondary: '#FFFFFF', tertiary: '#F1F4FA', card: '#FFFFFF', surface: '#FFFFFF' },
  accent: {
    // `cyan` is the primary accent slot consumed across the app
    cyan: '#6366F1', cyanGlow: 'rgba(99,102,241,0.14)',
    teal: '#0F9D8C',
    blue: '#4F46E5', blueGlow: 'rgba(79,70,229,0.12)',
    purple: '#8B5CF6', purpleGlow: 'rgba(139,92,246,0.12)',
    orange: '#F59E0B',
    red: '#E11D48', redGlow: 'rgba(225,29,72,0.12)',
    green: '#0F9D8C', greenGlow: 'rgba(15,157,140,0.12)',
  },
  text: { primary: '#111827', secondary: '#475569', muted: '#64748B', dim: '#94A3B8' },
  border: { subtle: '#EEF1F7', medium: '#E9EDF5', active: 'rgba(99,102,241,0.45)' },
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  shadow: {
    card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
    elevated: '0 4px 12px rgba(15,23,42,0.08), 0 24px 48px rgba(15,23,42,0.10)',
    // No neon on white — "glow" degrades to a soft ambient lift
    glow: () => '0 2px 8px rgba(15,23,42,0.06), 0 12px 32px rgba(99,102,241,0.10)',
  },
  surface: {
    base: '#F7F8FC',
    raised: '#FFFFFF',
    sunken: '#F1F4FA',
    overlay: '#FFFFFF',
    glass: 'rgba(255,255,255,0.86)',
    hover: 'rgba(99,102,241,0.06)',
    scrim: 'rgba(15,23,42,0.32)',
  },
  state: {
    profit: '#0F9D8C',
    loss: '#E11D48',
    neutral: '#64748B',
    warn: '#D97706',
    info: '#4F46E5',
    profitSoft: 'rgba(15,157,140,0.10)',
    lossSoft: 'rgba(225,29,72,0.10)',
    warnSoft: 'rgba(217,119,6,0.10)',
    infoSoft: 'rgba(99,102,241,0.10)',
  },
  chart: {
    grid: '#EDF1F7',
    axis: '#64748B',
    axisLine: '#E2E8F0',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#E9EDF5',
    tooltipShadow: '0 8px 28px rgba(15,23,42,0.12)',
    profit: '#0F9D8C',
    loss: '#E11D48',
    neutral: '#94A3B8',
    fillOpacity: 0.55,
    series: ['#6366F1', '#0F9D8C', '#F59E0B', '#8B5CF6', '#E11D48', '#0EA5E9', '#84CC16', '#64748B'],
    heat: ['#F1F4FA', '#DBE4F5', '#B9C9F0', '#8C9FE8', '#6366F1'],
  },
  cssVars: {
    background: '225 43% 98%',
    foreground: '222 47% 11%',
    card: '0 0% 100%',
    popover: '0 0% 100%',
    primary: '239 84% 67%',
    primaryFg: '0 0% 100%',
    secondary: '222 40% 96%',
    muted: '222 40% 96%',
    mutedFg: '215 20% 45%',
    accent: '239 84% 67%',
    destructive: '347 77% 50%',
    ring: '239 84% 67%',
    sidebar: '0 0% 100%',
    auroraA: '239 84% 67%',
    auroraB: '174 82% 34%',
    glowSpot: '239 84% 80%',
    border: '220 33% 93%',
    input: '220 33% 93%',
  },
};


/* ════════════════════════════════════════════════
   5) GRAPHITE — Formal institutional gray / green / red
   ════════════════════════════════════════════════ */
const graphite: TradingTheme = {
  id: 'graphite',
  isLight: false,
  surface: darkSurface('#161a1f', '#0e1013', '#12161b'),
  state: darkState('#22c55e', '#ef4444', '#a16207', '#9aa4b2', '#7c8694'),
  chart: darkChart('#22c55e', '#ef4444', ['#22c55e', '#9aa4b2', '#a16207', '#ef4444', '#16a34a', '#64748b', '#a3a3a3', '#3f6212']),
  bg: { primary: '#0e1013', secondary: '#161a1f', tertiary: '#1c2128', card: '#161a1f', surface: '#1f242c' },
  accent: {
    cyan: '#22c55e', cyanGlow: 'rgba(34,197,94,0.16)',
    teal: '#16a34a',
    blue: '#9aa4b2', blueGlow: 'rgba(154,164,178,0.14)',
    purple: '#a3a3a3', purpleGlow: 'rgba(163,163,163,0.10)',
    orange: '#a16207',
    red: '#ef4444', redGlow: 'rgba(239,68,68,0.16)',
    green: '#22c55e', greenGlow: 'rgba(34,197,94,0.16)',
  },
  text: { primary: '#e7eaee', secondary: '#a8b0bb', muted: '#7c8694', dim: '#525c6b' },
  border: { subtle: 'rgba(255,255,255,0.05)', medium: 'rgba(255,255,255,0.10)', active: 'rgba(34,197,94,0.35)' },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  shadow: {
    card: '0 1px 2px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.35)',
    elevated: '0 4px 18px rgba(0,0,0,0.55), 0 10px 32px rgba(0,0,0,0.35)',
    glow: (c: string) => `0 0 14px ${c}, 0 0 28px ${c}`,
  },
  cssVars: {
    background: '215 14% 7%',
    foreground: '215 15% 92%',
    card: '215 14% 11%',
    popover: '215 14% 11%',
    primary: '142 71% 45%',
    primaryFg: '0 0% 100%',
    secondary: '215 14% 14%',
    muted: '215 12% 16%',
    mutedFg: '215 10% 62%',
    accent: '142 71% 45%',
    destructive: '0 84% 60%',
    ring: '142 71% 45%',
    sidebar: '215 14% 9%',
    auroraA: '142 71% 45%',
    auroraB: '215 14% 35%',
    glowSpot: '142 71% 55%',
  },
};

export const themes: Record<ThemeId, TradingTheme> = { midnight, blue, platinum, graphite };


export function getTheme(id: ThemeId): TradingTheme {
  return themes[id] || midnight;
}


/* ════════════════════════════════════════════════
   tintTheme — re-tint the JS-side TradingTheme so all
   inline-style components (which use T.accent.cyan,
   T.border.active, glows, etc.) ACTUALLY change color
   when the user picks a custom accent.
   This complements applyDerivedPalette which only
   touches CSS vars consumed by shadcn/Tailwind.
   ════════════════════════════════════════════════ */
function hexShift(hex: string, dl: number, ds = 0): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const h = hsl.h;
  const s = Math.max(0, Math.min(100, hsl.s + ds));
  const l = Math.max(0, Math.min(100, hsl.l + dl));
  // back to hex via HSL math
  const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const to = (n: number) => {
    const v = Math.round((n + m) * 255);
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  };
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function tintTheme(base: TradingTheme, hex: string): TradingTheme {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return base;
  const lighter = hexShift(hex, 8);
  const darker = hexShift(hex, -8);
  const teal = hexShift(hex, 0, -10);
  return {
    ...base,
    accent: {
      ...base.accent,
      cyan: hex,
      cyanGlow: rgba(hex, 0.18),
      teal,
      blue: darker,
      blueGlow: rgba(darker, 0.16),
    },
    border: {
      ...base.border,
      active: rgba(lighter, 0.4),
    },
    shadow: {
      ...base.shadow,
      glow: (c: string) => `0 0 20px ${c || rgba(hex, 0.5)}, 0 0 40px ${c || rgba(hex, 0.3)}`,
    },
  };
}

/**
 * applyThemeToDOM — pushes the active theme's HSL tokens to :root so that
 * every component that reads from CSS vars (shadcn ui, orca-glass, aurora,
 * scrollbars, selection, etc.) updates instantly when the user switches.
 */
/**
 * toHslTriplet — converts any hex / rgb(a) color into the bare
 * "H S% L%" triplet Tailwind + our CSS expect inside hsl(var(--x)).
 * Returns the input untouched if it is already a triplet.
 */
export function toHslTriplet(input: string): string {
  if (!input) return input;
  const raw = input.trim();
  if (!raw.startsWith('#') && !raw.startsWith('rgb')) return raw;

  let r = 0, g = 0, b = 0;
  if (raw.startsWith('#')) {
    let h = raw.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = raw.match(/[\d.]+/g);
    if (!m) return raw;
    [r, g, b] = m.slice(0, 3).map(Number);
  }

  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0));
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
}

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

  // Border / input follow the theme when declared (light needs solid greys)
  set('--border', v.border);
  set('--input', v.input);

  // Custom orca tokens used by the global aurora + glass
  set('--orca-aurora-a', v.auroraA);
  set('--orca-aurora-b', v.auroraB);
  set('--orca-glow-spot', v.glowSpot);
  set('--orca-primary-h', v.primary);

  /* ── Semantic runtime tokens (single source of truth for CSS + JS) ── */
  const s = theme.surface, st = theme.state, ch = theme.chart;
  set('--orca-surface-base', s.base);
  set('--orca-surface-raised', s.raised);
  set('--orca-surface-sunken', s.sunken);
  set('--orca-surface-overlay', s.overlay);
  set('--orca-surface-glass', s.glass);
  set('--orca-surface-hover', s.hover);
  set('--orca-scrim', s.scrim);
  set('--orca-border-subtle', theme.border.subtle);
  set('--orca-border-medium', theme.border.medium);
  set('--orca-border-active', theme.border.active);
  set('--orca-text-primary', theme.text.primary);
  set('--orca-text-secondary', theme.text.secondary);
  set('--orca-text-muted', theme.text.muted);
  set('--orca-text-dim', theme.text.dim);
  set('--orca-profit', st.profit);
  set('--orca-loss', st.loss);
  set('--orca-neutral', st.neutral);
  set('--orca-warn', st.warn);
  set('--orca-info', st.info);
  set('--orca-profit-soft', st.profitSoft);
  set('--orca-loss-soft', st.lossSoft);
  set('--orca-warn-soft', st.warnSoft);
  set('--orca-info-soft', st.infoSoft);
  set('--orca-chart-grid', ch.grid);
  set('--orca-chart-axis', ch.axis);
  set('--orca-chart-axis-line', ch.axisLine);
  set('--orca-tooltip-bg', ch.tooltipBg);
  set('--orca-tooltip-border', ch.tooltipBorder);
  set('--orca-tooltip-shadow', ch.tooltipShadow);
  set('--orca-shadow-card', theme.shadow.card);
  set('--orca-shadow-elevated', theme.shadow.elevated);
  ch.series.forEach((c, i) => set(`--orca-series-${i + 1}`, c));

  /* ── Legacy `--trading-*` bridge ───────────────────────────────
     Dozens of components still read hsl(var(--trading-bg-*)) and
     hsl(var(--trading-<accent>)). These used to be static dark
     values in index.css, which is exactly why the Light theme
     "half applied" before. We now derive them from the active
     theme so every legacy consumer follows along automatically. */
  set('--trading-bg-primary', toHslTriplet(theme.bg.primary));
  set('--trading-bg-secondary', toHslTriplet(theme.bg.secondary));
  set('--trading-bg-tertiary', toHslTriplet(theme.bg.tertiary));
  set('--trading-bg-surface', toHslTriplet(theme.bg.surface));
  set('--trading-cyan', toHslTriplet(theme.accent.cyan));
  set('--trading-cyan-glow', toHslTriplet(theme.accent.cyan));
  set('--trading-teal', toHslTriplet(theme.accent.teal));
  set('--trading-blue', toHslTriplet(theme.accent.blue));
  set('--trading-purple', toHslTriplet(theme.accent.purple));
  set('--trading-orange', toHslTriplet(theme.accent.orange));
  set('--trading-red', toHslTriplet(theme.accent.red));
  set('--trading-green', toHslTriplet(theme.accent.green));
  set('--sidebar-border', theme.isLight ? '220 33% 93%' : '0 0% 100% / 0.05');


  r.setAttribute('data-theme', id);
  // Generic light/dark switch — components & CSS branch on this, never on the id
  r.setAttribute('data-scheme', theme.isLight ? 'light' : 'dark');
  if (theme.isLight) r.classList.add('orca-light'); else r.classList.remove('orca-light');

  // Keep the PWA / browser title-bar (and iOS status bar) painted with the
  // active theme's solid background — otherwise the OS chrome stays stuck on
  // manifest.json#theme_color and visibly clashes with the in-app theme.
  // Scope: ONLY <meta name="theme-color"> + the <html> element's background.
  // Do NOT touch document.body — pages like Landing paint their own surface.
  try {
    const solid = theme.surface.base;
    r.style.backgroundColor = solid;
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', solid);
  } catch { /* non-fatal */ }
}

export function ttStyle(T: TradingTheme) {
  return {
    background: T.chart.tooltipBg,
    border: `1px solid ${T.chart.tooltipBorder}`,
    borderRadius: T.radius.md,
    color: T.text.primary,
    fontSize: 12,
    boxShadow: T.chart.tooltipShadow,
    padding: '8px 12px',
    // Blur is a dark-mode affordance; on white it muddies the tooltip
    backdropFilter: T.isLight ? 'none' : 'blur(12px)',
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

export const modeColorsLight: Record<string, string> = {
  live: '#0F9D8C', review: '#4F46E5', research: '#7C3AED', recovery: '#D97706', beginner: '#0EA5E9',
};

export function modeColor(mode: string, T?: TradingTheme): string {
  const map = T?.isLight ? modeColorsLight : modeColors;
  return map[mode] || map.live;
}


// Legacy
export const T = midnight;

/* ════════════════════════════════════════════════
   CUSTOM ACCENT — derive an HSL string from a hex
   and override the live primary/accent/ring tokens.
   Works on top of any base theme (midnight/blue/platinum/graphite).
   ════════════════════════════════════════════════ */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let H = 0, S = 0; const L = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    S = L > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: H = (g - b) / d + (g < b ? 6 : 0); break;
      case g: H = (b - r) / d + 2; break;
      case b: H = (r - g) / d + 4; break;
    }
    H *= 60;
  }
  return { h: Math.round(H), s: Math.round(S * 100), l: Math.round(L * 100) };
}

export function applyCustomAccent(hex: string) {
  if (typeof document === 'undefined') return;
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const r = document.documentElement;
  const base = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
  const glow = `${hsl.h} ${Math.min(100, hsl.s + 5)}% ${Math.min(70, hsl.l + 10)}%`;
  // Decide foreground for primary based on lightness
  const fg = hsl.l > 60 ? '0 0% 5%' : '0 0% 100%';
  r.style.setProperty('--primary', base);
  r.style.setProperty('--primary-foreground', fg);
  r.style.setProperty('--accent', base);
  r.style.setProperty('--accent-foreground', fg);
  r.style.setProperty('--ring', base);
  r.style.setProperty('--sidebar-primary', base);
  r.style.setProperty('--sidebar-primary-foreground', fg);
  r.style.setProperty('--sidebar-ring', base);
  r.style.setProperty('--orca-aurora-a', base);
  r.style.setProperty('--orca-glow-spot', glow);
  r.style.setProperty('--orca-primary-h', base);
  r.setAttribute('data-custom-accent', hex);
}

export function clearCustomAccent() {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.removeAttribute('data-custom-accent');
  r.removeAttribute('data-derived-palette');
  // Re-apply the active base theme to wipe custom overrides
  const id = (r.getAttribute('data-theme') as ThemeId) || 'midnight';
  applyThemeToDOM(id);
}

/* ════════════════════════════════════════════════
   DERIVED PALETTE — generate a cohesive full palette
   from one base hex. Uses HSL relations to keep
   contrast & accessibility safe across surfaces.
   Returns BOTH the css var map AND a preview palette
   so the Theme Studio can render a sketch.
   ════════════════════════════════════════════════ */
export interface DerivedPalette {
  hex: string;
  primary: string;        // hsl string "h s% l%"
  primaryFg: string;
  accent: string;
  accentSoft: string;     // 92% darken
  ring: string;
  glow: string;
  auroraA: string;
  auroraB: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  foreground: string;
  preview: { bg: string; surface: string; primary: string; accent: string; soft: string; glow: string };
}

export function deriveFullPalette(hex: string, mode: 'dark' | 'light' = 'dark'): DerivedPalette | null {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const { h, s } = hsl;
  // Anchor saturation in a comfortable band
  const S = Math.max(60, Math.min(92, s));
  const compH = (h + 28) % 360;     // analog harmony for aurora B
  const triH = (h + 180) % 360;

  if (mode === 'dark') {
    return {
      hex,
      primary:    `${h} ${S}% 60%`,
      primaryFg:  `0 0% 4%`,
      accent:     `${h} ${S}% 60%`,
      accentSoft: `${h} ${Math.round(S * 0.6)}% 22%`,
      ring:       `${h} ${S}% 60%`,
      glow:       `${h} ${Math.min(100, S + 5)}% 70%`,
      auroraA:    `${h} ${S}% 60%`,
      auroraB:    `${compH} ${Math.max(60, S - 8)}% 58%`,
      background: `${h} 30% 4%`,
      surface:    `${h} 24% 8%`,
      card:       `${h} 26% 7%`,
      border:     `${h} 30% 22%`,
      foreground: `${h} 20% 95%`,
      preview: {
        bg:      `hsl(${h} 30% 4%)`,
        surface: `hsl(${h} 24% 8%)`,
        primary: `hsl(${h} ${S}% 60%)`,
        accent:  `hsl(${triH} ${Math.max(55, S - 12)}% 62%)`,
        soft:    `hsl(${h} ${Math.round(S * 0.4)}% 18%)`,
        glow:    `hsl(${h} ${S}% 70% / 0.5)`,
      },
    };
  }
  // light
  return {
    hex,
    primary:    `${h} ${S}% 48%`,
    primaryFg:  `0 0% 100%`,
    accent:     `${h} ${S}% 48%`,
    accentSoft: `${h} ${Math.round(S * 0.5)}% 88%`,
    ring:       `${h} ${S}% 48%`,
    glow:       `${h} ${S}% 60%`,
    auroraA:    `${h} ${S}% 60%`,
    auroraB:    `${compH} ${Math.max(50, S - 10)}% 55%`,
    background: `${h} 30% 97%`,
    surface:    `${h} 20% 94%`,
    card:       `0 0% 100%`,
    border:     `${h} 20% 86%`,
    foreground: `${h} 30% 12%`,
    preview: {
      bg: `hsl(${h} 30% 97%)`, surface: `hsl(${h} 20% 94%)`,
      primary: `hsl(${h} ${S}% 48%)`, accent: `hsl(${triH} ${Math.max(45, S - 14)}% 52%)`,
      soft: `hsl(${h} ${Math.round(S * 0.4)}% 88%)`, glow: `hsl(${h} ${S}% 60% / 0.4)`,
    },
  };
}

export function applyDerivedPalette(hex: string) {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  // Decide mode based on currently active theme
  const isLight = getTheme((r.getAttribute('data-theme') as ThemeId) || 'midnight').isLight;
  const p = deriveFullPalette(hex, isLight ? 'light' : 'dark');
  if (!p) return;
  const set = (k: string, v: string) => r.style.setProperty(k, v);

  set('--background', p.background);
  set('--foreground', p.foreground);
  set('--card', p.card);
  set('--card-foreground', p.foreground);
  set('--popover', p.card);
  set('--popover-foreground', p.foreground);
  set('--primary', p.primary);
  set('--primary-foreground', p.primaryFg);
  set('--accent', p.primary);
  set('--accent-foreground', p.primaryFg);
  set('--secondary', p.accentSoft);
  set('--secondary-foreground', p.foreground);
  set('--muted', p.accentSoft);
  set('--muted-foreground', isLight ? '215 18% 38%' : '215 12% 65%');
  set('--ring', p.ring);
  set('--border', p.border);
  set('--input', p.border);

  set('--sidebar-background', isLight ? p.surface : `${hexToHsl(hex)?.h ?? 0} 30% 5%`);
  set('--sidebar-foreground', p.foreground);
  set('--sidebar-primary', p.primary);
  set('--sidebar-primary-foreground', p.primaryFg);
  set('--sidebar-accent', p.accentSoft);
  set('--sidebar-accent-foreground', p.foreground);
  set('--sidebar-ring', p.ring);

  set('--orca-aurora-a', p.auroraA);
  set('--orca-aurora-b', p.auroraB);
  set('--orca-glow-spot', p.glow);
  set('--orca-primary-h', p.primary);
  r.setAttribute('data-derived-palette', hex);
}

/* ════════════════════════════════════════════════
   ADVANCED THEME STUDIO — multi-axis CustomTheme
   Lets the user dial 7 dimensions instead of one
   single accent. Derives a coherent CSS-vars set
   that respects light/dark mode automatically.
   ════════════════════════════════════════════════ */
export type BaseMood = 'cool' | 'warm' | 'neutral' | 'monochrome';

export interface CustomTheme {
  baseMood: BaseMood;        // overall temperature bias
  bgHueShift: number;        // -30..30 nudge over derived hue
  surfaceElevation: number;  // 0..100 — how light surfaces are vs bg
  accentPrimary: string;     // hex
  accentSecondary: string;   // hex
  borderIntensity: number;   // 0..100
  glowIntensity: number;     // 0..100
  mode: 'dark' | 'light';
}

export const CUSTOM_THEME_DEFAULT: CustomTheme = {
  baseMood: 'cool',
  bgHueShift: 0,
  surfaceElevation: 50,
  accentPrimary: '#00f2ff',
  accentSecondary: '#8b5cf6',
  borderIntensity: 35,
  glowIntensity: 60,
  mode: 'dark',
};

interface DerivedFromCustom {
  vars: Record<string, string>;
  preview: { bg: string; surface: string; card: string; primary: string; accent: string; soft: string; glow: string; border: string };
}

export function deriveFromCustomTheme(t: CustomTheme): DerivedFromCustom | null {
  const p = hexToHsl(t.accentPrimary);
  const a = hexToHsl(t.accentSecondary);
  if (!p || !a) return null;

  const isLight = t.mode === 'light';
  const moodBias = t.baseMood === 'warm' ? 30 : t.baseMood === 'cool' ? -10 : t.baseMood === 'monochrome' ? 0 : 0;
  const moodSat  = t.baseMood === 'monochrome' ? 4 : 24;

  // Background hue derived from primary + mood bias + user shift
  const bgH = ((p.h + moodBias + t.bgHueShift) + 360) % 360;
  const bgS = isLight ? Math.min(40, moodSat + 6) : moodSat;

  // Surface elevation: how much lighter surfaces are than background
  const elev = Math.max(0, Math.min(100, t.surfaceElevation)) / 100;
  const bgL      = isLight ? 96 : 4;
  const surfaceL = isLight ? 96 - elev * 6 : 4 + elev * 8;
  const cardL    = isLight ? 100 : 4 + elev * 6;
  const popL     = cardL;

  const fgL = isLight ? 12 : 95;
  const mutedFgL = isLight ? 38 : 65;

  // Border intensity → opacity-like lightness shift
  const borderInt = Math.max(0, Math.min(100, t.borderIntensity)) / 100;
  const borderL = isLight ? 92 - borderInt * 14 : 14 + borderInt * 22;

  // Accent primary + secondary
  const Sp = Math.max(60, Math.min(94, p.s));
  const Sa = Math.max(55, Math.min(94, a.s));
  const primaryL = isLight ? 48 : 60;
  const accentL  = isLight ? 52 : 62;

  // Glow intensity
  const glowI = Math.max(0, Math.min(100, t.glowIntensity)) / 100;
  const glowL = isLight ? 60 : 60 + glowI * 12;
  const glowAlpha = 0.15 + glowI * 0.55;

  const fgChip = p.l > 60 ? '0 0% 5%' : '0 0% 100%';

  const vars: Record<string, string> = {
    '--background': `${bgH} ${bgS}% ${bgL}%`,
    '--foreground': `${bgH} 20% ${fgL}%`,
    '--card': `${bgH} ${Math.max(10, bgS - 4)}% ${cardL}%`,
    '--card-foreground': `${bgH} 20% ${fgL}%`,
    '--popover': `${bgH} ${Math.max(10, bgS - 4)}% ${popL}%`,
    '--popover-foreground': `${bgH} 20% ${fgL}%`,
    '--primary': `${p.h} ${Sp}% ${primaryL}%`,
    '--primary-foreground': fgChip,
    '--accent': `${a.h} ${Sa}% ${accentL}%`,
    '--accent-foreground': fgChip,
    '--secondary': `${bgH} ${Math.max(10, bgS - 6)}% ${isLight ? 92 : 14}%`,
    '--secondary-foreground': `${bgH} 20% ${fgL}%`,
    '--muted': `${bgH} ${Math.max(8, bgS - 8)}% ${isLight ? 90 : 12}%`,
    '--muted-foreground': `${bgH} 14% ${mutedFgL}%`,
    '--ring': `${p.h} ${Sp}% ${primaryL}%`,
    '--border': `${bgH} ${bgS}% ${borderL}%`,
    '--input': `${bgH} ${bgS}% ${borderL}%`,
    '--destructive': isLight ? '0 75% 42%' : '0 95% 60%',
    '--sidebar-background': `${bgH} ${bgS}% ${isLight ? 94 : Math.max(2, bgL - 2)}%`,
    '--sidebar-foreground': `${bgH} 20% ${fgL}%`,
    '--sidebar-primary': `${p.h} ${Sp}% ${primaryL}%`,
    '--sidebar-primary-foreground': fgChip,
    '--sidebar-accent': `${bgH} ${Math.max(10, bgS - 4)}% ${isLight ? 92 : 14}%`,
    '--sidebar-accent-foreground': `${bgH} 20% ${fgL}%`,
    '--sidebar-ring': `${p.h} ${Sp}% ${primaryL}%`,
    '--orca-aurora-a': `${p.h} ${Sp}% ${primaryL}%`,
    '--orca-aurora-b': `${a.h} ${Sa}% ${accentL}%`,
    '--orca-glow-spot': `${p.h} ${Math.min(100, Sp + 5)}% ${glowL}%`,
    '--orca-glow-alpha': glowAlpha.toFixed(2),
    '--orca-primary-h': `${p.h} ${Sp}% ${primaryL}%`,
  };

  return {
    vars,
    preview: {
      bg:      `hsl(${bgH} ${bgS}% ${bgL}%)`,
      surface: `hsl(${bgH} ${Math.max(10, bgS - 4)}% ${surfaceL}%)`,
      card:    `hsl(${bgH} ${Math.max(10, bgS - 4)}% ${cardL}%)`,
      primary: `hsl(${p.h} ${Sp}% ${primaryL}%)`,
      accent:  `hsl(${a.h} ${Sa}% ${accentL}%)`,
      soft:    `hsl(${bgH} ${Math.max(10, bgS - 6)}% ${isLight ? 92 : 14}%)`,
      glow:    `hsl(${p.h} ${Sp}% ${glowL}% / ${glowAlpha.toFixed(2)})`,
      border:  `hsl(${bgH} ${bgS}% ${borderL}%)`,
    },
  };
}

export function applyCustomTheme(t: CustomTheme) {
  if (typeof document === 'undefined') return;
  const out = deriveFromCustomTheme(t);
  if (!out) return;
  const r = document.documentElement;
  Object.entries(out.vars).forEach(([k, v]) => r.style.setProperty(k, v));
  r.setAttribute('data-custom-theme', '1');
}

export function clearCustomTheme() {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.removeAttribute('data-custom-theme');
  const id = (r.getAttribute('data-theme') as ThemeId) || 'midnight';
  applyThemeToDOM(id);
}
