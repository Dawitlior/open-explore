import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

/**
 * IdleTimeoutManager
 * - Tracks user activity globally.
 * - After IDLE_MS of inactivity, shows an animated popup with a countdown.
 * - If the user clicks "אני פה" before the countdown ends, session continues.
 * - Otherwise, signs out and navigates to /auth?idle=1 (the "second opening screen").
 */

const IDLE_MS = 50_000;        // 50s of inactivity → show warning
const COUNTDOWN_SEC = 10;      // then 10s countdown → total 60s

interface Props {
  isRTL?: boolean;
  lang?: 'he' | 'en';
}

export function IdleTimeoutModal({ isRTL = true, lang = 'he' }: Props) {
  const [showWarning, setShowWarning] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN_SEC);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { signOut, session } = useAuth();

  const t = (he: string, en: string) => (lang === 'he' ? he : en);

  const clearAll = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startIdleTimer = useCallback(() => {
    clearAll();
    timerRef.current = window.setTimeout(() => {
      setSeconds(COUNTDOWN_SEC);
      setShowWarning(true);
    }, IDLE_MS);
  }, [clearAll]);

  const handleStayActive = useCallback(() => {
    setShowWarning(false);
    startIdleTimer();
  }, [startIdleTimer]);

  const handleTimeout = useCallback(async () => {
    clearAll();
    setShowWarning(false);
    try { await signOut(); } catch { /* noop */ }
    navigate('/auth?idle=1', { replace: true });
  }, [clearAll, navigate, signOut]);

  // Activity listeners — only when session active and warning is not shown
  useEffect(() => {
    if (!session) { clearAll(); return; }

    const onActivity = () => { if (!showWarning) startIdleTimer(); };
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    startIdleTimer();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, onActivity));
      clearAll();
    };
  }, [session, showWarning, startIdleTimer, clearAll]);

  // Countdown
  useEffect(() => {
    if (!showWarning) return;
    setSeconds(COUNTDOWN_SEC);
    countdownRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          handleTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [showWarning, handleTimeout]);

  if (!showWarning || !session) return null;

  const pct = (seconds / COUNTDOWN_SEC) * 100;

  return (
    <>
      <style>{`
        @keyframes orca-idle-pop {
          0% { opacity: 0; transform: scale(0.6) translateY(40px); }
          60% { opacity: 1; transform: scale(1.06) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes orca-idle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0.55), 0 30px 80px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 0 18px rgba(56,189,248,0), 0 30px 80px rgba(0,0,0,0.6); }
        }
        @keyframes orca-idle-fadebg {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(10px); }
        }
        @keyframes orca-idle-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes orca-idle-ring {
          from { stroke-dashoffset: 0; }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(circle at 50% 50%, rgba(8,14,26,0.85), rgba(0,0,0,0.92))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'orca-idle-fadebg 0.3s ease forwards',
          direction: isRTL ? 'rtl' : 'ltr',
          fontFamily: '"Poppins", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 'min(420px, 92vw)',
            background: 'linear-gradient(165deg, rgba(15,24,44,0.96), rgba(8,14,26,0.98))',
            border: '1px solid rgba(125,160,220,0.22)',
            borderRadius: 28,
            padding: '32px 28px 28px',
            color: '#e6edf6',
            animation: 'orca-idle-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards, orca-idle-pulse 2.2s ease-in-out 0.5s infinite',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Shine sweep */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(120deg, transparent 30%, rgba(56,189,248,0.18) 50%, transparent 70%)',
            animation: 'orca-idle-shine 2.4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Countdown ring */}
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 18px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke="url(#orca-idle-grad)"
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={(1 - pct / 100) * 2 * Math.PI * 52}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
              <defs>
                <linearGradient id="orca-idle-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              fontFamily: '"IBM Plex Mono", monospace', fontSize: 42, fontWeight: 800,
              background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{seconds}</div>
          </div>

          <div style={{
            fontSize: 10, letterSpacing: '0.28em', color: '#38bdf8',
            fontWeight: 800, textTransform: 'uppercase', marginBottom: 8,
          }}>
            {t('עדיין כאן?', 'Still there?')}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            {t('היית בשקט יותר מדי זמן', "It's been quiet for a while")}
          </h2>

          <p style={{ fontSize: 13, color: '#7a8aa3', margin: '0 0 22px', lineHeight: 1.6 }}>
            {t(
              `נצא מהפלטפורמה בעוד ${seconds} שניות לאבטחתך. לחץ "אני פה" כדי להישאר.`,
              `We'll lock the platform in ${seconds}s for your safety. Tap "I'm here" to stay.`
            )}
          </p>

          <button
            onClick={handleStayActive}
            autoFocus
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 16,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
              color: '#04101f', fontSize: 15, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: '0 14px 36px rgba(56,189,248,0.45)',
              transition: 'transform .15s ease, box-shadow .15s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            👋 {t('אני פה', "I'm here")}
          </button>

          <button
            onClick={handleTimeout}
            style={{
              marginTop: 10, background: 'transparent', border: 'none',
              color: '#6b7c99', fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            {t('צא עכשיו', 'Log out now')}
          </button>
        </div>
      </div>
    </>
  );
}

export default IdleTimeoutModal;
