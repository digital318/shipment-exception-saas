-- Phase 6A: Carrier tracking fields on shipments
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS carrier_status text,
  ADD COLUMN IF NOT EXISTS last_carrier_update timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_delivery timestamptz,
  ADD COLUMN IF NOT EXISTS actual_delivery timestamptz;

COMMENT ON COLUMN public.shipments.tracking_number IS
  'Carrier pro/tracking number used for API sync (Phase 6A mock, Phase 6B live).';

COMMENT ON COLUMN public.shipments.carrier_status IS
  'Raw status from carrier API: In Transit, Delayed, Out for Delivery, Delivered, Exception.';

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments (tracking_number);
