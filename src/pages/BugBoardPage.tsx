import { BugBoard } from '@/features/bug-arena';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/hooks/use-lang';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function BugBoardPage() {
  const navigate = useNavigate();
  const { isRTL, t } = useLang();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#070b12] text-[#e8edf5]">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#070b12]/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-[#37e0c6]/60 hover:text-[#37e0c6]"
        >
          <BackIcon className="h-4 w-4" />
          <span>{t('חזור לפלטפורמה', 'Back to platform')}</span>
        </button>
        <h1 className="text-base font-extrabold tracking-wide text-[#f5c542]">
          {t('לוח באגים', 'Bug Board')}
        </h1>
        <span className="w-[120px]" aria-hidden />
      </header>
      <BugBoard />
    </div>
  );
}
