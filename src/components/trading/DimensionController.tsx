// Pure-CSS crossfade — no framer-motion AnimatePresence GPU layer churn.
// Memory rule: dimensions unmount completely during transitions to prevent
// theme leakage. We render exactly one subtree, keyed by activeDimension,
// and let a CSS keyframe handle the fade-in. ~0 JS animation cost.

const dimensionCSS = `
@keyframes orcaReturnShimmer { 0% { transform: translateX(-100%); } 50% { transform: translateX(100%); } 100% { transform: translateX(100%); } }
@keyframes orcaDimFadeIn { from { opacity: 0; transform: scale(0.985); filter: blur(6px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
.orca-dim-shell { position: fixed; inset: 0; width: 100vw; height: 100dvh; overflow: hidden; z-index: 100; }
@supports (height: 100dvh) { .orca-dim-shell { height: 100dvh; } }
.orca-dim-layer { width: 100%; height: 100%; animation: orcaDimFadeIn 360ms cubic-bezier(0.16,1,0.3,1) both; will-change: opacity, transform, filter; }
@media (prefers-reduced-motion: reduce) { .orca-dim-layer { animation: none; } }
`;

interface DimensionControllerProps {
  orcaUI: React.ReactNode;
  journalUI: React.ReactNode;
  backtestUI?: React.ReactNode;
  activeDimension: 'orca' | 'journal' | 'backtest';
}

export const DimensionController = ({ orcaUI, journalUI, backtestUI, activeDimension }: DimensionControllerProps) => {
  const child =
    activeDimension === 'orca' ? orcaUI :
    activeDimension === 'journal' ? journalUI :
    backtestUI;

  return (
    <>
      <style>{dimensionCSS}</style>
      <div className="orca-dim-shell">
        <div key={activeDimension} className="orca-dim-layer">
          {child}
        </div>
      </div>
    </>
  );
};

// Portal button for the sidebar — Trader Journey
export const PortalButton = ({ onClick, isRTL, expanded }: { onClick: () => void; isRTL: boolean; expanded: boolean }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: expanded ? '11px 13px' : '11px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(168,85,247,0.06) 60%, transparent)',
        border: '1px solid rgba(212,175,55,0.28)',
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        color: '#E6C667',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        marginTop: 4,
        letterSpacing: '0.04em',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.20), rgba(168,85,247,0.14) 60%, rgba(0,242,255,0.06))';
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.55)';
        e.currentTarget.style.boxShadow = '0 0 28px -6px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.10)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(168,85,247,0.06) 60%, transparent)';
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.28)';
        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(120deg, transparent 30%, rgba(212,175,55,0.10) 50%, transparent 70%)',
        backgroundSize: '200% 100%',
        animation: 'portalShimmer 4.5s linear infinite',
        pointerEvents: 'none',
      }} />
      <span style={{ fontSize: 17, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.55))' }}>🏛️</span>
      {expanded && (
        <span style={{ position: 'relative', zIndex: 1 }}>
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
        padding: expanded ? '11px 13px' : '11px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(59,130,246,0.06) 60%, transparent)',
        border: '1px solid rgba(6,182,212,0.28)',
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        color: '#7DD3FC',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        marginTop: 4,
        letterSpacing: '0.04em',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.22), rgba(59,130,246,0.14) 60%, rgba(168,85,247,0.06))';
        e.currentTarget.style.borderColor = 'rgba(6,182,212,0.55)';
        e.currentTarget.style.boxShadow = '0 0 28px -6px rgba(6,182,212,0.55), inset 0 1px 0 rgba(255,255,255,0.10)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(59,130,246,0.06) 60%, transparent)';
        e.currentTarget.style.borderColor = 'rgba(6,182,212,0.28)';
        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(120deg, transparent 30%, rgba(6,182,212,0.10) 50%, transparent 70%)',
        backgroundSize: '200% 100%',
        animation: 'portalShimmer 4.5s linear infinite',
        pointerEvents: 'none',
      }} />
      <span style={{ fontSize: 17, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.55))' }}>📊</span>
      {expanded && (
        <span style={{ position: 'relative', zIndex: 1 }}>
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
