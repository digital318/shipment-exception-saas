-- Phase 8D: Demo request leads and activity log

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  company         text NOT NULL,
  email           text NOT NULL,
  phone           text,
  monthly_volume  text NOT NULL,
  message         text,
  status          text NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Contacted', 'Qualified', 'Closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_request_activity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_request_id uuid NOT NULL REFERENCES public.demo_requests (id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  message         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests (status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_request_activity_request_id ON public.demo_request_activity (demo_request_id);

CREATE OR REPLACE FUNCTION public.set_demo_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demo_requests_updated_at ON public.demo_requests;
CREATE TRIGGER demo_requests_updated_at
  BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_demo_requests_updated_at();

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_request_activity ENABLE ROW LEVEL SECURITY;

-- Public form: anyone may submit a demo request
DROP POLICY IF EXISTS demo_requests_insert_public ON public.demo_requests;
CREATE POLICY demo_requests_insert_public ON public.demo_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users may view and update (app enforces Admin role)
DROP POLICY IF EXISTS demo_requests_select_authenticated ON public.demo_requests;
CREATE POLICY demo_requests_select_authenticated ON public.demo_requests
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS demo_requests_update_authenticated ON public.demo_requests;
CREATE POLICY demo_requests_update_authenticated ON public.demo_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS demo_request_activity_insert_public ON public.demo_request_activity;
CREATE POLICY demo_request_activity_insert_public ON public.demo_request_activity
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS demo_request_activity_select_authenticated ON public.demo_request_activity;
CREATE POLICY demo_request_activity_select_authenticated ON public.demo_request_activity
  FOR SELECT
  TO authenticated
  USING (true);
