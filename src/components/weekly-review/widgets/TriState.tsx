// Tri-state checklist item: 0 — / 1 ✅ / 2 ❌. Click to cycle.
// Background tints to match Orca status colors when set.

interface Props {
  state: number;                 // 0 / 1 / 2
  label: string;
  onCycle: () => void;
  tag?: string;                  // optional small pill (e.g. "P" / "S")
  T: any;                        // eslint-disable-line @typescript-eslint/no-explicit-any
  goodIs?: 1 | 2;                // which state is "good" — drives the tint logic
  isRTL: boolean;
}

const ICON = ['—', '✅', '❌'];

export function TriState({ state, label, onCycle, tag, T, goodIs = 1, isRTL }: Props) {
  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const win = T?.status?.success || '#39FF14';
  const loss = T?.status?.danger || '#ff3b3b';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.03)';

  const isGood = state === goodIs;
  const isBad = state !== 0 && state !== goodIs;
  // Soft tint background — same restrained look as the "None" chip in
  // the Biggest-Mistake row (subtle fill + matching outline + tinted icon),
  // never a solid neon-green box that looks garish next to dark UI.
  const tint = state === 0
    ? panel
    : isGood ? `${win}1c` : `${loss}1c`;
  const tintBorder = state === 0
    ? border
    : isGood ? `${win}88` : `${loss}88`;
  const labelColor = state === 0 ? fg : isGood ? win : loss;
  const boxBg = state === 0 ? 'rgba(255,255,255,0.06)' : isGood ? `${win}26` : `${loss}26`;
  const boxColor = state === 0 ? muted : isGood ? win : loss;
  const boxBorder = state === 0 ? 'transparent' : isGood ? `${win}66` : `${loss}66`;

  return (
    <button
      type="button"
      onClick={onCycle}
      style={{
        all: 'unset', cursor: 'pointer', display: 'flex',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '12px 14px',
        background: tint, border: `1px solid ${tintBorder}`, borderRadius: 12,
        minHeight: 52, boxSizing: 'border-box', width: '100%',
        transition: 'all 180ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6, background: boxBg, color: boxColor,
          border: `1px solid ${boxBorder}`,
          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
        }}>{ICON[state]}</span>
        {tag && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: muted,
            border: `1px solid ${border}`, borderRadius: 6,
            padding: '2px 6px', minWidth: 18, textAlign: 'center',
          }}>{tag}</span>
        )}
      </div>
      <span style={{ color: labelColor, fontSize: 13, fontWeight: 500, textAlign: isRTL ? 'right' : 'left', flex: 1 }}>
        {label}
      </span>
    </button>
  );
}
