-- =============================================================================
-- FreightPulse — Supabase Database Schema (Phase 3B)
-- =============================================================================
-- Persistent storage for logistics exception management.
--
-- REVIEW ONLY — do not apply automatically.
-- To apply after review:
--   1. Open your Supabase project → SQL Editor
--   2. Paste and run this entire file, OR run section-by-section
--   3. Confirm tables appear under Database → Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared trigger: auto-update updated_at on row modification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Trigger function that sets updated_at to the current timestamp before UPDATE.';

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
-- Account-level customer records. Shipments belong to a customer; SLA targets
-- drive performance reporting and breach detection in the app.

CREATE TABLE public.customers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  contact_name       text NOT NULL,
  contact_email      text NOT NULL,
  sla_target_percent numeric(5, 2) NOT NULL
    CHECK (sla_target_percent >= 0 AND sla_target_percent <= 100),
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customers IS
  'FreightPulse customer accounts with SLA targets and primary contact details.';

COMMENT ON COLUMN public.customers.sla_target_percent IS
  'Target on-time delivery percentage (0–100) agreed with the customer.';

CREATE INDEX idx_customers_name ON public.customers (name);
CREATE INDEX idx_customers_contact_email ON public.customers (contact_email);

-- ---------------------------------------------------------------------------
-- shipments
-- ---------------------------------------------------------------------------
-- Individual freight moves tracked by shipment number. Status, ETA, and delay
-- fields power the shipments dashboard and feed exception creation.

