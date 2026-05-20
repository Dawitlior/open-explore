export type EconomicImpact = 't1' | 't2' | 't3';

export interface EconomicEvent {
  id: string;
  provider: string;
  external_id: string;
  release_at: string; // ISO UTC
  currency: string | null;
  country: string | null;
  event_name: string;
  category: string | null;
  impact: EconomicImpact;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  unit: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type EventLifecycle = 'upcoming' | 't-5min' | 't-1min' | 'live' | 'released' | 'past';
