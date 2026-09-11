CREATE TABLE IF NOT EXISTS public.ai_chat_usage (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  period TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);

GRANT SELECT ON public.ai_chat_usage TO authenticated;
GRANT ALL ON public.ai_chat_usage TO service_role;

ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
ON public.ai_chat_usage FOR SELECT TO authenticated
USING (auth.uid() = user_id);