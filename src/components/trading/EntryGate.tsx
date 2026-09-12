import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

/* ============================================================================
   EntryGate — "spherical aperture" cinematic entry.

   Setup:      a dark orb with the Orca mark at its center floats on a black void,
               turning slowly on its axis (subtle 3D depth + violet rim glow).
   Momentum:   on tap the orb spins up, accelerating — a beat of tension.
   Unfolding:  the shell splits into 8 curved segments that swing OUTWARD together
               in an arc (a 3D camera-iris / a flower opening toward the viewer).
   Transition: the camera flies into the center (zoom-in); logo + shell fade out
               and the platform is revealed behind, in full focus.

   Pure CSS 3D (perspective + preserve-3d) — no three.js. Ease-in on the spin-up,
   ease-out on the unfold. Same contract as before (onEnter + sessionStorage
   'orca-entered'); honours reduced motion.
   ========================================================================== */

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
  ready?: boolean;
}

type Phase = 'idle' | 'ignite' | 'open' | 'done';

const SEGMENTS = 8;
const IGNITE_MS = 900;
const OPEN_MS = 950;
const ICON_SRC = '/orca-logo.png';
const VIOLET = '#7c3aed';

export const EntryGate = ({ onEnter }: EntryGateProps) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const enteredRef = useRef(false);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.body?.getAttribute('data-reduce-motion') === '1'),
    [],
  );

  const finish = useCallback(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    try { sessionStorage.setItem('orca-entered', '1'); } catch { /* noop */ }
    onEnter();
  }, [onEnter]);

  const start = useCallback(() => {
    if (phase !== 'idle') return;
    if (reduced) { setPhase('done'); finish(); return; }
    setPhase('ignite');
  }, [phase, reduced, finish]);

  useEffect(() => {
    if (phase === 'ignite') {
      const t = window.setTimeout(() => setPhase('open'), IGNITE_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'open') {
      const t1 = window.setTimeout(finish, Math.round(OPEN_MS * 0.5));
      const t2 = window.setTimeout(() => setPhase('done'), OPEN_MS + 60);
      return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    }
  }, [phase, finish]);

  // 8 shell segments — each a 45° wedge of the orb, opening outward on unfold.
  const segments = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => {
        const angle = (360 / SEGMENTS) * i;
        // Slight per-segment stagger so the iris feels organic, not mechanical.
        const delay = (i % 2 === 0 ? i : SEGMENTS - i) * 10;
        return { angle, delay };
      }),
    [],
  );

  if (phase === 'done') return null;

  const igniting = phase === 'ignite';
  const opening = phase === 'open';

  // Wedge clip-path: apex at the orb centre, base a chord across the top (45° sector).
  const WEDGE_CLIP = 'polygon(50% 50%, 29.3% 0%, 70.7% 0%)';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Enter Orca"
      onClick={start}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        background: '#000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: phase === 'idle' ? 'pointer' : 'default',
        opacity: opening ? 0 : 1,
        transition: opening ? `opacity ${OPEN_MS}ms ease-in ${Math.round(OPEN_MS * 0.35)}ms` : undefined,
        overflow: 'hidden',
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        perspective: '1100px',
      }}
    >
      <style>{`
        @keyframes orcagate-idle-spin { to { transform: rotateZ(360deg); } }
        @keyframes orcagate-ignite-spin { from { transform: rotateZ(0deg); } to { transform: rotateZ(760deg); } }
        @keyframes orcagate-halo { 0%,100% { opacity: .5; transform: translate(-50%,-50%) scale(1); } 50% { opacity: .85; transform: translate(-50%,-50%) scale(1.12); } }
        @keyframes orcagate-hint { 0%,100% { opacity: 0; } 50% { opacity: .5; } }
      `}</style>

      {/* Depth tilt wrapper */}
      <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(12deg)' }}>
        {/* Violet halo that melts the orb edge into the void */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: '50%', left: '50%', width: 560, height: 560,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 45%, ${VIOLET}55 0%, ${VIOLET}22 34%, transparent 66%)`,
            filter: 'blur(8px)',
            animation: igniting || opening ? undefined : 'orcagate-halo 4.4s ease-in-out infinite',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }}
        />

        {/* The orb — spins as one, and holds the 3D segments + logo */}
        <div
          style={{
            position: 'relative',
            width: 'clamp(240px, 44vw, 400px)',
            height: 'clamp(240px, 44vw, 400px)',
            transformStyle: 'preserve-3d',
            animation: igniting
              ? `orcagate-ignite-spin ${IGNITE_MS}ms cubic-bezier(0.5,0,0.9,0.35) forwards`
              : opening ? undefined
              : 'orcagate-idle-spin 22s linear infinite',
            transition: opening ? `transform ${OPEN_MS}ms cubic-bezier(0.4,0,0.2,1)` : undefined,
            transform: opening ? 'scale(6)' : undefined, // camera flies into the centre
          }}
        >
          {/* Solid orb base — so the CLOSED sphere reads smooth (no visible
              triangle seams); it fades fast on unfold to let the iris open. */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle at 50% 42%, #22242c 0%, #131519 55%, #08090c 100%)`,
              boxShadow: `inset 0 0 60px -10px ${VIOLET}66, 0 0 60px -20px ${VIOLET}55`,
              opacity: opening ? 0 : 1,
              transition: opening ? 'opacity 220ms ease-out' : undefined,
            }}
          />

          {/* Shell segments */}
          {segments.map(({ angle, delay }, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0,
                clipPath: WEDGE_CLIP,
                transformOrigin: '50% 50%',
                background: `radial-gradient(circle at 50% 42%, #22242c 0%, #131519 55%, #08090c 100%)`,
                boxShadow: `inset 0 0 40px -8px ${VIOLET}66`,
                border: '0',
                transition: `transform ${OPEN_MS}ms cubic-bezier(0.34,0,0.2,1) ${delay}ms, opacity ${OPEN_MS - 150}ms ease-out ${delay}ms`,
                transform: opening
                  ? `rotate(${angle}deg) translateY(-70%) rotateX(-82deg) scale(1.18)`
                  : `rotate(${angle}deg)`,
                opacity: opening ? 0 : 1,
                backfaceVisibility: 'hidden',
              }}
            />
          ))}

          {/* Specular highlight — gives the flat wedges a spherical read */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 36% 30%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 22%, transparent 46%)',
              opacity: opening ? 0 : 1,
              transition: opening ? 'opacity 300ms ease-out' : undefined,
              pointerEvents: 'none',
            }}
          />

          {/* The Orca mark at the core */}
          <img
            src={ICON_SRC}
            alt="Orca"
            draggable={false}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '54%', height: '54%', objectFit: 'contain',
              transform: 'translate(-50%,-50%) translateZ(1px)',
              filter: `drop-shadow(0 0 24px ${VIOLET}aa) drop-shadow(0 0 60px rgba(0,0,0,0.9))`,
              opacity: opening ? 0 : 1,
              transition: opening ? 'opacity 240ms ease-out' : undefined,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Faint hint — invites the tap without a visible button */}
      {phase === 'idle' && !reduced && (
        <div
          style={{
            position: 'absolute', bottom: '13%', left: 0, right: 0, textAlign: 'center',
            color: '#b9a6ee', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase',
            fontFamily: "'Inter', system-ui, sans-serif",
            animation: 'orcagate-hint 3.6s ease-in-out infinite 1.4s',
            pointerEvents: 'none',
          }}
        >
          Tap to enter
        </div>
      )}
    </div>
  );
};

export default EntryGate;
