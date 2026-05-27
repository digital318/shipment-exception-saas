import { SHIPMENT_ID_PATTERN } from "./constants";
import type { CreateExceptionInput } from "./types";
import { shipmentRows } from "./mock-data";

export type FieldErrors = Partial<Record<keyof CreateExceptionInput | "form", string>>;

export function validateCreateException(
  input: CreateExceptionInput,
  existingShipmentIds: string[],
): FieldErrors {
  const errors: FieldErrors = {};
  const shipmentId = input.shipmentId.trim().toUpperCase();

  if (!shipmentId) {
    errors.shipmentId = "Shipment ID is required.";
  } else if (!SHIPMENT_ID_PATTERN.test(shipmentId)) {
    errors.shipmentId = "Use format FP-2026-084219.";
  } else if (!shipmentRows.some((s) => s.id === shipmentId)) {
    errors.shipmentId = "Shipment not found in network.";
  } else if (existingShipmentIds.includes(shipmentId)) {
    errors.shipmentId = "An exception already exists for this shipment.";
  }

  if (!input.title.trim()) {
    errors.title = "Title is required.";
  } else if (input.title.trim().length < 8) {
    errors.title = "Title must be at least 8 characters.";
  } else if (input.title.trim().length > 120) {
    errors.title = "Title must be under 120 characters.";
  }

  if (!input.delayReason.trim()) {
    errors.delayReason = "Delay reason is required.";
  } else if (input.delayReason.trim().length < 10) {
    errors.delayReason = "Provide at least 10 characters describing the delay.";
  }

  if (!input.owner || input.owner === "Unassigned") {
    errors.owner = "Assign an owner before creating the exception.";
  }

  if (!input.severity) {
    errors.severity = "Select a severity level.";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
