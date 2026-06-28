ALTER TABLE public.user_preferences ALTER COLUMN benchmark_opt_in SET DEFAULT true;
UPDATE public.user_preferences SET benchmark_opt_in = true WHERE benchmark_opt_in IS NULL;