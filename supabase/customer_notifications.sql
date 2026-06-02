-- =============================================================================
-- FreightPulse — Create public.customer_notifications (Phase 7C)
-- =============================================================================
-- Paste and run this entire file in Supabase → SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  shipment_id     uuid REFERENCES public.shipments (id) ON DELETE SET NULL,
  exception_id    uuid REFERENCES public.exceptions (id) ON DELETE SET NULL,
  type            text NOT NULL,
  title           text NOT NULL,
  message         text NOT NULL,
  status          text NOT NULL DEFAULT 'Unread',
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

COMMENT ON TABLE public.customer_notifications IS
  'Customer-facing in-app alerts for shipment and exception updates.';

CREATE INDEX IF NOT EXISTS idx_customer_notifications_organization_id
  ON public.customer_notifications (organization_id);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id
  ON public.customer_notifications (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_status
  ON public.customer_notifications (status);

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_notifications_tenant ON public.customer_notifications;
DROP POLICY IF EXISTS customer_notifications_select ON public.customer_notifications;
DROP POLICY IF EXISTS customer_notifications_insert ON public.customer_notifications;
DROP POLICY IF EXISTS customer_notifications_update ON public.customer_notifications;

CREATE POLICY customer_notifications_select ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY customer_notifications_insert ON public.customer_notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY customer_notifications_update ON public.customer_notifications
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());
