// Reusable cyan-accented section title used across the legacy weekly review.
// Renders an inline horizontal rule under the title for the terminal look.

interface Props {
  title: string;
  emoji?: string;
  T: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isRTL: boolean;
  accent?: string;
}

export function SectionTitle({ title, emoji, T, isRTL, accent }: Props) {
  const a = accent || T?.accent?.cyan || '#39FF14';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  return (
    <div style={{ marginTop: 8, marginBottom: 14 }}>
      <div style={{
        display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{
          color: a, fontSize: 12, fontWeight: 700, letterSpacing: 2,
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}
          <span>{title}</span>
        </div>
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg, ${a}66, ${border})`, marginTop: 6 }} />
    </div>
  );
}
