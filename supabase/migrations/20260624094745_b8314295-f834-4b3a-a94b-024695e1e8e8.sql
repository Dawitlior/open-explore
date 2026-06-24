-- Enforce server-side size caps to neutralise JSONB / free-text bloat attacks
-- (scenario #3 of the Attack Vector audit). CHECKs are immutable: they reject
-- any single row whose payload exceeds the cap. Caps sit well above legitimate
-- usage so existing rows are unaffected.

-- trades.data: full row payload (entry/exit/coin/comments/rules). 64 KB is ~32×
-- the largest legitimate row observed in production.
ALTER TABLE public.trades
  ADD CONSTRAINT trades_data_size_cap
  CHECK (octet_length(data::text) < 65536) NOT VALID;

-- day_notes.note: free-text day reflection. 16 KB is ~5,000 chars of Hebrew /
-- ~16,000 chars of ASCII — generous vs. the 10 KB client cap.
ALTER TABLE public.day_notes
  ADD CONSTRAINT day_notes_note_size_cap
  CHECK (note IS NULL OR octet_length(note) < 16384) NOT VALID;

-- trader_mind_sessions.payload: structured behavioural diagnostic payload. 256
-- KB cap protects against runaway client serialisation while leaving 100× head-
-- room over real sessions.
ALTER TABLE public.trader_mind_sessions
  ADD CONSTRAINT trader_mind_payload_size_cap
  CHECK (octet_length(payload::text) < 262144) NOT VALID;