ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS privacy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text;