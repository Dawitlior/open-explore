CREATE TABLE public.mfa_backup_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mfa_backup_codes_user ON public.mfa_backup_codes(user_id);
GRANT SELECT, DELETE ON public.mfa_backup_codes TO authenticated;
GRANT ALL ON public.mfa_backup_codes TO service_role;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backup codes read" ON public.mfa_backup_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own backup codes delete" ON public.mfa_backup_codes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.user_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  user_agent text,
  browser text,
  os text,
  device_type text,
  ip text,
  city text,
  country text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX idx_user_devices_user ON public.user_devices(user_id);
GRANT SELECT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices read" ON public.user_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own devices update" ON public.user_devices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own devices delete" ON public.user_devices FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER user_devices_touch BEFORE UPDATE ON public.user_devices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();