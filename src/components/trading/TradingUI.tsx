import { ReactNode, CSSProperties } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';

interface GlassCardProps {
  children: ReactNode;
  style?: CSSProperties;
  glow?: string | null;
  onClick?: () => void;
  T: TradingTheme;
}

export const GlassCard = ({ children, style, glow, onClick, T }: GlassCardProps) => (
  <div onClick={onClick} style={{ background: `linear-gradient(135deg, ${T.bg.card} 0%, ${T.bg.tertiary} 100%)`, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.lg, padding: 20, boxShadow: glow ? `${T.shadow.card}, ${T.shadow.glow(glow)}` : T.shadow.card, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>
);

interface MetricCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
  small?: boolean;
  T: TradingTheme;
}

export const MetricCard = ({ label, value, suffix, color, small, T }: MetricCardProps) => (
  <GlassCard T={T} glow={color === T.accent.cyan ? T.accent.cyanGlow : color === T.accent.red ? T.accent.redGlow : color === T.accent.green ? T.accent.greenGlow : null} style={{ minWidth: small ? 130 : 150, flex: 1 }}>
    <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: small ? 20 : 26, fontWeight: 700, color: color || T.text.primary, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', lineHeight: 1.1 }}>
      {typeof value === 'number' ? (suffix === '%' ? value.toFixed(1) + '%' : suffix === 'x' ? value.toFixed(2) + 'x' : value >= 0 ? `$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`) : value}
    </div>
  </GlassCard>
);

interface ScoreGaugeProps {
  score: number;
  label: string;
  color: string;
  T: TradingTheme;
}

export const ScoreGauge = ({ score, label, color, T }: ScoreGaugeProps) => {
  const c = 2 * Math.PI * 40;
  const off = c - (score / 100) * c;
  return (
    <GlassCard T={T} glow={color === T.accent.cyan ? T.accent.cyanGlow : null} style={{ textAlign: 'center', minWidth: 170, flex: 1 }}>
      <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
      <svg width="92" height="92" viewBox="0 0 96 96" style={{ margin: '0 auto', display: 'block' }}>
        <circle cx="48" cy="48" r="40" fill="none" stroke={T.border.subtle} strokeWidth="6"/>
        <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="6" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 1.5s ease', filter: `drop-shadow(0 0 6px ${color})` }}/>
        <text x="48" y="48" textAnchor="middle" dominantBaseline="central" fill={T.text.primary} fontSize="22" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{Math.round(score)}</text>
      </svg>
    </GlassCard>
  );
};

interface TradingBadgeProps {
  children: ReactNode;
  color: string;
}

export const TradingBadge = ({ children, color }: TradingBadgeProps) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}30` }}>{children}</span>
);

export const Ico = {
  dash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  book: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  cal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  bar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  brain: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  star: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  doc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  globe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  orca: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><ellipse cx="16" cy="16" rx="14" ry="12" fill="#06d6a0" opacity="0.15"/><path d="M8 20c2-6 6-10 8-10s6 4 8 10" stroke="#06d6a0" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#06d6a0"/><circle cx="20" cy="16" r="1.5" fill="#06d6a0"/><path d="M10 22c2 2 4 3 6 3s4-1 6-3" stroke="#06d6a0" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  reset: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
};
