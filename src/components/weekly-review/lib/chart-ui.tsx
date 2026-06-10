// Shared UI primitives for the rebuilt dashboards.
// Theme-aware: adapts to Orca light (platinum/snow) and dark (midnight/indigo) themes.

import type React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyT = any;

export interface Palette {
  fg: string; muted: string; accent: string; panel: string; border: string;
  win: string; loss: string; gold: string; bg: string;
  // Theme awareness
  isLight: boolean;
  subtleBg: string;        // for inner card backgrounds (rows, sub-cards)
  headerBg: string;        // for table headers
  overlayBg: string;       // for hover/highlights
}

function detectLight(bg: string): boolean {
  // Parse hex / rgb / hsl roughly. Anything close to white is light.
  if (!bg) return false;
  const s = bg.toLowerCase().trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const v = h.length === 3
      ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    if (v.some(Number.isNaN)) return false;
    return (v[0] * 0.299 + v[1] * 0.587 + v[2] * 0.114) > 170;
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map(x => parseFloat(x));
    return (r * 0.299 + g * 0.587 + b * 0.114) > 170;
  }
  // hsl: peek lightness
  const hsl = s.match(/hsla?\(\s*\d+[, ]\s*\d+%?[, ]\s*(\d+)%/);
  if (hsl) return parseInt(hsl[1], 10) > 60;
  return false;
}

export function getPalette(T: AnyT): Palette {
  const bg     = T?.bg?.primary     || '#061326';
  const fg     = T?.text?.primary   || '#e9eef7';
  const muted  = T?.text?.muted     || '#7a8aa3';
  const accent = T?.accent?.cyan    || '#00f2ff';
  const panel  = T?.bg?.surface     || 'rgba(255,255,255,0.04)';
  const border = T?.border?.subtle  || 'rgba(255,255,255,0.08)';
  const win    = T?.status?.success || '#00b878';
  const loss   = T?.status?.danger  || '#ff3b3b';
  const isLight = detectLight(bg);

  return {
    fg, muted, accent, panel, border, win, loss,
    gold: isLight ? '#b88a00' : '#ffd700',
    bg,
    isLight,
    subtleBg: isLight ? 'rgba(0,0,0,0.04)'  : 'rgba(0,0,0,0.18)',
    headerBg: isLight ? 'rgba(0,0,0,0.05)'  : 'rgba(0,0,0,0.22)',
    overlayBg: isLight ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)',
  };
}
export function card(P: Palette): React.CSSProperties {
  return {
    padding: 'clamp(14px, 2vw, 20px)', background: P.panel,
    border: `1px solid ${P.border}`, borderRadius: 14, boxSizing: 'border-box',
    width: '100%', maxWidth: '100%', minWidth: 0,
    overflowWrap: 'break-word', wordWrap: 'break-word',
  };
}
export function labelStyle(P: Palette): React.CSSProperties {
  return { color: P.muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, overflowWrap: 'break-word', wordWrap: 'break-word' };
}
export function tooltipStyle(P: Palette): React.CSSProperties {
  return {
    background: P.isLight ? '#ffffff' : P.bg,
    border: `1px solid ${P.border}`, borderRadius: 8,
    color: P.fg, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
    boxShadow: P.isLight ? '0 4px 12px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.45)',
  };
}

export function StatCard({ P, label, value, tone }: { P: Palette; label: string; value: string; tone?: string }) {
  return (
    <div style={card(P)}>
      <div style={labelStyle(P)}>{label}</div>
      <div style={{ color: tone || P.fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4, overflowWrap: 'break-word', wordWrap: 'break-word' }}>{value}</div>
    </div>
  );
}
export function ChartCard({ P, title, children, hint }: { P: Palette; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={card(P)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
        <div style={labelStyle(P)}>{title}</div>
        {hint && <div style={{ color: P.muted, fontSize: 9, letterSpacing: 1 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export const PIE_COLORS = ['#00b8d4', '#00a86b', '#d4a017', '#e07b00', '#d63384', '#7b4cf0', '#00d6a3', '#e35d6a', '#7a8aa3', '#3b9eff'];
