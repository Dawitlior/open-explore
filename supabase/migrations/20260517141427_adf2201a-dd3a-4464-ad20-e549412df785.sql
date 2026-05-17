ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS legal_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS legal_accepted_at timestamptz;