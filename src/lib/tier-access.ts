/**
 * Tier-based feature access matrix.
 * Single source of truth for "is this page/feature available at this tier?"
 *
 *   starter — Calendar, Journal (manual entry), Risk Meter
 *   pro     — Starter + Economic Radar (full) + AI Insights + Weekly Review
 *             + Advanced Analytics / Risk / Psychology
 *   alpha   — everything (Oracle, QuantLab, alpha widgets, backtest)
 */
import type { Tier } from '@/hooks/use-settings';

export type Feature =
  | 'calendar'
  | 'journal'
  | 'risk_meter'
  | 'economic_radar'        // view-only banner is always free; full alerts/page = pro+
  | 'economic_radar_alerts'
  | 'analytics'
  | 'risk_advanced'
  | 'psychology'
  | 'ai_insights'
  | 'weekly_review'
  | 'oracle'
  | 'quantlab'
  | 'backtest'
  | 'alpha_widgets';

const TIER_RANK: Record<Tier, number> = { starter: 0, pro: 1, alpha: 2 };

/** Minimum tier required for each feature. */
export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  calendar:               'starter',
  journal:                'starter',
  risk_meter:             'starter',
  economic_radar:         'starter', // banner read-only
  economic_radar_alerts:  'pro',
  analytics:              'pro',
  risk_advanced:          'pro',
  psychology:             'pro',
  ai_insights:            'pro',
  weekly_review:          'pro',
  oracle:                 'alpha',
  quantlab:               'alpha',
  backtest:               'alpha',
  alpha_widgets:          'alpha',
};

export function tierAllows(tier: Tier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

export function nextTier(tier: Tier): Tier | null {
  if (tier === 'starter') return 'pro';
  if (tier === 'pro')     return 'alpha';
  return null;
}

export function tierLabel(tier: Tier, isRTL: boolean): string {
  const map = {
    starter: { he: 'מתחיל', en: 'Starter' },
    pro:     { he: 'מקצועי', en: 'Pro' },
    alpha:   { he: 'אלפא',  en: 'Alpha' },
  } as const;
  return map[tier][isRTL ? 'he' : 'en'];
}

export const TIERS: Tier[] = ['starter', 'pro', 'alpha'];
