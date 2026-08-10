import { BugBoard } from '@/features/bug-arena';
import { useNavigate, Navigate } from 'react-router-dom';
import { useLang } from '@/hooks/use-lang';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const BUG_BOARD_ALLOWED_EMAIL = 'dawitlior777@gmail.com';

export default function BugBoardPage() {
  const navigate = useNavigate();
  const { isRTL, t } = useLang();
  const { user, loading } = useAuth() as any;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (loading) return null;
  if ((user?.email || '').toLowerCase() !== BUG_BOARD_ALLOWED_EMAIL) return <Navigate to="/" replace />;


  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-foreground/10 bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:border-[#37e0c6]/60 hover:text-[#37e0c6]"
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
