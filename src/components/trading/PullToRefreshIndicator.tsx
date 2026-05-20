interface Props {
  pull: number;
  progress: number;
  refreshing: boolean;
  color?: string;
}

/**
 * Visual indicator for pull-to-refresh.
 * Renders an iOS-style arc that fills with progress and spins while refreshing.
 */
export const PullToRefreshIndicator = ({ pull, progress, refreshing, color = '#22d3ee' }: Props) => {
  if (pull === 0 && !refreshing) return null;
  const size = 28;
  const r = 11;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: pull,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 8,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      <svg
        width={size} height={size} viewBox="0 0 28 28"
        style={{
          animation: refreshing ? 'orca-spin 0.9s linear infinite' : undefined,
          opacity: 0.9,
        }}
      >
        <circle cx="14" cy="14" r={r} stroke={`${color}25`} strokeWidth="2.5" fill="none" />
        <circle
          cx="14" cy="14" r={r}
          stroke={color} strokeWidth="2.5" fill="none"
          strokeDasharray={`${refreshing ? c * 0.3 : dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
        />
      </svg>
    </div>
  );
};
