import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface OrcaMetricProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  /** Color tone for the value */
  tone?: 'neutral' | 'win' | 'loss' | 'cyan';
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
  /** Compact dense version */
  dense?: boolean;
}

const toneClass: Record<NonNullable<OrcaMetricProps['tone']>, string> = {
  neutral: 'text-foreground',
  win:     'orca-glow-emerald',
  loss:    'orca-glow-ruby',
  cyan:    'orca-glow-cyan',
};

/**
 * OrcaMetric — single KPI tile.
 * Numeric value uses JetBrains Mono with tabular-nums automatically.
 */
export const OrcaMetric: React.FC<OrcaMetricProps> = ({
  label, value, delta, tone = 'neutral', icon, hint, className, dense,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    className={cn('flex flex-col gap-1', dense ? 'p-3' : 'p-4', className)}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-medium">
        {label}
      </span>
      {icon && <span className="text-muted-foreground/60">{icon}</span>}
    </div>
    <div
      data-numeric="true"
      className={cn(
        'font-mono font-semibold leading-none tracking-tight',
        dense ? 'text-xl' : 'text-2xl md:text-[28px]',
        toneClass[tone],
      )}
    >
      {value}
    </div>
    {(delta || hint) && (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 font-mono">
        {delta}
        {hint && <span className="text-muted-foreground/50">{hint}</span>}
      </div>
    )}
  </motion.div>
);
