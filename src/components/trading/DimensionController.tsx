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
        gap: 10,
        padding: '12px 24px',
        background: 'linear-gradient(135deg, rgba(6,211,159,0.12), rgba(0,242,255,0.08))',
        border: '1.5px solid rgba(6,211,159,0.4)',
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 800,
        color: '#06d6a0',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        fontFamily: "'Poppins', sans-serif",
        letterSpacing: '0.3px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(6,211,159,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,211,159,0.22), rgba(0,242,255,0.15))';
        e.currentTarget.style.borderColor = 'rgba(6,211,159,0.6)';
        e.currentTarget.style.boxShadow = '0 0 30px rgba(6,211,159,0.2), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,211,159,0.12), rgba(0,242,255,0.08))';
        e.currentTarget.style.borderColor = 'rgba(6,211,159,0.4)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(6,211,159,0.08), inset 0 1px 0 rgba(255,255,255,0.05)';
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(6,211,159,0.4))' }}>
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      <span style={{ textShadow: '0 0 12px rgba(6,211,159,0.3)' }}>{isRTL ? 'חזרה ל-OrcaInvestment' : 'Return to Orca'}</span>
      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(6,211,159,0.06), transparent)', animation: 'orcaReturnShimmer 3s ease-in-out infinite', borderRadius: 12, pointerEvents: 'none' }} />
    </button>
  );
};
