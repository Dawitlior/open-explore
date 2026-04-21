import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface OrcaCardProps extends HTMLMotionProps<'div'> {
  /** Bento span columns out of 12 (desktop) */
  span?: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12;
  /** Disable diamond-cut hover glow */
  static?: boolean;
  /** Add grain texture overlay */
  grain?: boolean;
  /** Enable subtle 3D tilt on hover */
  tilt?: boolean;
}

/**
 * OrcaCard — glass-morphic, diamond-cut, optional grain.
 * Pure visual wrapper. Children render above the grain layer.
 */
export const OrcaCard = React.forwardRef<HTMLDivElement, OrcaCardProps>(
  ({ className, span, static: isStatic, grain = true, tilt = false, children, ...props }, ref) => {
    const colSpan =
      span === 3  ? 'md:col-span-3'  :
      span === 4  ? 'md:col-span-4'  :
      span === 5  ? 'md:col-span-5'  :
      span === 6  ? 'md:col-span-6'  :
      span === 7  ? 'md:col-span-7'  :
      span === 8  ? 'md:col-span-8'  :
      span === 9  ? 'md:col-span-9'  :
      span === 12 ? 'md:col-span-12' : '';

    return (
      <motion.div
        ref={ref}
        whileHover={tilt ? { y: -2, rotateX: 1, rotateY: -0.5 } : undefined}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className={cn(
          'orca-glass rounded-[var(--radius)] relative overflow-hidden col-span-4',
          colSpan,
          grain && 'orca-grain',
          !isStatic && 'orca-glass-hover',
          className,
        )}
        style={{ transformStyle: 'preserve-3d' }}
        {...props}
      >
        <div className="relative z-10">{children as React.ReactNode}</div>
      </motion.div>
    );
  },
);
OrcaCard.displayName = 'OrcaCard';

export const OrcaCardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...p }) => (
  <div className={cn('px-5 pt-4 pb-3 flex items-center justify-between gap-2', className)} {...p} />
);

export const OrcaCardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...p }) => (
  <h3 className={cn('text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground', className)} {...p} />
);

export const OrcaCardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...p }) => (
  <div className={cn('px-5 pb-5', className)} {...p} />
);
