import type { RecalSignal } from '@/hooks/use-recalibration-trigger';

type Props = {
  signal: RecalSignal;
  lang: 'he' | 'en';
  onCalibrate: () => void;
};

export function RecalibrationBanner({ signal, lang, onCalibrate }: Props) {
  if (!signal) return null;
  const isHe = lang === 'he';
  const text = isHe ? signal.reason_he : signal.reason;
  const color = signal.severity === 'warn' ? '#fbbf24' : '#22d3ee';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: `${color}12`, border: `1px solid ${color}44`,
        borderRadius: 12, marginBottom: 12, color: '#f5f3ee',
        fontSize: 12, fontWeight: 500, direction: isHe ? 'rtl' : 'ltr',
      }}
    >
      <span style={{ fontSize: 16, color }}>◈</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        onClick={onCalibrate}
        style={{
          padding: '6px 14px', borderRadius: 8, border: `1px solid ${color}`,
          background: `${color}22`, color, fontSize: 11, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        {isHe ? 'התחל' : 'Begin'}
      </button>
    </div>
  );
}
