import { useDeploymentWatcher } from '@/hooks/use-deployment-watcher';

interface Props {
  isRTL?: boolean;
}

/**
 * Pulsing amber badge shown in the topbar when a newer build of the app is
 * detected on the server. Clicking performs a cache-busting reload.
 */
export const DeploymentBadge = ({ isRTL = false }: Props) => {
  const { hasNewDeployment, reload } = useDeploymentWatcher();
  if (!hasNewDeployment) return null;

  const label = isRTL ? 'מערכת התעדכנה — לחץ לרענון' : 'System updated — click to refresh';

  return (
    <>
      <style>{`
        @keyframes orcaDeployPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,200,87,0.55), 0 0 14px rgba(255,200,87,0.35); }
          50% { box-shadow: 0 0 0 8px rgba(255,200,87,0), 0 0 22px rgba(255,200,87,0.65); }
        }
        @keyframes orcaDeploySpin { to { transform: rotate(360deg); } }
      `}</style>
      <button
        onClick={reload}
        aria-label={label}
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px 6px 8px',
          borderRadius: 999,
          border: '1px solid rgba(255,200,87,0.45)',
          background: 'linear-gradient(135deg, rgba(255,200,87,0.18), rgba(255,77,79,0.10))',
          color: '#FFC857',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '0.5px',
          cursor: 'pointer',
          animation: 'orcaDeployPulse 2.2s ease-in-out infinite',
          transition: 'transform .15s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span
          style={{
            display: 'inline-flex',
            width: 18,
            height: 18,
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFC857',
            animation: 'orcaDeploySpin 3.5s linear infinite',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
        </span>
        <span>{label}</span>
      </button>
    </>
  );
};