CREATE TABLE public.shipments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number  text NOT NULL UNIQUE,
  customer_id      uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  carrier          text NOT NULL,
  origin           text NOT NULL,
  destination      text NOT NULL,
  eta              timestamptz NOT NULL,
  status           text NOT NULL,
  delay_hours      integer
    CHECK (delay_hours IS NULL OR delay_hours >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shipments IS
  'Active and historical freight shipments linked to a customer account.';

COMMENT ON COLUMN public.shipments.shipment_number IS
  'Human-readable tracking identifier (e.g. FP-2026-084219). Unique across all shipments.';

COMMENT ON COLUMN public.shipments.status IS
  'Operational status: In Transit, Delayed, Delivered, Exception, etc.';

COMMENT ON COLUMN public.shipments.delay_hours IS
  'Hours behind original ETA; NULL when on schedule or not applicable.';

CREATE INDEX idx_shipments_customer_id ON public.shipments (customer_id);
CREATE INDEX idx_shipments_status ON public.shipments (status);
CREATE INDEX idx_shipments_carrier ON public.shipments (carrier);
CREATE INDEX idx_shipments_eta ON public.shipments (eta);
CREATE INDEX idx_shipments_created_at ON public.shipments (created_at DESC);

CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exceptions
-- ---------------------------------------------------------------------------
-- Operational issues tied to a shipment. Tracks severity, ownership, workflow
-- status, and resolution details for the exceptions queue and detail drawer.

CREATE TABLE public.exceptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         uuid NOT NULL REFERENCES public.shipments (id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  severity            text NOT NULL,
  status              text NOT NULL,
  owner               text NOT NULL,
  delay_reason        text,
  resolution_summary  text,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.exceptions IS
  'Logistics exceptions opened against shipments — the core work item in FreightPulse.';

COMMENT ON COLUMN public.exceptions.severity IS
  'Impact level: Critical, High, Medium, Low.';

COMMENT ON COLUMN public.exceptions.status IS
  'Workflow state: Open, Investigating, Escalated, Pending Customer, Awaiting Carrier, Resolved.';

COMMENT ON COLUMN public.exceptions.owner IS
  'Team member or system actor responsible for resolving the exception.';

COMMENT ON COLUMN public.exceptions.resolved_at IS
  'Timestamp when the exception was closed; NULL while still open.';

CREATE INDEX idx_exceptions_shipment_id ON public.exceptions (shipment_id);
CREATE INDEX idx_exceptions_status ON public.exceptions (status);
CREATE INDEX idx_exceptions_severity ON public.exceptions (severity);
CREATE INDEX idx_exceptions_owner ON public.exceptions (owner);
CREATE INDEX idx_exceptions_created_at ON public.exceptions (created_at DESC);
CREATE INDEX idx_exceptions_open ON public.exceptions (status)
  WHERE resolved_at IS NULL;

CREATE TRIGGER trg_exceptions_updated_at
  BEFORE UPDATE ON public.exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exception_notes
-- ---------------------------------------------------------------------------
-- Internal notes attached to an exception. Visible in the exception detail
-- drawer; append-only audit of team communication.

CREATE TABLE public.exception_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id uuid NOT NULL REFERENCES public.exceptions (id) ON DELETE CASCADE,
  author       text NOT NULL,
  note         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.exception_notes IS
  'Internal team notes on an exception — not shared with customers or carriers.';

CREATE INDEX idx_exception_notes_exception_id ON public.exception_notes (exception_id);
CREATE INDEX idx_exception_notes_created_at ON public.exception_notes (created_at DESC);

-- ---------------------------------------------------------------------------
-- activity_events
-- ---------------------------------------------------------------------------
-- Timeline events for an exception (escalations, carrier updates, actions).
-- Powers the recent-activity feed and exception audit history.

CREATE TABLE public.activity_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id uuid NOT NULL REFERENCES public.exceptions (id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  message      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_events IS
  'Chronological activity log for an exception (escalation, action, update, resolved, alert).';

COMMENT ON COLUMN public.activity_events.event_type IS
  'Category of event: escalation, action, update, resolved, alert.';

CREATE INDEX idx_activity_events_exception_id ON public.activity_events (exception_id);
CREATE INDEX idx_activity_events_event_type ON public.activity_events (event_type);
CREATE INDEX idx_activity_events_created_at ON public.activity_events (created_at DESC);

-- =============================================================================
-- Seed data (demo)
-- =============================================================================
-- Mirrors lib/mock-data.ts for a realistic local/staging demo.
-- Fixed UUIDs keep foreign-key references stable across re-runs.
-- Safe to re-run: uses ON CONFLICT DO NOTHING on primary keys.
-- =============================================================================

-- Customers (8 from mock customers + 2 from additional shipment rows)
INSERT INTO public.customers (id, name, contact_name, contact_email, sla_target_percent, created_at)
VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Meridian Industrial Supply',  'Sarah Chen',  'sarah.chen@freightpulse.io',   96.80, '2025-01-15 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000002', 'Summit Automotive Parts',     'Marcus Webb', 'marcus.webb@freightpulse.io',  91.20, '2025-02-01 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000003', 'Coastal Retail Group',        'Lisa Park',   'lisa.park@freightpulse.io',    94.50, '2025-02-10 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000004', 'NorthStar Medical Devices',   'Sarah Chen',  'sarah.chen@freightpulse.io',   98.10, '2025-01-20 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000005', 'Atlas Construction Supply',   'Marcus Webb', 'marcus.webb@freightpulse.io',  89.40, '2025-03-01 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000006', 'Pacific Home Goods',          'Lisa Park',   'lisa.park@freightpulse.io',    93.70, '2025-03-15 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000007', 'Greenfield Foods Co-op',      'Sarah Chen',  'sarah.chen@freightpulse.io',   97.30, '2025-04-01 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000008', 'Vertex Electronics',          'Lisa Park',   'lisa.park@freightpulse.io',    99.10, '2025-04-10 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000009', 'Harbor Textiles',             'Marcus Webb', 'marcus.webb@freightpulse.io',  92.00, '2025-04-20 10:00:00+00'),
  ('a0000001-0000-4000-8000-000000000010', 'Lakeside Pharma',             'Sarah Chen',  'sarah.chen@freightpulse.io',   97.00, '2025-05-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Shipments (all 10 from mock shipmentRows)
INSERT INTO public.shipments (
  id, shipment_number, customer_id, carrier, origin, destination,
  eta, status, delay_hours, created_at, updated_at
)
VALUES
  ('b0000001-0000-4000-8000-000000000001', 'FP-2026-084219', 'a0000001-0000-4000-8000-000000000001', 'XPO Logistics',          'Joliet, IL',      'Charlotte, NC',  '2026-05-28 14:00:00+00', 'Delayed',    29, '2026-05-25 08:00:00+00', '2026-05-28 12:00:00+00'),
  ('b0000001-0000-4000-8000-000000000002', 'FP-2026-084156', 'a0000001-0000-4000-8000-000000000003', 'FedEx Freight',          'Ontario, CA',     'Phoenix, AZ',    '2026-05-29 11:30:00+00', 'Delayed',    19, '2026-05-25 10:00:00+00', '2026-05-28 11:00:00+00'),
  ('b0000001-0000-4000-8000-000000000003', 'FP-2026-083902', 'a0000001-0000-4000-8000-000000000004', 'Old Dominion Freight',   'Memphis, TN',     'Boston, MA',     '2026-05-27 08:00:00+00', 'Delivered',  NULL, '2026-05-22 06:00:00+00', '2026-05-27 08:30:00+00'),
  ('b0000001-0000-4000-8000-000000000004', 'FP-2026-084301', 'a0000001-0000-4000-8000-000000000002', 'Schneider National',     'Detroit, MI',     'Dallas, TX',     '2026-05-30 06:00:00+00', 'Exception',  32, '2026-05-24 12:00:00+00', '2026-05-28 13:00:00+00'),
  ('b0000001-0000-4000-8000-000000000005', 'FP-2026-084088', 'a0000001-0000-4000-8000-000000000006', 'Saia LTL Freight',       'Portland, OR',    'Denver, CO',     '2026-05-28 17:00:00+00', 'Exception',  5,  '2026-05-26 14:00:00+00', '2026-05-28 10:00:00+00'),
  ('b0000001-0000-4000-8000-000000000006', 'FP-2026-083744', 'a0000001-0000-4000-8000-000000000007', 'Werner Enterprises',     'Salinas, CA',     'Chicago, IL',    '2026-05-29 04:00:00+00', 'In Transit', NULL, '2026-05-27 02:00:00+00', '2026-05-28 08:00:00+00'),
  ('b0000001-0000-4000-8000-000000000007', 'FP-2026-084412', 'a0000001-0000-4000-8000-000000000005', 'JB Hunt Intermodal',     'Long Beach, CA',  'Atlanta, GA',    '2026-05-31 10:00:00+00', 'Delayed',    44, '2026-05-23 16:00:00+00', '2026-05-28 11:30:00+00'),
  ('b0000001-0000-4000-8000-000000000008', 'FP-2026-084267', 'a0000001-0000-4000-8000-000000000008', 'UPS Freight',            'Austin, TX',      'Nashville, TN',  '2026-05-28 09:00:00+00', 'In Transit', NULL, '2026-05-27 06:00:00+00', '2026-05-28 07:00:00+00'),
  ('b0000001-0000-4000-8000-000000000009', 'FP-2026-084501', 'a0000001-0000-4000-8000-000000000009', 'XPO Logistics',          'Savannah, GA',    'Columbus, OH',   '2026-05-30 15:00:00+00', 'Delayed',    29, '2026-05-26 08:00:00+00', '2026-05-28 09:00:00+00'),
  ('b0000001-0000-4000-8000-000000000010', 'FP-2026-084533', 'a0000001-0000-4000-8000-000000000010', 'FedEx Freight',          'Indianapolis, IN','Raleigh, NC',    '2026-05-28 20:00:00+00', 'In Transit', NULL, '2026-05-27 04:00:00+00', '2026-05-28 06:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Exceptions (6 open from mock + 1 resolved for activity demo)
INSERT INTO public.exceptions (
  id, shipment_id, title, description, severity, status, owner,
  delay_reason, resolution_summary, resolved_at, created_at, updated_at
)
VALUES
  (
    'c0000001-0000-4000-8000-000000000001',
    'b0000001-0000-4000-8000-000000000004',
    'SLA breach risk — production line stoppage',
    'Critical FTL delay threatening $12k/hr production line stoppage at Dallas facility.',
    'Critical', 'Escalated', 'Sarah Chen',
    'Driver HOS reset — mandatory 10-hr break',
    NULL, NULL,
    '2026-05-27 08:12:00+00', '2026-05-28 13:00:00+00'
  ),
  (
    'c0000001-0000-4000-8000-000000000002',
    'b0000001-0000-4000-8000-000000000007',
    'Port demurrage accruing — chassis shortage',
    'Intermodal shipment stalled at Long Beach due to chassis shortage; demurrage at $185/day.',
    'Critical', 'Investigating', 'Marcus Webb',
    'Port congestion — chassis shortage at LBCT',
    NULL, NULL,
    '2026-05-26 19:40:00+00', '2026-05-28 11:30:00+00'
  ),
  (
    'c0000001-0000-4000-8000-000000000003',
    'b0000001-0000-4000-8000-000000000001',
    'Missed Nashville linehaul connection',
    'Pro number re-rated after missed hub connection; customer notified.',
    'High', 'Investigating', 'Lisa Park',
    'Missed linehaul connection at Nashville hub',
    NULL, NULL,
    '2026-05-27 06:30:00+00', '2026-05-28 12:00:00+00'
  ),
  (
    'c0000001-0000-4000-8000-000000000004',
    'b0000001-0000-4000-8000-000000000002',
    'Weather delay — I-10 corridor closure',
    'Carrier ETA revision pending due to severe weather on I-10 corridor.',
    'Medium', 'Awaiting Carrier', 'System',
    'Severe weather — I-10 corridor closure',
    NULL, NULL,
    '2026-05-27 04:15:00+00', '2026-05-28 11:00:00+00'
  ),
  (
    'c0000001-0000-4000-8000-000000000005',
    'b0000001-0000-4000-8000-000000000005',
    'Address verification — suite mismatch',
    'Consignee contact attempted twice; suite number mismatch on BOL.',
    'Medium', 'Pending Customer', 'Sarah Chen',
    'Address verification — suite number mismatch',
    NULL, NULL,
    '2026-05-27 09:00:00+00', '2026-05-28 10:00:00+00'
  ),
  (
    'c0000001-0000-4000-8000-000000000006',
    'b0000001-0000-4000-8000-000000000009',
    'Terminal outbound dock delay',
    'Customer ops notified of terminal congestion at Savannah outbound dock.',
    'High', 'Open', 'Marcus Webb',
    'Terminal congestion — outbound dock delay',
    NULL, NULL,
    '2026-05-27 11:20:00+00', '2026-05-28 09:00:00+00'
  ),
  (
    'c0000001-0000-4000-8000-000000000007',
    'b0000001-0000-4000-8000-000000000003',
    'Delivery confirmed — POD matched',
    'Proof of delivery signed at dock 4, Revere MA. Exception closed.',
    'Low', 'Resolved', 'Marcus Webb',
    NULL,
    'POD uploaded and matched — delivered on time.',
    '2026-05-27 08:30:00+00',
    '2026-05-25 14:00:00+00', '2026-05-27 08:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Exception notes (from mock internalNotes on EXC-4401)
INSERT INTO public.exception_notes (id, exception_id, author, note, created_at)
VALUES
  (
    'd0000001-0000-4000-8000-000000000001',
    'c0000001-0000-4000-8000-000000000001',
    'Sarah Chen',
    'Escalated to carrier VP — awaiting callback within 2h.',
    '2026-05-27 09:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Activity events (mirrors recentActivity from mock-data.ts)
INSERT INTO public.activity_events (id, exception_id, event_type, message, created_at)
VALUES
  (
    'e0000001-0000-4000-8000-000000000001',
    'c0000001-0000-4000-8000-000000000001',
    'escalation',
    'Auto-escalated FP-2026-084301 to Critical — SLA breach threshold exceeded',
    '2026-05-28 13:00:00+00'
  ),
  (
    'e0000001-0000-4000-8000-000000000002',
    'c0000001-0000-4000-8000-000000000005',
    'action',
    'Contacted consignee for address verification on FP-2026-084088',
    '2026-05-28 12:42:00+00'
  ),
  (
    'e0000001-0000-4000-8000-000000000003',
    'c0000001-0000-4000-8000-000000000004',
    'update',
    'FedEx Freight pushed revised ETA for FP-2026-084156 (+19h)',
    '2026-05-28 12:26:00+00'
  ),
  (
    'e0000001-0000-4000-8000-000000000004',
    'c0000001-0000-4000-8000-000000000007',
    'resolved',
    'Resolved exception on FP-2026-083902 — POD uploaded and matched',
    '2026-05-28 11:30:00+00'
  ),
  (
    'e0000001-0000-4000-8000-000000000005',
    'c0000001-0000-4000-8000-000000000002',
    'alert',
    'Network alert ALERT-901 created — I-40 weather impact detected',
    '2026-05-28 11:30:00+00'
  ),
  (
    'e0000001-0000-4000-8000-000000000006',
    'c0000001-0000-4000-8000-000000000002',
    'update',
    'JB Hunt reported chassis delay at Long Beach for FP-2026-084412',
    '2026-05-28 10:30:00+00'
  ),
  (
    'e0000001-0000-4000-8000-000000000007',
    'c0000001-0000-4000-8000-000000000003',
    'action',
    'Opened investigation on FP-2026-084219 — missed Nashville connection',
    '2026-05-28 09:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;
