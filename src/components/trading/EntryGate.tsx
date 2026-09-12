import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

/* ============================================================================
   EntryGate — cinematic entry. A single round Orca mark floats on a pure-black
   void; its shadows melt the edge into the dark so it reads like the logo simply
   *is* there. There is no visible button, so the eye goes to the center — tap the
   mark and it spins up, throws sparks, then blooms open as a fast-expanding
   circle that reveals the platform beneath. Same props/behaviour contract as the
   previous gate (onEnter + sessionStorage 'orca-entered'); honours reduced motion.
   ========================================================================== */

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
  ready?: boolean;
}

type Phase = 'idle' | 'ignite' | 'open' | 'done';

const IGNITE_MS = 1050;
const OPEN_MS = 640;
const ICON_SRC = '/orca-logo.png';

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

  // Drive the phase timeline.
  useEffect(() => {
    if (phase === 'ignite') {
      const t = window.setTimeout(() => setPhase('open'), IGNITE_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'open') {
      // Reveal the platform partway through the bloom, then unmount the gate.
      const t1 = window.setTimeout(finish, Math.round(OPEN_MS * 0.45));
      const t2 = window.setTimeout(() => setPhase('done'), OPEN_MS + 40);
      return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    }
  }, [phase, finish]);

  // Deterministic spark rays.
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * 360 + (i % 2 ? 11 : -7);
        const dist = 150 + ((i * 37) % 90);
        const delay = (i % 5) * 24;
        const size = 3 + ((i * 13) % 4);
        return { angle, dist, delay, size };
      }),
    [],
  );

  if (phase === 'done') return null;

  const igniting = phase === 'ignite';
  const opening = phase === 'open';

  return (
    <div
      aria-hidden={false}
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
        transition: opening ? `opacity ${OPEN_MS}ms ease-in ${Math.round(OPEN_MS * 0.4)}ms` : undefined,
        overflow: 'hidden',
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{`
        @keyframes orcagate-breathe {
          0%,100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.035); opacity: 1; }
        }
        @keyframes orcagate-halo {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes orcagate-spin {
          0% { transform: rotate(0deg) scale(1); }
          55% { transform: rotate(430deg) scale(1.02); }
          100% { transform: rotate(1120deg) scale(1.06); }
        }
        @keyframes orcagate-spark {
          0% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--a)) translateX(60px) scale(0.4); }
          22% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--a)) translateX(calc(60px + var(--d))) scale(1); }
        }
        @keyframes orcagate-bloom {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(26); opacity: 0.9; }
        }
        @keyframes orcagate-hint {
          0%,100% { opacity: 0; }
          50% { opacity: 0.55; }
        }
      `}</style>

      {/* Icon + halo stack */}
      <div style={{ position: 'relative', width: 'clamp(200px, 40vw, 340px)', height: 'clamp(200px, 40vw, 340px)' }}>
        {/* Soft radial halo that melts the edge into the void */}
        <div
          style={{
            position: 'absolute', inset: '-55%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.30) 0%, rgba(80,50,160,0.14) 34%, rgba(0,0,0,0) 68%)',
            filter: 'blur(6px)',
            animation: igniting ? undefined : 'orcagate-halo 4.2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        {/* Bloom disc — the expanding circle that reveals the platform */}
        {opening && (
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background:
                'radial-gradient(circle at 50% 50%, #ffffff 0%, #cbb4ff 30%, #7c3aed 62%, #2a1560 100%)',
              animation: `orcagate-bloom ${OPEN_MS}ms cubic-bezier(0.7,0,0.84,0) both`,
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Sparks */}
        {igniting &&
          sparks.map((s, i) => (
            <span
              key={i}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                width: s.size, height: s.size, borderRadius: '50%',
                background: i % 3 === 0 ? '#ffffff' : '#c9b3ff',
                boxShadow: '0 0 8px 1px rgba(200,170,255,0.9)',
                // @ts-expect-error CSS custom props
                '--a': `${s.angle}deg`, '--d': `${s.dist}px`,
                animation: `orcagate-spark ${IGNITE_MS - 120}ms cubic-bezier(0.2,0.7,0.3,1) ${s.delay}ms both`,
                pointerEvents: 'none',
              }}
            />
          ))}
        {/* The Orca mark */}
        <img
          src={ICON_SRC}
          alt="Orca"
          draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'contain', borderRadius: '50%',
            filter: 'drop-shadow(0 0 40px rgba(124,58,237,0.35)) drop-shadow(0 0 90px rgba(0,0,0,0.9))',
            animation: igniting
              ? `orcagate-spin ${IGNITE_MS}ms cubic-bezier(0.45,0,0.9,0.35) both`
              : opening ? undefined
              : 'orcagate-breathe 3.4s ease-in-out infinite',
            opacity: opening ? 0 : 1,
            transition: opening ? 'opacity 180ms ease-out' : undefined,
          }}
        />
      </div>

      {/* Faint hint — appears only at rest, invites the tap without a button */}
      {phase === 'idle' && !reduced && (
        <div
          style={{
            position: 'absolute', bottom: '14%', left: 0, right: 0, textAlign: 'center',
            color: '#b9a6ee', fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase',
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
