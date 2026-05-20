/**
 * Live telemetry HUD — appears under the question card.
 * Pure visual: receives values, no internal state.
 */
interface Props {
  latencyMs: number;
  hoverCount: number;
  changedMind: number;
  isRTL?: boolean;
}

export function OracleTelemetryStrip({ latencyMs, hoverCount, changedMind, isRTL }: Props) {
  return (
    <div
      dir="ltr"
      className="flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 select-none"
    >
      <span>t {(latencyMs / 1000).toFixed(1)}s</span>
      <span className="opacity-40">·</span>
      <span>hover {hoverCount}</span>
      <span className="opacity-40">·</span>
      <span>flip {changedMind}</span>
    </div>
  );
}
