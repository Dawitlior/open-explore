import { useEffect, useState } from 'react';
import { useDeploymentWatcher } from '@/hooks/use-deployment-watcher';

/**
 * Floating bottom-right system update toast.
 * Replaces the legacy topbar DeploymentBadge with a sleek glassy card
 * that slides in from the right and pulses with the Orca Neon accent.
 *
 * States:
 *  - hidden  → no new deployment detected
 *  - idle    → new deployment detected, prompting the user
 *  - syncing → user clicked refresh, syncing
 *  - done    → completion flash before the page actually reloads
 */
interface Props {
  isRTL?: boolean;
}

type Phase = 'idle' | 'syncing' | 'done';

export const DeploymentToast = ({ isRTL = false }: Props) => {
  const { hasNewDeployment, reload } = useDeploymentWatcher();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (hasNewDeployment) {
      // microtask delay so the entry animation actually plays
      const id = window.setTimeout(() => setMounted(true), 30);
      return () => window.clearTimeout(id);
    }
    setMounted(false);
  }, [hasNewDeployment]);

  if (!hasNewDeployment) return null;

  const t = (he: string, en: string) => (isRTL ? he : en);

  const titles: Record<Phase, string> = {
    idle: t('עדכון מערכת זמין', 'System Update Available'),
    syncing: t('מסנכרן עדכון…', 'Syncing update…'),
    done: t('הושלם — טוען מחדש', 'Complete — reloading'),
  };

  const subtitles: Record<Phase, string> = {
    idle: t('גרסה חדשה של Orca עלתה לאוויר. לחץ כדי לרענן.', 'A fresh build of Orca is live. Refresh to load it.'),
    syncing: t('מושך את ה־bundle העדכני…', 'Pulling the latest bundle…'),
    done: t('המערכת עודכנה בהצלחה.', 'System refreshed successfully.'),
  };

  const handleClick = () => {
    if (phase !== 'idle') return;
    setPhase('syncing');
    // short visual beat, then trigger the actual cache-busting reload
    window.setTimeout(() => {
      setPhase('done');
      window.setTimeout(() => reload(), 550);
    }, 700);
  };

  const CYAN = '#00f2ff';
  const TEAL = '#06d6a0';
  const GREEN = '#00FFA3';
  const accent = phase === 'done' ? GREEN : CYAN;

  return (
    <>
      <style>{`
        @keyframes orcaToastIn {
          0% { transform: translate3d(120%, 0, 0) scale(0.92); opacity: 0; }
          60% { transform: translate3d(-6%, 0, 0) scale(1.02); opacity: 1; }
          100% { transform: translate3d(0,0,0) scale(1); opacity: 1; }
        }
        @keyframes orcaToastGlow {
          0%, 100% { box-shadow: 0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px ${accent}40, 0 0 22px ${accent}45, 0 0 60px ${accent}25; }
          50%      { box-shadow: 0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px ${accent}70, 0 0 36px ${accent}80, 0 0 80px ${accent}40; }
        }
        @keyframes orcaToastSpin { to { transform: rotate(360deg); } }
        @keyframes orcaToastPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
        @keyframes orcaToastTick {
          0% { stroke-dashoffset: 28; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={handleClick}
        style={{
          position: 'fixed',
          bottom: 24,
          insetInlineEnd: 24,
          zIndex: 99998,
          minWidth: 280,
          maxWidth: 360,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(6,19,38,0.92), rgba(11,23,48,0.92))',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          color: '#f1f5f9',
          fontFamily: "'Poppins', 'Inter', sans-serif",
          cursor: phase === 'idle' ? 'pointer' : 'default',
          transform: mounted ? 'translate3d(0,0,0) scale(1)' : 'translate3d(120%, 0, 0) scale(0.92)',
          opacity: mounted ? 1 : 0,
          animation: mounted
            ? `orcaToastIn 0.55s cubic-bezier(0.16,1,0.3,1) both, orcaToastGlow 2.4s ease-in-out 0.6s infinite`
            : 'none',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
        }}
        onMouseEnter={e => { if (phase === 'idle') (e.currentTarget as HTMLDivElement).style.transform = 'translate3d(0,0,0) scale(1.03)'; }}
        onMouseLeave={e => { if (phase === 'idle') (e.currentTarget as HTMLDivElement).style.transform = 'translate3d(0,0,0) scale(1)'; }}
      >
        {/* Icon */}
        <div
          style={{
            flexShrink: 0,
            width: 40, height: 40,
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${accent}22, ${TEAL}11)`,
            border: `1px solid ${accent}55`,
            color: accent,
          }}
        >
          {phase === 'syncing' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'orcaToastSpin 1.1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
          ) : phase === 'done' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" strokeDasharray="28" style={{ animation: 'orcaToastTick 0.5s ease-out forwards' }} />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'orcaToastPulse 2s ease-in-out infinite' }}>
              <path d="M12 3v12" />
              <path d="m6 9 6-6 6 6" />
              <rect x="3" y="17" width="18" height="4" rx="1" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
            {titles[phase]}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(241,245,249,0.78)', lineHeight: 1.45 }}>
            {subtitles[phase]}
          </div>
        </div>

        {/* CTA chip */}
        {phase === 'idle' && (
          <div
            style={{
              flexShrink: 0,
              padding: '6px 11px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${CYAN}, ${TEAL})`,
              color: '#06131F',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.5px',
              boxShadow: `0 4px 14px ${CYAN}55`,
            }}
          >
            {t('רענן', 'REFRESH')}
          </div>
        )}
      </div>
    </>
  );
};
