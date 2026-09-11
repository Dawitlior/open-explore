/**
 * Stripe plan catalogue (test mode).
 *
 * Price / product IDs are created in Stripe and referenced statically so
 * every purchase is attributable to a real product in the dashboard.
 */
import type { AppTier } from '@/hooks/use-entitlement';

export interface PlanDef {
  tier: Exclude<AppTier, 'standard'>;
  priceId: string;
  productId: string;
  amountUsd: number;
}

export const STRIPE_PLANS: Record<Exclude<AppTier, 'standard'>, PlanDef> = {
  advanced: {
    tier: 'advanced',
    priceId: 'price_1UEalRLHBUsnz0dmv8FShrt5',
    productId: 'prod_VF4v9PEhzNGFf8',
    amountUsd: 14,
  },
  ultimate: {
    tier: 'ultimate',
    priceId: 'price_1UEalkLHBUsnz0dmmg1huRmq',
    productId: 'prod_VF4vz2I7n1QhqZ',
    amountUsd: 39,
  },
};

/** Reverse lookup: Stripe product id → app tier. */
export const PRODUCT_TO_TIER: Record<string, AppTier> = {
  [STRIPE_PLANS.advanced.productId]: 'advanced',
  [STRIPE_PLANS.ultimate.productId]: 'ultimate',
};
