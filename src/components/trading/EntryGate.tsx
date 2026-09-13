import { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
   EntryGate — a clean, premium brand preloader (not a click-gate). The Orca mark
   settles on a soft light screen with a gentle glow + a single shimmer sweep,
   holds for a beat (and until the app signals ready), then the whole curtain
   slides up to reveal the platform. Auto — no interaction. Honours reduced
   motion. Same contract as before (onEnter + sessionStorage 'orca-entered').
   ========================================================================== */

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
  ready?: boolean;
}

type Phase = 'show' | 'reveal' | 'done';

const HOLD_MS = 1150;   // minimum time the mark is shown
const REVEAL_MS = 780;  // curtain slide-up
const CAP_MS = 4000;    // never wait longer than this for `ready`
const VIOLET = '#7c3aed';

export const EntryGate = ({ onEnter, ready = true }: EntryGateProps) => {
  const [phase, setPhase] = useState<Phase>('show');
  const enteredRef = useRef(false);
  const mountRef = useRef(performance.now());

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.body?.getAttribute('data-reduce-motion') === '1'),
    [],
  );

  // Enter immediately for reduced motion.
  useEffect(() => {
    if (reduced && !enteredRef.current) {
      enteredRef.current = true;
      try { sessionStorage.setItem('orca-entered', '1'); } catch { /* noop */ }
      onEnter();
      setPhase('done');
    }
  }, [reduced, onEnter]);

  // Start the reveal once we've held long enough AND the app is ready.
  useEffect(() => {
    if (reduced || phase !== 'show') return;
    const elapsed = performance.now() - mountRef.current;
    const wait = ready ? Math.max(0, HOLD_MS - elapsed) : Math.max(0, CAP_MS - elapsed);
    const t = window.setTimeout(() => setPhase('reveal'), wait);
    return () => window.clearTimeout(t);
  }, [ready, phase, reduced]);

  // During the reveal, hand control to the app partway, then unmount.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t1 = window.setTimeout(() => {
      if (enteredRef.current) return;
      enteredRef.current = true;
      try { sessionStorage.setItem('orca-entered', '1'); } catch { /* noop */ }
      onEnter();
    }, Math.round(REVEAL_MS * 0.45));
    const t2 = window.setTimeout(() => setPhase('done'), REVEAL_MS + 40);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [phase, onEnter]);

  if (phase === 'done') return null;

  const revealing = phase === 'reveal';

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background:
          'radial-gradient(760px 520px at 50% 42%, rgba(124,58,237,0.10), transparent 60%), #f6f6f8',
        transform: revealing ? 'translateY(-100%)' : 'translateY(0)',
        transition: revealing ? `transform ${REVEAL_MS}ms cubic-bezier(0.7,0,0.2,1)` : undefined,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes orca-enter-in { 0% { opacity: 0; transform: translateY(10px) scale(0.94); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes orca-enter-glow { 0%,100% { opacity: .5; transform: translate(-50%,-50%) scale(1); } 50% { opacity: .9; transform: translate(-50%,-50%) scale(1.1); } }
        @keyframes orca-enter-shimmer { 0% { transform: translateX(-160%) skewX(-18deg); } 100% { transform: translateX(160%) skewX(-18deg); } }
        @keyframes orca-enter-bar { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, animation: 'orca-enter-in 0.7s cubic-bezier(0.22,1,0.36,1) both' }}>
        {/* glow */}
        <div
          style={{
            position: 'absolute', top: '38%', left: '50%', width: 300, height: 300, borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${VIOLET}33 0%, transparent 62%)`,
            filter: 'blur(6px)', animation: 'orca-enter-glow 3s ease-in-out infinite', pointerEvents: 'none',
          }}
        />
        {/* mark + wordmark */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden', padding: '4px 2px' }}>
          <img src="/orca-icon.png" alt="Orca" width={56} height={56} style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 30px ${VIOLET}44` }} />
          <span style={{ fontFamily: "'Inter Tight','Inter',system-ui,sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f1116' }}>
            Orca Investment
          </span>
          {/* shimmer sweep */}
          <span
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: '60%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
              animation: 'orca-enter-shimmer 1.5s ease-in-out 0.5s both', pointerEvents: 'none',
            }}
          />
        </div>
        {/* thin progress bar */}
        <span style={{ position: 'relative', width: 132, height: 3, borderRadius: 99, background: 'rgba(15,17,22,0.08)', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 99, background: `linear-gradient(90deg, ${VIOLET}, #a78bfa)`, transformOrigin: 'left', animation: `orca-enter-bar ${HOLD_MS}ms cubic-bezier(0.4,0,0.2,1) both` }} />
        </span>
      </div>
    </div>
  );
};

export default EntryGate;
