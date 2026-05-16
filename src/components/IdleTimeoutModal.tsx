import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * IdleTimeoutManager
 * - Tracks user activity globally.
 * - After IDLE_MS of inactivity, shows an animated popup with a countdown.
 * - If the user clicks "אני פה" before the countdown ends, session continues.
 * - If the countdown expires, we DO NOT sign the user out. Instead we display
 *   a "ברוך שובך" lock overlay; clicking the button dismisses it and returns
 *   the user straight back to the platform (still authenticated).
 */

const IDLE_MS = 50_000;        // 50s of inactivity → show warning
const COUNTDOWN_SEC = 10;      // then 10s countdown → total 60s

interface Props {
  isRTL?: boolean;
  lang?: 'he' | 'en';
}

type Stage = 'idle' | 'warning' | 'locked';

export function IdleTimeoutModal({ isRTL = true, lang = 'he' }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [seconds, setSeconds] = useState(COUNTDOWN_SEC);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const { session } = useAuth();

  const t = (he: string, en: string) => (lang === 'he' ? he : en);

  const clearAll = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startIdleTimer = useCallback(() => {
    clearAll();
    timerRef.current = window.setTimeout(() => {
      setSeconds(COUNTDOWN_SEC);
      setStage('warning');
    }, IDLE_MS);
  }, [clearAll]);

  const handleStayActive = useCallback(() => {
    setStage('idle');
    startIdleTimer();
  }, [startIdleTimer]);

  const handleResume = useCallback(() => {
    setStage('idle');
    startIdleTimer();
  }, [startIdleTimer]);

  const handleTimeout = useCallback(() => {
    clearAll();
    setStage('locked');
  }, [clearAll]);

  // Activity listeners — only when session active and no overlay shown
  useEffect(() => {
    if (!session) { clearAll(); return; }

    const onActivity = () => { if (stage === 'idle') startIdleTimer(); };
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    if (stage === 'idle') startIdleTimer();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, onActivity));
      clearAll();
    };
  }, [session, stage, startIdleTimer, clearAll]);

  // Countdown
  useEffect(() => {
    if (stage !== 'warning') return;
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
  }, [stage, handleTimeout]);

  if (stage === 'idle' || !session) return null;

  const isWarning = stage === 'warning';
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
        @keyframes orca-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-18deg); }
          75% { transform: rotate(14deg); }
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
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(120deg, transparent 30%, rgba(56,189,248,0.18) 50%, transparent 70%)',
            animation: 'orca-idle-shine 2.4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {isWarning ? (
            <>
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
                  `ננעל את המסך בעוד ${seconds} שניות. לחץ "אני פה" כדי להמשיך.`,
                  `We'll lock the screen in ${seconds}s. Tap "I'm here" to keep going.`
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
                  fontFamily: 'inherit',
                }}
              >
                👋 {t('אני פה', "I'm here")}
              </button>
            </>
          ) : (
            <>
              <div style={{
                fontSize: 56, margin: '4px 0 14px',
                display: 'inline-block', transformOrigin: '70% 70%',
                animation: 'orca-wave 1.6s ease-in-out infinite',
              }}>👋</div>

              <div style={{
                fontSize: 10, letterSpacing: '0.28em', color: '#38bdf8',
                fontWeight: 800, textTransform: 'uppercase', marginBottom: 8,
              }}>
                {t('ברוך שובך', 'Welcome back')}
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                {t('המסך ננעל בזמן ההפסקה', 'We paused while you were away')}
              </h2>

              <p style={{ fontSize: 13, color: '#7a8aa3', margin: '0 0 22px', lineHeight: 1.6 }}>
                {t(
                  'כל הנתונים שלך שמורים. לחץ להמשיך בדיוק מאיפה שעצרת — בלי צורך להתחבר מחדש.',
                  'All your data is safe. Tap to pick up exactly where you left off — no need to sign in again.'
                )}
              </p>

              <button
                onClick={handleResume}
                autoFocus
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 16,
                  border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                  color: '#04101f', fontSize: 15, fontWeight: 800, letterSpacing: '0.02em',
                  boxShadow: '0 14px 36px rgba(56,189,248,0.45)',
                  fontFamily: 'inherit',
                }}
              >
                {t('חזרה לפלטפורמה', 'Back to the platform')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default IdleTimeoutModal;
