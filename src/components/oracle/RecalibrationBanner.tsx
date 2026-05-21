/**
 * Slim banner surfacing Oracle recalibration signal. Sits at the top of
 * the Calendar Hub & Settings → Diagnostics tab.
 */
import type { RecalibrationSignal } from '@/hooks/use-recalibration-trigger';

interface Props {
  signal: RecalibrationSignal;
  lang: 'he' | 'en';
  onCalibrate: () => void;
  onDismiss?: () => void;
}

export function RecalibrationBanner({ signal, lang, onCalibrate, onDismiss }: Props) {
  if (signal.level === 'none') return null;
  const isRTL = lang === 'he';
  const isHigh = signal.level === 'high';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={[
        'relative w-full rounded-lg border px-4 py-3 flex items-center gap-3 mb-4',
        isHigh
          ? 'border-amber-500/30 bg-amber-500/[0.06]'
          : 'border-foreground/10 bg-foreground/[0.03]',
      ].join(' ')}
    >
      <span className={isHigh ? 'text-amber-400 text-base' : 'text-foreground/60 text-base'}>◈</span>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/50">
          Oracle Core
        </div>
        <div className="text-[13px] text-foreground/85 mt-0.5 truncate">
          {isRTL ? signal.reason_he : signal.reason}
        </div>
      </div>
      <button
        onClick={onCalibrate}
        className={[
          'px-3 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-[0.2em] transition',
          isHigh
            ? 'bg-amber-500 text-background hover:opacity-90'
            : 'border border-foreground/20 text-foreground/80 hover:bg-foreground/5',
        ].join(' ')}
      >
        {isRTL ? 'כייל' : 'Calibrate'}
      </button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="dismiss"
          className="p-1 text-foreground/30 hover:text-foreground/70"
        >
          ×
        </button>
      )}
    </div>
  );
}
