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
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 8, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isRTL ? 'flex-start' : 'flex-start',
        gap: 8,
        color: a, fontSize: 12, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}
        <span>{title}</span>
      </div>
      <div style={{
        height: 1,
        background: isRTL
          ? `linear-gradient(270deg, ${a}66, ${border})`
          : `linear-gradient(90deg, ${a}66, ${border})`,
        marginTop: 6,
      }} />
    </div>
  );
}
