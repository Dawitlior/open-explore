import { ReactNode, CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════
   ORCA ELITE TRADING UI
   Same props (T, glow, color) — fully backward compatible.
   Visuals upgraded to glass + diamond-cut + grain + JetBrains Mono.
   ═══════════════════════════════════════════════════════════════ */

interface GlassCardProps {
  children: ReactNode;
  style?: CSSProperties;
  glow?: string | null;
  onClick?: () => void;
  T: TradingTheme;
  className?: string;
}

export const GlassCard = ({ children, style, glow, onClick, className }: GlassCardProps) => (
  <motion.div
    onClick={onClick}
    whileTap={onClick ? { scale: 0.998 } : undefined}
    transition={{ duration: 0.12 }}
    className={cn(
      'orca-glass orca-grain orca-glass-hover relative overflow-hidden',
      'rounded-[var(--radius)] p-5',
      onClick && 'cursor-pointer',
      className,
    )}
    style={{
      // Optional glow ring when explicitly requested
      ...(glow ? { boxShadow: `0 0 24px -4px ${glow}, 0 12px 40px -12px hsl(0 0% 0% / 0.6)` } : {}),
      minWidth: 0,
      boxSizing: 'border-box',
      ...style,
    }}
  >
    <div className="relative z-10 min-w-0">{children}</div>
  </motion.div>
);

interface MetricCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
  small?: boolean;
  T: TradingTheme;
  onInfoClick?: () => void;
}

export const MetricCard = ({ label, value, suffix, color, small, T, onInfoClick }: MetricCardProps) => {
  const isPos = typeof value === 'number' && value >= 0;
  const isNeg = typeof value === 'number' && value < 0;
  const tone =
    color === T.accent.cyan  ? 'orca-glow-cyan' :
    color === T.accent.red   ? 'orca-glow-ruby' :
    color === T.accent.green ? 'orca-glow-emerald' :
    isPos && !suffix         ? 'orca-glow-emerald' :
    isNeg && !suffix         ? 'orca-glow-ruby' :
    'text-foreground';

  return (
    <GlassCard T={T} className="orca-metric-card" style={{ minWidth: small ? 100 : 120, flex: 1 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="orca-metric-label text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium min-w-0 leading-snug">{label}</div>
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            aria-label="info"
            className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 rounded-full border border-white/10 bg-transparent text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors text-[7px] sm:text-[9px] font-bold flex items-center justify-center p-0 leading-none"
          >
            i
          </button>
        )}
      </div>
      <div
        data-numeric="true"
        className={cn(
          'orca-metric-value font-mono font-semibold leading-tight tracking-tight',
          small ? 'text-xl' : 'text-[26px]',
          tone,
        )}
        style={{
          fontSize: small ? 'clamp(16px, 5vw, 20px)' : 'clamp(18px, 6.4vw, 26px)',
          ...(color && !['cyan','red','green'].some(k => color === (T.accent as any)[k]) ? { color } : {}),
        }}
      >
        {typeof value === 'number'
          ? (suffix === '%'
              ? value.toFixed(1) + '%'
              : suffix === 'x'
                ? value.toFixed(2) + 'x'
                : value >= 0
                  ? `$${value.toFixed(2)}`
                  : `-$${Math.abs(value).toFixed(2)}`)
          : value}
      </div>
    </GlassCard>
  );
};

interface ScoreGaugeProps {
  score: number;
  label: string;
  color: string;
  T: TradingTheme;
  description?: string;
  onInfoClick?: () => void;
}

export const ScoreGauge = ({ score, label, color, T, description, onInfoClick }: ScoreGaugeProps) => {
  const c = 2 * Math.PI * 40;
  const off = c - (score / 100) * c;
  return (
    <GlassCard T={T} className="orca-score-gauge" style={{ textAlign: 'center', minWidth: 140, flex: 1 }}>
      <div className="flex items-center justify-center gap-1.5" style={{ marginBottom: description ? 4 : 10 }}>
        <div className="orca-metric-label text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium leading-snug">{label}</div>
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            className="w-4 h-4 rounded-full border border-white/10 bg-transparent text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors text-[9px] font-bold flex items-center justify-center p-0 leading-none"
          >
            i
          </button>
        )}
      </div>
      {description && (
        <div className="text-[9px] text-muted-foreground mb-2 leading-snug max-w-[180px] mx-auto">{description}</div>
      )}
      <svg width="92" height="92" viewBox="0 0 96 96" className="block mx-auto">
        <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="6"/>
        <circle
          cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text
          x="48" y="48" textAnchor="middle" dominantBaseline="central"
          fill="hsl(var(--foreground))" fontSize="22" fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(score)}
        </text>
      </svg>
    </GlassCard>
  );
};

interface TradingBadgeProps {
  children: ReactNode;
  color: string;
}

export const TradingBadge = ({ children, color }: TradingBadgeProps) => (
  <span
    className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold font-mono uppercase tracking-wider"
    style={{
      background: `${color}1A`,
      color,
      border: `1px solid ${color}40`,
      boxShadow: `0 0 0 1px ${color}10 inset`,
    }}
  >
    {children}
  </span>
);

export const Ico = {
  dash:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  book:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  cal:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  bar:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  shield:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  brain:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  star:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  doc:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  globe:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  orca:    <span className="font-mono font-extrabold tracking-tight text-[14px] text-foreground">O<span className="font-normal text-muted-foreground">I</span></span>,
  settings:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  reset:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
};
