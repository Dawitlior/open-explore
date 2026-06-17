import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDeploymentWatcher } from '@/hooks/use-deployment-watcher';

/**
 * Centered "System Update Available" modal.
 * Replaces the previous side-toast with a branded, centered card that demands
 * attention without blocking interaction (user can dismiss with the X).
 */
interface Props {
  isRTL?: boolean;
}

type Phase = 'idle' | 'syncing' | 'done';

// Orca gold accent (matches the rest of the platform's premium chrome).
const ACCENT = '#E9C46A';   // warm gold
const ACCENT_DEEP = '#D4AF37';
const BG_DEEP = '#06131F';

export const DeploymentToast = ({ isRTL = false }: Props) => {
  const { hasNewDeployment, reload } = useDeploymentWatcher();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasNewDeployment) {
      setDismissed(false);
      const id = window.setTimeout(() => setMounted(true), 30);
      return () => window.clearTimeout(id);
    }
    setMounted(false);
  }, [hasNewDeployment]);

  // Escape to dismiss (non-blocking).
  useEffect(() => {
    if (!hasNewDeployment || dismissed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDismissed(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasNewDeployment, dismissed]);

  if (!hasNewDeployment || dismissed) return null;
  if (typeof document === 'undefined') return null;

  const t = (he: string, en: string) => (isRTL ? he : en);

  const titles: Record<Phase, string> = {
    idle: t('גרסה חדשה זמינה!', 'New Version Available!'),
    syncing: t('מסנכרן עדכון…', 'Syncing update…'),
    done: t('הושלם — טוען מחדש', 'Complete — reloading'),
  };

  const subtitles: Record<Phase, string> = {
    idle: t(
      'גרסה חדשה של Orca עלתה לאוויר. רענן כדי לקבל את כל הפיצ\'רים והשיפורים האחרונים.',
      'A new version of Orca is available. Refresh to get the latest features and improvements.',
    ),
    syncing: t('מושך את ה-bundle העדכני…', 'Pulling the latest bundle…'),
    done: t('המערכת עודכנה בהצלחה.', 'System refreshed successfully.'),
  };

  const handleUpdate = () => {
    if (phase !== 'idle') return;
    setPhase('syncing');
    window.setTimeout(() => {
      setPhase('done');
      window.setTimeout(() => reload(), 550);
    }, 700);
  };

  const ctaLabel = phase === 'idle'
    ? t('עדכן', 'Update')
    : phase === 'syncing'
      ? t('מעדכן…', 'Updating…')
      : t('טוען…', 'Loading…');

  return createPortal(
    <>
      <style>{`
        @keyframes orcaUpdateSlideIn {
          0%   { opacity: 0; transform: translateX(${isRTL ? '-' : ''}24px) translateY(8px); filter: blur(4px); }
          100% { opacity: 1; transform: translateX(0) translateY(0); filter: blur(0); }
        }
        @keyframes orcaUpdateGlow {
          0%, 100% { box-shadow: 0 10px 40px rgba(0,0,0,0.55), 0 0 0 1px ${ACCENT}33, 0 0 20px ${ACCENT}22; }
          50%      { box-shadow: 0 10px 40px rgba(0,0,0,0.55), 0 0 0 1px ${ACCENT}55, 0 0 32px ${ACCENT}40; }
        }
        @keyframes orcaUpdateSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-labelledby="orca-update-title"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: 20,
          [isRTL ? 'left' : 'right']: 20,
          zIndex: 99998,
          width: 'min(360px, calc(100vw - 32px))',
          padding: '16px 18px 16px',
          borderRadius: 14,
          background: `linear-gradient(165deg, ${BG_DEEP} 0%, #0b1729 100%)`,
          border: `1px solid ${ACCENT}33`,
          fontFamily: "'Poppins', 'Inter', sans-serif",
          color: '#f1f5f9',
          animation: mounted
            ? 'orcaUpdateSlideIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both, orcaUpdateGlow 3.2s ease-in-out 0.5s infinite'
            : 'none',
          opacity: mounted ? 1 : 0,
          pointerEvents: 'auto',
        }}
      >
        {/* Close (X) */}
        <button
          onClick={() => setDismissed(true)}
          aria-label={t('סגור', 'Close')}
          style={{
            position: 'absolute',
            top: 8,
            insetInlineEnd: 8,
            width: 24, height: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(241,245,249,0.78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(241,245,249,0.78)'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, paddingInlineEnd: 24 }}>
          <span style={{ fontSize: 20, lineHeight: 1, filter: `drop-shadow(0 0 8px ${ACCENT}66)` }} aria-hidden>🎉</span>
          <h2
            id="orca-update-title"
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.005em',
              lineHeight: 1.25,
            }}
          >
            {titles[phase]}
          </h2>
        </div>

        {/* Subtitle */}
        <p style={{
          margin: '0 0 12px',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'rgba(241,245,249,0.7)',
        }}>
          {subtitles[phase]}
        </p>

        {/* CTA */}
        <button
          onClick={handleUpdate}
          disabled={phase !== 'idle'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            borderRadius: 10,
            background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DEEP} 100%)`,
            border: 'none',
            color: '#1a1505',
            fontSize: 12.5,
            fontWeight: 800,
            fontFamily: "'Poppins', sans-serif",
            letterSpacing: '0.01em',
            cursor: phase === 'idle' ? 'pointer' : 'wait',
            boxShadow: `0 6px 18px ${ACCENT}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: phase === 'idle' ? 1 : 0.85,
          }}
          onMouseEnter={(e) => { if (phase === 'idle') { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 26px ${ACCENT}80, inset 0 1px 0 rgba(255,255,255,0.4)`; } }}
          onMouseLeave={(e) => { if (phase === 'idle') { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 18px ${ACCENT}55, inset 0 1px 0 rgba(255,255,255,0.35)`; } }}
        >
          <span>{ctaLabel}</span>
          {phase === 'syncing' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'orcaUpdateSpin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
          ) : phase === 'done' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
          )}
        </button>
      </div>
    </>,
    document.body,
  );
};
