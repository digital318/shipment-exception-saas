-- Phase 6C: Escalation playbooks and assignment rules

ALTER TABLE public.exceptions
  ADD COLUMN IF NOT EXISTS playbook_type text,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recommended_action text,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

COMMENT ON COLUMN public.exceptions.playbook_type IS 'Operational playbook type (e.g. Carrier Delay, SLA Risk)';
COMMENT ON COLUMN public.exceptions.escalation_level IS 'Escalation level 1–4 (Operations Review through Executive Escalation)';
COMMENT ON COLUMN public.exceptions.recommended_action IS 'Recommended next operational action for the assigned owner';
COMMENT ON COLUMN public.exceptions.next_follow_up_at IS 'When the owner should complete the next follow-up check';

CREATE INDEX IF NOT EXISTS idx_exceptions_playbook_type ON public.exceptions (playbook_type);
CREATE INDEX IF NOT EXISTS idx_exceptions_next_follow_up_at ON public.exceptions (next_follow_up_at);

-- Update auto-detection RPC to assign playbooks on create
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
  v_shipment RECORD;
  v_severity text;
  v_title text;
  v_delay_reason text;
  v_rule text;
  v_exception_id uuid;
  v_delay integer;
  v_owner text;
  v_playbook_type text;
  v_recommended_action text;
  v_follow_up interval;
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

    v_owner := CASE v_severity
      WHEN 'Critical' THEN 'Sarah Chen'
      WHEN 'High' THEN 'Marcus Webb'
      WHEN 'Medium' THEN 'Lisa Park'
      ELSE 'System'
    END;

    v_playbook_type := CASE
      WHEN v_rule IN ('delay_critical', 'delay_high') THEN 'SLA Risk'
      ELSE 'Carrier Delay'
    END;

    v_recommended_action := CASE v_playbook_type
      WHEN 'SLA Risk' THEN 'Assess SLA impact and identify recovery options before breach threshold.'
      ELSE 'Review carrier tracking updates and confirm revised ETA with the operations team.'
    END;

    v_follow_up := CASE v_severity
      WHEN 'Critical' THEN interval '2 hours'
      WHEN 'High' THEN interval '4 hours'
      WHEN 'Medium' THEN interval '8 hours'
      ELSE interval '24 hours'
    END;

    INSERT INTO public.exceptions (
      organization_id,
      shipment_id,
      title,
      severity,
      status,
      owner,
      delay_reason,
      playbook_type,
      escalation_level,
      recommended_action,
      next_follow_up_at
    )
    VALUES (
      v_org_id,
      v_shipment.id,
      v_title,
      v_severity,
      'Open',
      v_owner,
      v_delay_reason,
      v_playbook_type,
      1,
      v_recommended_action,
      now() + v_follow_up
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

    INSERT INTO public.activity_events (
      organization_id,
      exception_id,
      event_type,
      message
    )
    VALUES (
      v_org_id,
      v_exception_id,
      'action',
      format(
        'Playbook assigned — %s (Level 1: Operations Review) · Owner: %s · %s',
        v_playbook_type,
        v_owner,
        v_shipment.shipment_number
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
