
-- ============================================================
-- ORACLE CORE — Phase 1 schema
-- ============================================================

-- 1) Scenario catalog (shared, read-only from the client)
CREATE TABLE public.oracle_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL,
  tier        INT  NOT NULL DEFAULT 1,
  prompt_he   TEXT NOT NULL,
  prompt_en   TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]'::jsonb,
  branches    JSONB NOT NULL DEFAULT '{}'::jsonb,
  trap        BOOLEAN NOT NULL DEFAULT false,
  trap_pair   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oracle_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY oracle_nodes_select_authenticated
  ON public.oracle_nodes FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_oracle_nodes_touch
  BEFORE UPDATE ON public.oracle_nodes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Per-user sessions
CREATE TABLE public.oracle_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL DEFAULT auth.uid(),
  state             TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (state IN ('in_progress','locked','completed','abandoned')),
  current_node_code TEXT,
  visited_path      JSONB NOT NULL DEFAULT '[]'::jsonb,
  dissonance_log    JSONB NOT NULL DEFAULT '[]'::jsonb,
  depth_score       INT NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oracle_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY oracle_sessions_select_own
  ON public.oracle_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY oracle_sessions_insert_own
  ON public.oracle_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_sessions_update_own
  ON public.oracle_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_sessions_delete_own
  ON public.oracle_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_oracle_sessions_user ON public.oracle_sessions(user_id, started_at DESC);

CREATE TRIGGER trg_oracle_sessions_touch
  BEFORE UPDATE ON public.oracle_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Telemetry event stream
CREATE TABLE public.oracle_telemetry (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES public.oracle_sessions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL DEFAULT auth.uid(),
  node_code      TEXT NOT NULL,
  option_id      TEXT,
  latency_ms     INT,
  hover_count    INT NOT NULL DEFAULT 0,
  changed_mind   INT NOT NULL DEFAULT 0,
  skipped        BOOLEAN NOT NULL DEFAULT false,
  scroll_jitter  NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oracle_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY oracle_telemetry_select_own
  ON public.oracle_telemetry FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY oracle_telemetry_insert_own
  ON public.oracle_telemetry FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_telemetry_delete_own
  ON public.oracle_telemetry FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_oracle_telemetry_session ON public.oracle_telemetry(session_id, created_at);

-- 4) Final 128-D vector per user (one row per user; overwritten on recalibration)
CREATE TABLE public.oracle_vectors (
  user_id              UUID PRIMARY KEY DEFAULT auth.uid(),
  version              INT NOT NULL DEFAULT 1,
  vector               JSONB NOT NULL DEFAULT '{}'::jsonb,
  archetype            TEXT,
  shadow_patterns      JSONB NOT NULL DEFAULT '[]'::jsonb,
  blueprint_md         TEXT,
  coach_system_prompt  TEXT,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oracle_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY oracle_vectors_select_own
  ON public.oracle_vectors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY oracle_vectors_insert_own
  ON public.oracle_vectors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_vectors_update_own
  ON public.oracle_vectors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_vectors_delete_own
  ON public.oracle_vectors FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_oracle_vectors_touch
  BEFORE UPDATE ON public.oracle_vectors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Recalibration queue (one pending row per user)
CREATE TABLE public.oracle_recalibration_queue (
  user_id       UUID PRIMARY KEY DEFAULT auth.uid(),
  reason        TEXT NOT NULL,
  suggested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at  TIMESTAMPTZ
);
ALTER TABLE public.oracle_recalibration_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY oracle_recalibration_select_own
  ON public.oracle_recalibration_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY oracle_recalibration_insert_own
  ON public.oracle_recalibration_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_recalibration_update_own
  ON public.oracle_recalibration_queue FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY oracle_recalibration_delete_own
  ON public.oracle_recalibration_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);
