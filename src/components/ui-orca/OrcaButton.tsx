import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface OrcaButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 hover:border-primary/60 hover:shadow-[0_0_24px_-4px_hsl(184_100%_50%/0.6)]',
  ghost:
    'bg-transparent text-foreground/80 border-white/5 hover:bg-white/5 hover:text-foreground hover:border-white/10',
  danger:
    'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25 hover:border-destructive/60 hover:shadow-[0_0_24px_-4px_hsl(0_100%_56%/0.55)]',
  subtle:
    'bg-white/[0.03] text-foreground/90 border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10',
};

const sizes: Record<Size, string> = {
  sm:   'h-8 px-3 text-[12px] gap-1.5',
  md:   'h-9 px-4 text-[13px] gap-2',
  lg:   'h-11 px-6 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
};

export const OrcaButton = React.forwardRef<HTMLButtonElement, OrcaButtonProps>(
  ({ className, variant = 'ghost', size = 'md', loading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      disabled={disabled || loading}
      className={cn(
        'orca-focus inline-flex items-center justify-center rounded-md border font-medium tracking-tight',
        'transition-colors duration-200 select-none whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  ),
);
OrcaButton.displayName = 'OrcaButton';
