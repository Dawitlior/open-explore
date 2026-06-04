// Shared UI primitives for the rebuilt 27-chart dashboards.

import type React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyT = any;

export interface Palette {
  fg: string; muted: string; accent: string; panel: string; border: string; win: string; loss: string; gold: string; bg: string;
}
export function getPalette(T: AnyT): Palette {
  return {
    fg:     T?.text?.primary   || '#e9eef7',
    muted:  T?.text?.muted     || '#7a8aa3',
    accent: T?.accent?.cyan    || '#00f2ff',
    panel:  T?.bg?.surface     || 'rgba(255,255,255,0.04)',
    border: T?.border?.subtle  || 'rgba(255,255,255,0.08)',
    win:    T?.status?.success || '#00ff88',
    loss:   T?.status?.danger  || '#ff3b3b',
    gold:   '#ffd700',
    bg:     T?.bg?.primary     || '#061326',
  };
}
export function card(P: Palette): React.CSSProperties {
  return {
    padding: 'clamp(14px, 2vw, 20px)', background: P.panel,
    border: `1px solid ${P.border}`, borderRadius: 14, boxSizing: 'border-box',
  };
}
export function labelStyle(P: Palette): React.CSSProperties {
  return { color: P.muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 };
}
export function tooltipStyle(P: Palette): React.CSSProperties {
  return {
    background: P.bg, border: `1px solid ${P.border}`, borderRadius: 8,
    color: P.fg, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
  };
}

export function StatCard({ P, label, value, tone }: { P: Palette; label: string; value: string; tone?: string }) {
  return (
    <div style={card(P)}>
      <div style={labelStyle(P)}>{label}</div>
      <div style={{ color: tone || P.fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
export function ChartCard({ P, title, children, hint }: { P: Palette; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={card(P)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={labelStyle(P)}>{title}</div>
        {hint && <div style={{ color: P.muted, fontSize: 9, letterSpacing: 1 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export const PIE_COLORS = ['#00f2ff', '#39FF14', '#ffd700', '#ff8c00', '#ff3b8e', '#8a5cff', '#00d6a3', '#ff6b6b', '#7a8aa3', '#5cc8ff'];
