ALTER TABLE public.exchange_credentials
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','error')),
  ADD COLUMN IF NOT EXISTS last_error text;