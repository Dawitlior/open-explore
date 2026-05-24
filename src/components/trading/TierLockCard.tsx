/**
 * TierLockCard — shared upsell card shown anywhere a feature is locked
 * behind a higher tier. Drop in place of the gated content.
 */
import type { TradingTheme } from '@/lib/trading-theme';
import type { Tier } from '@/hooks/use-settings';
import { nextTier, tierLabel, type Feature } from '@/lib/tier-access';

interface TierLockCardProps {
  T: TradingTheme;
  isRTL: boolean;
  currentTier: Tier;
  feature: Feature;
  featureLabel?: { he: string; en: string };
  onUpgrade?: () => void;
}

const FEATURE_BLURB: Record<Feature, { he: string; en: string }> = {
  calendar:              { he: 'לוח שנה',        en: 'Calendar' },
  journal:               { he: 'יומן',           en: 'Journal' },
  risk_meter:            { he: 'מד סיכון',       en: 'Risk Meter' },
  economic_radar:        { he: 'מכ״ם כלכלי',     en: 'Economic Radar' },
  economic_radar_alerts: { he: 'התראות מכ״ם',    en: 'Radar Alerts' },
  analytics:             { he: 'אנליטיקה מתקדמת', en: 'Advanced Analytics' },
  risk_advanced:         { he: 'מודול סיכון',    en: 'Risk Module' },
  psychology:            { he: 'מודול פסיכולוגיה', en: 'Psychology Module' },
  ai_insights:           { he: 'תובנות AI עמוקות', en: 'Deep AI Insights' },
  weekly_review:         { he: 'סקירה שבועית',   en: 'Weekly Review' },
  oracle:                { he: 'אורקל התנהגותי', en: 'Behavioral Oracle' },
  quantlab:              { he: 'מעבדת קוונט',    en: 'QuantLab' },
  backtest:              { he: 'באק-טסט',        en: 'Backtest Journal' },
  alpha_widgets:         { he: 'ווידג׳טים אלפא', en: 'Alpha Widgets' },
};

export const TierLockCard = ({ T, isRTL, currentTier, feature, featureLabel, onUpgrade }: TierLockCardProps) => {
  const target = nextTier(currentTier) ?? 'alpha';
  const label = featureLabel ?? FEATURE_BLURB[feature];
  const targetName = tierLabel(target, isRTL);

  return (
    <div
      role="region"
      aria-label={isRTL ? 'נדרשת שדרוג' : 'Upgrade required'}
      style={{
        margin: '24px auto',
        maxWidth: 560,
        padding: 32,
        background: `linear-gradient(160deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
        border: `1px solid ${T.accent.purple}40`,
        borderRadius: T.radius.xl,
        boxShadow: `0 12px 40px rgba(0,0,0,0.45), 0 0 24px ${T.accent.purple}22`,
        textAlign: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 8 }}>🔒</div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
        color: T.accent.purple, textTransform: 'uppercase', marginBottom: 10,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {isRTL ? `דרוש מסלול ${targetName}` : `${targetName} tier required`}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text.primary, marginBottom: 8 }}>
        {isRTL ? label.he : label.en}
      </div>
      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.6, marginBottom: 22 }}>
        {isRTL
          ? `התכונה זמינה במסלול ${targetName} ומעלה. שדרג כדי לפתוח.`
          : `This feature is available on ${targetName} and above. Upgrade to unlock.`}
      </div>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            padding: '11px 28px', border: 'none', borderRadius: T.radius.md,
            background: `linear-gradient(135deg, ${T.accent.purple}, ${T.accent.blue})`,
            color: T.bg.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            boxShadow: `0 6px 20px ${T.accent.purple}55`,
          }}
        >
          {isRTL ? `שדרג ל-${targetName}` : `Upgrade to ${targetName}`}
        </button>
      )}
    </div>
  );
};

export default TierLockCard;
