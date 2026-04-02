import { motion, AnimatePresence } from 'framer-motion';
import type { Dimension } from '@/hooks/use-journal-mode';

interface Props {
  active: boolean;
  targetDimension: Dimension;
}

export const PortalTransition = ({ active, targetDimension }: Props) => {
  const isJournal = targetDimension === 'journal';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'all',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* White flash for journal, dark for orca */}
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              background: isJournal ? '#FAF8F5' : 'rgba(0,0,0,0.95)',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1] }}
            transition={{ duration: 0.8, times: [0, 0.3, 1] }}
          />

          {/* Center expansion */}
          <motion.div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isJournal
                ? `radial-gradient(circle, #D4AF37 0%, #FAF8F5 60%, transparent 100%)`
                : `radial-gradient(circle, #00F2FF 0%, #000000 70%, transparent 100%)`,
              boxShadow: isJournal
                ? '0 0 60px rgba(212,175,55,0.4), 0 0 120px rgba(212,175,55,0.2)'
                : '0 0 60px #00F2FF, 0 0 120px rgba(0,242,255,0.2)',
              position: 'relative', zIndex: 2,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 80], opacity: [0, 1, 1] }}
            transition={{ duration: 1.2, times: [0, 0.3, 1], ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Reticle rings */}
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: 100 * i, height: 100 * i,
                borderRadius: '50%',
                border: `1px solid ${isJournal ? 'rgba(212,175,55,0.2)' : 'rgba(0,242,255,0.2)'}`,
                zIndex: 1,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 0.8], opacity: [0, 0.6, 0] }}
              transition={{ duration: 1, delay: 0.1 * i, ease: 'easeOut' }}
            />
          ))}

          {/* Dimension label */}
          <motion.div
            style={{
              position: 'absolute', zIndex: 3,
              fontFamily: isJournal ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
              fontSize: isJournal ? 28 : 24,
              fontWeight: 700,
              color: isJournal ? '#D4AF37' : '#00F2FF',
              letterSpacing: isJournal ? '0.12em' : '-0.02em',
              textShadow: isJournal
                ? '0 0 30px rgba(212,175,55,0.4)'
                : '0 0 30px #00F2FF',
            }}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 1.1], y: [20, 0, 0, -10] }}
            transition={{ duration: 1.4, times: [0, 0.3, 0.7, 1] }}
          >
            {isJournal ? 'Dawit Journal' : 'ORCA'}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
