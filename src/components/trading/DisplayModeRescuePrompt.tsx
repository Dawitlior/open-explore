import { useDisplayMode } from '@/lib/display-mode';
import { useIsMobile } from '@/hooks/use-mobile';
import type { TradingTheme } from '@/lib/trading-theme';

interface DisplayModeRescuePromptProps {
  T: TradingTheme;
  isRTL: boolean;
  onOpenMobileSettings: () => void;
}

export function DisplayModeRescuePrompt({ T, isRTL, onOpenMobileSettings }: DisplayModeRescuePromptProps) {
  const isMobile = useIsMobile();
  const { setDisplayMode, recommendation } = useDisplayMode();

  if (!isMobile || !recommendation.shouldPrompt) return null;

  const target = recommendation.recommendedMode === 'R_MULTIPLE' ? 'R' : '$';
  const handleClick = () => {
    setDisplayMode(recommendation.recommendedMode);
    onOpenMobileSettings();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isRTL ? 'תקן מצב גרפים' : 'Fix chart mode'}
      style={{
        position: 'fixed',
        insetInline: 12,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
        zIndex: 120,
        display: 'grid',
        gridTemplateColumns: '34px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 14,
        border: `1px solid ${T.accent.cyan}66`,
        background: `linear-gradient(135deg, ${T.bg.secondary}f2, ${T.bg.primary}f5)`,
        color: T.text.primary,
        boxShadow: `0 14px 34px -18px rgba(0,0,0,.85), 0 0 22px -10px ${T.accent.cyan}`,
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: 'grid',
          placeItems: 'center',
          background: `${T.accent.cyan}18`,
          border: `1px solid ${T.accent.cyan}55`,
          color: T.accent.cyan,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 900,
        }}
      >
        {target}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 }}>
          {isRTL ? 'בעיה בגרפים?' : 'Charts look wrong?'}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 10.5, color: T.text.muted, lineHeight: 1.35 }}>
          {isRTL ? `הדאטה נראה מתאים ל־${target}. לחץ להחלפה ולהגדרות.` : `Data looks like ${target}. Tap to switch and open settings.`}
        </span>
      </span>
      <span style={{ color: T.accent.cyan, fontSize: 18, lineHeight: 1 }}>{isRTL ? '‹' : '›'}</span>
    </button>
  );
}