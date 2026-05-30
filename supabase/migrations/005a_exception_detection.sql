-- =============================================================================
-- FreightPulse — Phase 5A: Automated Exception Detection Engine
-- =============================================================================
-- Database-backed detection for at-risk shipments. Run after 004b_organizations.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.detect_shipment_exceptions()
RETURNS TABLE (
  exception_id uuid,
  shipment_number text,
  severity text,
  title text,
  rule_applied text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_default_owner text := 'Sarah Chen';
  v_shipment RECORD;
  v_severity text;
  v_title text;
  v_delay_reason text;
  v_rule text;
  v_exception_id uuid;
  v_delay integer;
BEGIN
  v_org_id := public.current_user_organization_id();
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_shipment IN
    SELECT s.*
    FROM public.shipments s
    WHERE s.organization_id = v_org_id
      AND s.status <> 'Delivered'
      AND NOT EXISTS (
        SELECT 1
        FROM public.exceptions e
        WHERE e.shipment_id = s.id
          AND e.resolved_at IS NULL
      )
      AND (
        COALESCE(s.delay_hours, 0) > 8
        OR s.status = 'Delayed'
      )
  LOOP
    v_delay := COALESCE(v_shipment.delay_hours, 0);

    IF v_delay > 24 THEN
      v_severity := 'Critical';
      v_rule := 'delay_critical';
      v_title := format('Critical delay — %s hours behind schedule', v_delay);
      v_delay_reason := format(
        'Shipment delayed %s hours beyond original ETA — %s lane impact under review',
        v_delay,
        v_shipment.carrier
      );
    ELSIF v_delay > 8 THEN
      v_severity := 'High';
      v_rule := 'delay_high';
      v_title := format('High-priority delay — %s hours behind schedule', v_delay);
      v_delay_reason := format(
        'Shipment delayed %s hours beyond original ETA — %s lane impact under review',
        v_delay,
        v_shipment.carrier
      );
    ELSIF v_shipment.status = 'Delayed' THEN
      v_severity := 'Medium';
      v_rule := 'status_delayed';
      v_title := 'Shipment marked delayed — ETA revision pending';
      v_delay_reason := format(
        '%s reported delayed status on %s → %s lane',
        v_shipment.carrier,
        v_shipment.origin,
        v_shipment.destination
      );
    ELSE
      CONTINUE;
    END IF;

    INSERT INTO public.exceptions (
      organization_id,
      shipment_id,
      title,
      severity,
      status,
      owner,
      delay_reason
    )
    VALUES (
      v_org_id,
      v_shipment.id,
      v_title,
      v_severity,
      'Open',
      v_default_owner,
      v_delay_reason
    )
    RETURNING id INTO v_exception_id;

    INSERT INTO public.activity_events (
      organization_id,
      exception_id,
      event_type,
      message
    )
    VALUES (
      v_org_id,
      v_exception_id,
      'escalation',
      format(
        'Auto-detected %s exception on %s — %s',
        v_severity,
        v_shipment.shipment_number,
        v_title
      )
    );

    exception_id := v_exception_id;
    shipment_number := v_shipment.shipment_number;
    severity := v_severity;
    title := v_title;
    rule_applied := v_rule;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.detect_shipment_exceptions() IS
  'Phase 5A: scans org shipments and creates exceptions for delay/status risk signals.';

GRANT EXECUTE ON FUNCTION public.detect_shipment_exceptions() TO authenticated;
