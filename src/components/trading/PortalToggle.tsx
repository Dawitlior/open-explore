import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Dimension } from '@/hooks/use-journal-mode';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  dimension: Dimension;
  nudgeType: 'morning' | 'evening' | 'trading' | null;
  compact: boolean;
  onClick: () => void;
}

export const PortalToggle = ({ T, isRTL, dimension, nudgeType, compact, onClick }: Props) => {
  const [pulse, setPulse] = useState(false);
  const isJournal = dimension === 'journal';

  // Pulse for nudging
  useEffect(() => {
    if (!nudgeType || nudgeType === 'trading') return;
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, [nudgeType]);

  const shakeAnimation = nudgeType === 'morning' ? {
    x: [0, -2, 2, -2, 2, 0],
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 3 },
  } : nudgeType === 'evening' ? {
    scale: [1, 1.05, 1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  } : {};

  const label = isJournal
    ? (isRTL ? 'חזור ל-Orca' : 'Back to Orca')
    : (isRTL ? 'יומן פסיכולוגי' : 'Journal Mode');

  const icon = isJournal ? '🐋' : '🧘';
  const targetColor = isJournal ? '#00F2FF' : '#c4b5fd';

  const nudgeLabel = nudgeType === 'morning'
    ? (isRTL ? 'טקס בוקר ⏰' : 'Morning Ritual ⏰')
    : nudgeType === 'evening'
    ? (isRTL ? 'סגירת יום 🌙' : 'EOD Review 🌙')
    : null;

  return (
    <motion.button
      onClick={onClick}
      animate={shakeAnimation}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: compact ? '8px 10px' : '10px 14px',
        background: `linear-gradient(135deg, ${targetColor}08, ${targetColor}15)`,
        border: `1px solid ${targetColor}${nudgeType ? '50' : '25'}`,
        borderRadius: T.radius.md,
        color: targetColor,
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
        transition: 'all 0.3s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow pulse for nudging */}
      {nudgeType && (
        <motion.div
          style={{
            position: 'absolute', inset: 0, borderRadius: T.radius.md,
            background: `radial-gradient(circle, ${targetColor}15, transparent)`,
          }}
          animate={{ opacity: pulse ? 0.8 : 0.2 }}
          transition={{ duration: 1 }}
        />
      )}
      <span style={{ fontSize: 16, position: 'relative', zIndex: 1 }}>{icon}</span>
      {!compact && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: isRTL ? 'right' : 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>{nudgeLabel || label}</div>
          {nudgeLabel && <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{label}</div>}
        </div>
      )}
    </motion.button>
  );
};
