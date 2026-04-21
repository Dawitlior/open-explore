import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * OrcaPanel — flat dense panel (no glass).
 * Use inside OrcaCard for nested sub-sections.
 */
export const OrcaPanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...p }) => (
  <div className={cn('orca-panel p-3', className)} {...p} />
);

export const OrcaDivider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('orca-divider my-3', className)} />
);

export const OrcaChip: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'cyan' | 'win' | 'loss' }> = ({
  className, tone = 'neutral', ...p
}) => (
  <span
    className={cn(
      'orca-chip inline-flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-mono uppercase tracking-wider',
      tone === 'cyan' && 'text-primary border-primary/25 bg-primary/10',
      tone === 'win'  && 'text-[hsl(var(--trading-green))] border-[hsl(var(--trading-green)/0.25)] bg-[hsl(var(--trading-green)/0.1)]',
      tone === 'loss' && 'text-destructive border-destructive/25 bg-destructive/10',
      className,
    )}
    {...p}
  />
);
