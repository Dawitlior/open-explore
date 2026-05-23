import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLang } from '@/hooks/use-lang';

/**
 * DesktopOnlyGate — blocks a surface on viewports under `minWidth` (default 1024 = `lg`).
 * Shows a branded Orca-style notice with a single "return" action.
 *
 * Usage:
 *   <DesktopOnlyGate onReturn={() => setActiveDimension('orca')}>
 *     <BacktestDimension ... />
 *   </DesktopOnlyGate>
 */
export function DesktopOnlyGate({
  children,
  onReturn,
  minWidth = 1024,
  featureLabel,
}: {
  children: ReactNode;
  onReturn?: () => void;
  minWidth?: number;
  featureLabel?: { he: string; en: string };
}) {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < minWidth,
  );
  const { lang } = useLang();
  const isRTL = lang === 'he';

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < minWidth);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [minWidth]);

  if (!isNarrow) return <>{children}</>;

  const title = featureLabel
    ? (isRTL ? featureLabel.he : featureLabel.en)
    : (isRTL ? 'בקטסט' : 'Backtest');

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[210] flex items-center justify-center bg-background/95 backdrop-blur-md p-6"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-border bg-card text-foreground p-6 shadow-2xl"
        style={{ background: '#061326' }}
      >
        <div
          className="text-[10px] tracking-[0.28em] uppercase text-primary font-mono mb-3"
        >
          ◈ {isRTL ? 'נדרשת מערכת שולחנית' : 'Precision Required'}
        </div>
        <h2 className="text-lg font-bold mb-3 leading-snug">
          {title} {isRTL ? '' : '—'} {isRTL ? 'דורש סביבת שולחן עבודה' : 'desktop environment'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-mono">
          {isRTL
            ? 'מודול זה דורש מסך גדול ומדויק לניתוח מולטי-פריים. פתח את Orca על מחשב נייד או מסך גדול יותר כדי לגשת לסביבת העבודה.'
            : 'This surface requires a larger display for chart precision and multi-frame analysis. Open Orca on a laptop or larger display to access this workspace.'}
        </p>
        {onReturn && (
          <button
            onClick={onReturn}
            className="w-full rounded-lg border border-border bg-secondary hover:bg-muted/60 transition-colors py-3 text-sm font-semibold tracking-wide"
          >
            {isRTL ? '↩ חזרה למסך הראשי' : '↩ return to dashboard'}
          </button>
        )}
      </div>
    </div>
  );
}

export default DesktopOnlyGate;
