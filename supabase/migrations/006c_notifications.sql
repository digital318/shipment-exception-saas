-- =============================================================================
-- FreightPulse — Phase 5C: In-app notifications and escalation rules
-- =============================================================================
-- Run in Supabase SQL Editor after Phase 5A exception detection migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  exception_id    uuid REFERENCES public.exceptions (id) ON DELETE SET NULL,
  customer_id     uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  type            text NOT NULL,
  title           text NOT NULL,
  message         text NOT NULL,
  severity        text NOT NULL,
  status          text NOT NULL DEFAULT 'Unread',
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

COMMENT ON TABLE public.notifications IS
  'In-app operational alerts for exceptions, SLA risks, and resolutions.';

COMMENT ON COLUMN public.notifications.type IS
  'Notification category: exception_critical, exception_high, sla_risk, resolution.';

COMMENT ON COLUMN public.notifications.severity IS
  'Display severity: Critical, High, Medium, Low.';

COMMENT ON COLUMN public.notifications.status IS
  'Read state: Unread or Read.';

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON public.notifications (organization_id);

CREATE INDEX IF NOT EXISTS idx_notifications_org_created_at
  ON public.notifications (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org_status
  ON public.notifications (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_exception_id
  ON public.notifications (exception_id);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id
  ON public.notifications (customer_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_tenant ON public.notifications
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());
