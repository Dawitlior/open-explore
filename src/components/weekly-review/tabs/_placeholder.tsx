// Shared placeholder used by every tab stub until its native build lands.
// Kept here so removing a stub is a one-file change.

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T: any;
  isRTL: boolean;
  he: { title: string; body: string };
  en: { title: string; body: string };
}

export function TabPlaceholder({ T, isRTL, he, en }: Props) {
  const t = isRTL ? he : en;
  const accent = T?.accent?.cyan || '#00f2ff';
  const muted = T?.text?.muted || '#7a8aa3';
  const fg = T?.text?.primary || '#e9eef7';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';

  return (
    <div
      style={{
        padding: 'clamp(20px, 4vw, 36px)',
        border: `1px solid ${border}`,
        borderRadius: 16,
        background: panel,
        textAlign: isRTL ? 'right' : 'left',
        maxWidth: 760,
        margin: '24px auto',
      }}
    >
      <div style={{ color: accent, fontSize: 11, letterSpacing: 3, fontWeight: 700, marginBottom: 10 }}>
        {isRTL ? 'בבנייה' : 'IN PROGRESS'}
      </div>
      <h2 style={{ margin: 0, color: fg, fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700 }}>
        {t.title}
      </h2>
      <p style={{ marginTop: 14, color: muted, fontSize: 14, lineHeight: 1.7 }}>
        {t.body}
      </p>
    </div>
  );
}
