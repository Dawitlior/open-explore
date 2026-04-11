import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DimensionControllerProps {
  orcaUI: React.ReactNode;
  journalUI: React.ReactNode;
  backtestUI?: React.ReactNode;
  activeDimension: 'orca' | 'journal' | 'backtest';
}

export const DimensionController = ({ orcaUI, journalUI, backtestUI, activeDimension }: DimensionControllerProps) => {
  return (
    <AnimatePresence mode="wait">
      {activeDimension === 'orca' ? (
        <motion.div
          key="orca"
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.92, filter: 'blur(20px)' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          {orcaUI}
        </motion.div>
      ) : activeDimension === 'journal' ? (
        <motion.div
          key="journal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          {journalUI}
        </motion.div>
      ) : (
        <motion.div
          key="backtest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          {backtestUI}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Portal button for the sidebar
export const PortalButton = ({ onClick, isRTL, expanded }: { onClick: () => void; isRTL: boolean; expanded: boolean }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: expanded ? '10px 12px' : '10px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(168,85,247,0.08))',
        border: '1px solid rgba(0,242,255,0.2)',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        color: '#D4AF37',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        marginTop: 4,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(168,85,247,0.15))';
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(0,242,255,0.08)';
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(168,85,247,0.08))';
        e.currentTarget.style.borderColor = 'rgba(0,242,255,0.2)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Glow pulse */}
      <span style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(0,242,255,0.05), rgba(168,85,247,0.05))',
        animation: 'portalPulse 3s ease-in-out infinite',
        borderRadius: 10,
      }} />
      <span style={{ fontSize: 18, position: 'relative', zIndex: 1 }}>🏛️</span>
      {expanded && (
        <span style={{ position: 'relative', zIndex: 1, letterSpacing: '0.02em' }}>
          {isRTL ? 'יומן מסע לסוחר' : 'Trader Journey'}
        </span>
      )}
    </button>
  );
};

// Backtest Portal Button for the sidebar
export const BacktestPortalButton = ({ onClick, isRTL, expanded }: { onClick: () => void; isRTL: boolean; expanded: boolean }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: expanded ? '10px 12px' : '10px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(6,182,212,0.08))',
        border: '1px solid rgba(37,99,235,0.2)',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        color: '#3b82f6',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        marginTop: 4,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(6,182,212,0.15))';
        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(37,99,235,0.15)';
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(6,182,212,0.08))';
        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(6,182,212,0.05))',
        animation: 'portalPulse 3s ease-in-out infinite',
        borderRadius: 10,
      }} />
      <span style={{ fontSize: 18, position: 'relative', zIndex: 1 }}>📊</span>
      {expanded && (
        <span style={{ position: 'relative', zIndex: 1, letterSpacing: '0.02em' }}>
          {isRTL ? 'יומן באק-טסט' : 'Backtest Journal'}
        </span>
      )}
    </button>
  );
};

// Return button for inside the journal
export const ReturnButton = ({ onClick, isRTL }: { onClick: () => void; isRTL: boolean }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        background: 'transparent',
        border: '1.5px solid rgba(212,175,55,0.35)',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        color: '#D4AF37',
        transition: 'all 0.25s ease',
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)';
        e.currentTarget.style.boxShadow = '0 0 16px rgba(212,175,55,0.12)';
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.35)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{ fontSize: 15 }}>⚔️</span>
      <span>{isRTL ? 'חזרה לחמ"ל' : 'Return to Command'}</span>
    </button>
  );
};
