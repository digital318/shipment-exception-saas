-- Phase 6B: Track how exceptions were created (manual vs carrier sync)
ALTER TABLE public.exceptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.exceptions.source IS
  'Origin: manual (user or SLA auto-detect) or carrier_sync (carrier API exception status).';

CREATE INDEX IF NOT EXISTS idx_exceptions_source ON public.exceptions (source);
