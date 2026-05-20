/**
 * OracleSession — full-screen calibration modal.
 * Glass terminal aesthetic, ESC to abandon, lock state shows blueprint stub.
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOracleSession } from '@/hooks/use-oracle-session';
import { OracleNodeCard } from './OracleNodeCard';
import { OracleProgressArc } from './OracleProgressArc';

interface Props {
  open: boolean;
  onClose: () => void;
  lang: 'he' | 'en';
}

export function OracleSession({ open, onClose, lang }: Props) {
  const {
    loading, starting, session, currentNode, confidence, totalAnswered,
    start, answer, skip, isLocked,
  } = useOracleSession();
  const isRTL = lang === 'he';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-2xl animate-in fade-in-0 duration-300"
      role="dialog"
      aria-modal="true"
    >
      {/* Hairline frame */}
      <div className="absolute inset-4 md:inset-8 border border-foreground/10 rounded-xl pointer-events-none" />

      {/* Top bar */}
      <header
        dir={isRTL ? 'rtl' : 'ltr'}
        className="absolute top-6 md:top-10 left-6 md:left-12 right-6 md:right-12 flex items-center justify-between"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50">
          ◈ Oracle Core <span className="opacity-50 mx-2">/</span> {isRTL ? 'כיול' : 'Calibration'}
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="p-2 rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition"
        >
          <X size={16} />
        </button>
      </header>

      {/* Main */}
      <div className="relative w-full h-full flex flex-col items-center justify-center px-4">
        {loading && (
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-foreground/50 animate-pulse">
            {isRTL ? 'טוען מטריצה...' : 'Loading matrix...'}
          </div>
        )}

        {!loading && !session && (
          <div className="text-center max-w-md">
            <OracleProgressArc confidence={0} depthScore={0} answered={0} />
            <h1 className="mt-6 text-3xl font-medium text-foreground">
              {isRTL ? 'כייל את ה-Oracle Core' : 'Calibrate Oracle Core'}
            </h1>
            <p className="mt-3 text-sm text-foreground/60 leading-relaxed">
              {isRTL
                ? 'מנוע אבחון התנהגותי שבונה DNA פסיכולוגי מדויק. 4 דקות. ללא תשובות נכונות.'
                : 'A behavioral diagnostic engine that builds your precise psychological DNA. 4 minutes. No right answers.'}
            </p>
            <button
              onClick={start}
              disabled={starting}
              className="mt-8 px-8 py-3 rounded-md bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em] hover:opacity-90 transition disabled:opacity-50"
            >
              {starting ? (isRTL ? 'מאתחל...' : 'Initializing...') : (isRTL ? 'התחלת כיול' : 'Begin Calibration')}
            </button>
          </div>
        )}

        {!loading && session && currentNode && !isLocked && (
          <div className="w-full flex flex-col items-center">
            <OracleProgressArc confidence={confidence} depthScore={session.depth_score} answered={totalAnswered} />
            <OracleNodeCard
              node={currentNode}
              lang={lang}
              onAnswer={answer}
              onSkip={skip}
            />
          </div>
        )}

        {!loading && session && isLocked && (
          <div className="text-center max-w-md">
            <OracleProgressArc confidence={Math.max(confidence, 0.92)} depthScore={session.depth_score} answered={totalAnswered} />
            <h1 className="mt-6 text-3xl font-medium text-foreground">
              {isRTL ? 'הכיול נעול' : 'Calibration Locked'}
            </h1>
            <p className="mt-3 text-sm text-foreground/60 leading-relaxed">
              {isRTL
                ? 'ה-DNA שלך מסונתז. ה-Coach יכויל מחדש בעוד רגע.'
                : 'Your DNA is synthesizing. The Coach will recalibrate momentarily.'}
            </p>
            <button
              onClick={onClose}
              className="mt-8 px-8 py-3 rounded-md bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.25em] hover:opacity-90 transition"
            >
              {isRTL ? 'סיום' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
