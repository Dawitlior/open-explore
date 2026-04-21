import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const OrcaBento: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...p }) => (
  <div className={cn('orca-bento', className)} {...p}>{children}</div>
);

/** Page-level fade-in container; use once per route */
export const OrcaPageTransition: React.FC<{ children: React.ReactNode; keyId?: string }> = ({ children, keyId }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={keyId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
