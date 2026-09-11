/**
 * Stripe plan catalogue.
 *
 * The product has a single paid plan — Orca Pro. The legacy "Advanced"
 * product is kept only for reverse lookups so existing subscribers of that
 * price are still resolved to Pro.
 */
import type { AppTier } from '@/hooks/use-entitlement';

export interface PlanDef {
  tier: Exclude<AppTier, 'free'>;
  priceId: string;
  productId: string;
  amountUsd: number;
}

export const STRIPE_PLANS: Record<Exclude<AppTier, 'free'>, PlanDef> = {
  pro: {
    tier: 'pro',
    priceId: 'price_1UEalkLHBUsnz0dmmg1huRmq',
    productId: 'prod_VF4vz2I7n1QhqZ',
    amountUsd: 39,
  },
};

/** Legacy Advanced product — grandfathered into Pro. */
export const LEGACY_ADVANCED_PRODUCT_ID = 'prod_VF4v9PEhzNGFf8';

/** Reverse lookup: Stripe product id → app plan. */
export const PRODUCT_TO_TIER: Record<string, AppTier> = {
  [STRIPE_PLANS.pro.productId]: 'pro',
  [LEGACY_ADVANCED_PRODUCT_ID]: 'pro',
};
