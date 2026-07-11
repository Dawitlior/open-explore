import * as React from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScrollStageProps {
  /** Total scroll length as multiple of viewport height (e.g. 2.2 = 220vh) */
  heightVh?: number;
  /** Render prop: receives normalized progress 0..1 (MotionValue) + reducedMotion flag */
  children: (p: { progress: MotionValue<number>; reduced: boolean; isMobile: boolean }) => React.ReactNode;
  /** Optional background style */
  background?: string;
  className?: string;
}

/**
 * ScrollStage — sticky visual + spacer primitive for scrollytelling.
 * The visual layer is pinned to the viewport while the parent spacer scrolls,
 * producing a normalized 0..1 progress signal that consumers map to animations.
 *
 * Reduced-motion / mobile: falls back to a static, non-sticky flow.
 */
export const ScrollStage: React.FC<ScrollStageProps> = ({
  heightVh = 2.2,
  children,
  background,
  className,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  // Smooth clamp via useTransform (identity, but clamped by framer internally).
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const disabled = reduced || isMobile;

  if (disabled) {
    return (
      <div className={className} style={{ background, position: 'relative' }}>
        {children({ progress, reduced, isMobile })}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'relative',
        height: `${heightVh * 100}vh`,
        background,
      }}
    >
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {children({ progress, reduced, isMobile })}
      </div>
    </div>
  );
};

export { motion, useTransform };
export type { MotionValue };
