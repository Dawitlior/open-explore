-- Remove the Oracle bot subsystem completely.
drop table if exists public.oracle_recalibration_queue cascade;
drop table if exists public.oracle_telemetry cascade;
drop table if exists public.oracle_sessions cascade;
drop table if exists public.oracle_vectors cascade;
drop table if exists public.oracle_nodes cascade;
