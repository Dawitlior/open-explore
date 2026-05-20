/**
 * OracleProgressArc — depth visualization.
 * Three-layer arc: Surface → Core → Shadow, fills with confidence.
 */
interface Props {
  confidence: number;   // 0..1
  depthScore: number;
  answered: number;
}

export function OracleProgressArc({ confidence, depthScore, answered }: Props) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, confidence));
  const layer = confidence < 0.33 ? 'SURFACE' : confidence < 0.66 ? 'CORE' : 'SHADOW';
  const colour = confidence < 0.33 ? 'hsl(195 100% 60%)' : confidence < 0.66 ? 'hsl(265 90% 70%)' : 'hsl(345 90% 65%)';
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} stroke="hsl(220 30% 18%)" strokeWidth="3" fill="none" />
        <circle
          cx="50" cy="50" r={R}
          stroke={colour}
          strokeWidth="3"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.16,1,.3,1), stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-[10px] uppercase tracking-widest" style={{ color: colour }}>
        <span className="text-xs font-semibold">{Math.round(confidence * 100)}%</span>
        <span className="opacity-60">{layer}</span>
        <span className="opacity-40 text-[9px]">{answered}/d{depthScore}</span>
      </div>
    </div>
  );
}
