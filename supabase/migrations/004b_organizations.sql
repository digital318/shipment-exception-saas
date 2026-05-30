-- =============================================================================
-- FreightPulse — Phase 4B: Tenant-aware organization model
-- =============================================================================
-- Run in Supabase SQL Editor after Phase 3B schema.sql (or on a fresh project).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  ops_email   text,
  timezone    text NOT NULL DEFAULT 'America/New_York',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS
  'SaaS tenant — each FreightPulse workspace belongs to one organization.';

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  display_name    text,
  role            text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS
  'Extended profile for authenticated users; links each user to an organization.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id
  ON public.user_profiles (organization_id);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users created before Phase 4B
INSERT INTO public.user_profiles (id, display_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- organization_id on business tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.exceptions
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.exception_notes
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.activity_events
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_shipments_organization_id ON public.shipments (organization_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_organization_id ON public.exceptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_exception_notes_organization_id ON public.exception_notes (organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_organization_id ON public.activity_events (organization_id);

-- ---------------------------------------------------------------------------
-- Demo organization + backfill seed data
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (id, name, slug, ops_email, timezone)
VALUES (
  'f0000001-0000-4000-8000-000000000001',
  'FreightPulse Logistics',
  'freightpulse-logistics',
  'ops@freightpulse.com',
  'America/New_York'
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.customers
SET organization_id = 'f0000001-0000-4000-8000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.shipments s
SET organization_id = c.organization_id
FROM public.customers c
WHERE s.customer_id = c.id AND s.organization_id IS NULL;

UPDATE public.exceptions e
SET organization_id = s.organization_id
FROM public.shipments s
WHERE e.shipment_id = s.id AND e.organization_id IS NULL;

UPDATE public.exception_notes n
SET organization_id = e.organization_id
FROM public.exceptions e
WHERE n.exception_id = e.id AND n.organization_id IS NULL;

UPDATE public.activity_events a
SET organization_id = e.organization_id
FROM public.exceptions e
WHERE a.exception_id = e.id AND a.organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exception_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- organizations
DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_user_organization_id());

DROP POLICY IF EXISTS organizations_insert ON public.organizations;
CREATE POLICY organizations_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS organizations_update ON public.organizations;
CREATE POLICY organizations_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_user_organization_id())
  WITH CHECK (id = public.current_user_organization_id());

-- user_profiles
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS user_profiles_insert ON public.user_profiles;
CREATE POLICY user_profiles_insert ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS user_profiles_update ON public.user_profiles;
CREATE POLICY user_profiles_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- customers
DROP POLICY IF EXISTS customers_tenant ON public.customers;
CREATE POLICY customers_tenant ON public.customers
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- shipments
DROP POLICY IF EXISTS shipments_tenant ON public.shipments;
CREATE POLICY shipments_tenant ON public.shipments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- exceptions
DROP POLICY IF EXISTS exceptions_tenant ON public.exceptions;
CREATE POLICY exceptions_tenant ON public.exceptions
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- exception_notes
DROP POLICY IF EXISTS exception_notes_tenant ON public.exception_notes;
CREATE POLICY exception_notes_tenant ON public.exception_notes
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- activity_events
DROP POLICY IF EXISTS activity_events_tenant ON public.activity_events;
CREATE POLICY activity_events_tenant ON public.activity_events
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());
