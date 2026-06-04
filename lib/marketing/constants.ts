export const LANDING_FEATURES = [
  {
    title: "Exception Management",
    description:
      "Centralize delays, damages, and SLA risks with severity-based triage and ownership.",
  },
  {
    title: "Customer Notifications",
    description:
      "Keep customers informed with branded updates tied to live exception status.",
  },
  {
    title: "Escalations",
    description:
      "Route overdue issues through tiered escalation paths before they breach SLAs.",
  },
  {
    title: "Playbooks",
    description:
      "Apply consistent response workflows the moment an exception is detected.",
  },
  {
    title: "Executive Dashboard",
    description:
      "Give leadership real-time visibility into risk, aging, and customer impact.",
  },
  {
    title: "Customer Portal",
    description:
      "Let customers track shipments, exceptions, and communication history in one place.",
  },
  {
    title: "Carrier Monitoring",
    description:
      "Sync carrier tracking and surface carrier-side delays alongside your operations data.",
  },
  {
    title: "Reporting Center",
    description:
      "Export operational and customer-facing reports for reviews and QBRs.",
  },
] as const;

export const HOW_IT_WORKS_STEPS = [
  { step: 1, title: "Shipment monitored", description: "FreightPulse tracks in-transit shipments and carrier updates." },
  { step: 2, title: "Exception detected", description: "Delays and SLA risks are flagged automatically or by your team." },
  { step: 3, title: "Playbook assigned", description: "Standard workflows guide owners through the right next actions." },
  { step: 4, title: "Customer notified", description: "Proactive updates keep customers informed before they escalate." },
  { step: 5, title: "Issue resolved", description: "Resolution is documented with audit history and reporting." },
] as const;

export const CUSTOMER_BENEFITS = [
  "Reduce service failures",
  "Improve customer communication",
  "Increase SLA compliance",
  "Reduce manual follow-up",
  "Executive visibility",
] as const;

export const LANDING_FAQ = [
  {
    question: "Who is FreightPulse built for?",
    answer:
      "FreightPulse is designed for logistics teams, 3PLs, and freight brokers who need real-time exception visibility and customer communication tools.",
  },
  {
    question: "Does FreightPulse integrate with carriers?",
    answer:
      "Yes. Carrier monitoring syncs tracking updates so delays surface alongside your operational exception workflow.",
  },
  {
    question: "Can customers access their own shipment status?",
    answer:
      "The customer portal gives account contacts visibility into shipments, exceptions, and communication history.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "All plans include a 14-day free trial. Request a demo to see the platform with your workflows.",
  },
] as const;
