"use client";

import { useEffect, useState } from "react";
import { IconX } from "@/components/icons";
import { useExceptions } from "@/context/exceptions-context";
import { useToast } from "@/context/toast-context";
import { EXCEPTION_OWNERS, ISSUE_STATUSES, SEVERITIES } from "@/lib/constants";
import { shipmentRows } from "@/lib/mock-data";
import { btnPrimary, btnSecondary, inputBase, sectionLabel, selectBase } from "@/lib/styles";
import type { CreateExceptionInput, IssueStatus, Severity } from "@/lib/types";
import { hasErrors, validateCreateException, type FieldErrors } from "@/lib/validation";

const emptyForm: CreateExceptionInput = {
  shipmentId: "",
  title: "",
  severity: "Medium",
  delayReason: "",
  owner: "Sarah Chen",
  status: "Open",
};

export function CreateExceptionModal({
  open,
  onClose,
  defaultShipmentId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultShipmentId?: string;
  onCreated?: (id: string) => void;
}) {
  const { exceptions, createException } = useExceptions();
  const { toast } = useToast();
  const [form, setForm] = useState<CreateExceptionInput>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      shipmentId: defaultShipmentId ?? "",
    });
    setErrors({});
    setTouched({});
  }, [open, defaultShipmentId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function validate(): FieldErrors {
    const next = validateCreateException(
      form,
      exceptions.map((e) => e.shipmentId),
    );
    setErrors(next);
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      shipmentId: true,
      title: true,
      delayReason: true,
      owner: true,
      severity: true,
    });
    const nextErrors = validate();
    if (hasErrors(nextErrors)) {
      toast("Fix validation errors before submitting.", "error");
      return;
    }

    const created = createException({
      ...form,
      shipmentId: form.shipmentId.trim().toUpperCase(),
    });

    if (!created) {
      toast("Could not create exception. Check shipment ID.", "error");
      return;
    }

    toast(`Exception ${created.id} created.`, "success");
    onCreated?.(created.id);
    onClose();
  }

  function fieldError(name: keyof FieldErrors) {
    return touched[name] ? errors[name] : undefined;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-exception-title"
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/50"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className={sectionLabel}>New record</p>
            <h2 id="create-exception-title" className="mt-1 text-lg font-semibold text-white">
              Create Exception
            </h2>
          </div>
          <button type="button" onClick={onClose} className={`${btnSecondary} !p-2`}>
            <IconX className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="space-y-4">
            <Field label="Shipment ID" error={fieldError("shipmentId")} required>
              <input
                list="shipment-ids"
                value={form.shipmentId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shipmentId: e.target.value.toUpperCase() }))
                }
                onBlur={() => {
                  setTouched((t) => ({ ...t, shipmentId: true }));
                  validate();
                }}
                placeholder="FP-2026-084219"
                className={`${inputBase} font-mono ${fieldError("shipmentId") ? "border-rose-500/40 ring-rose-500/20" : ""}`}
              />
              <datalist id="shipment-ids">
                {shipmentRows.map((s) => (
                  <option key={s.id} value={s.id} />
                ))}
              </datalist>
            </Field>

            <Field label="Exception title" error={fieldError("title")} required>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onBlur={() => {
                  setTouched((t) => ({ ...t, title: true }));
                  validate();
                }}
                placeholder="Brief description of the issue"
                className={`${inputBase} ${fieldError("title") ? "border-rose-500/40 ring-rose-500/20" : ""}`}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Severity" error={fieldError("severity")} required>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, severity: e.target.value as Severity }))
                  }
                  className={`${selectBase} w-full ${fieldError("severity") ? "border-rose-500/40" : ""}`}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Initial status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as IssueStatus }))
                  }
                  className={`${selectBase} w-full`}
                >
                  {ISSUE_STATUSES.filter((s) => s !== "Resolved").map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Owner" error={fieldError("owner")} required>
              <select
                value={form.owner}
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                onBlur={() => {
                  setTouched((t) => ({ ...t, owner: true }));
                  validate();
                }}
                className={`${selectBase} w-full ${fieldError("owner") ? "border-rose-500/40" : ""}`}
              >
                {EXCEPTION_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Delay reason" error={fieldError("delayReason")} required>
              <textarea
                value={form.delayReason}
                onChange={(e) => setForm((f) => ({ ...f, delayReason: e.target.value }))}
                onBlur={() => {
                  setTouched((t) => ({ ...t, delayReason: true }));
                  validate();
                }}
                rows={3}
                placeholder="What caused the delay or exception?"
                className={`${inputBase} resize-none ${fieldError("delayReason") ? "border-rose-500/40 ring-rose-500/20" : ""}`}
              />
            </Field>
          </div>

          <footer className="mt-6 flex gap-2 border-t border-white/[0.06] pt-5">
            <button type="button" onClick={onClose} className={`flex-1 ${btnSecondary}`}>
              Cancel
            </button>
            <button type="submit" className={`flex-1 ${btnPrimary}`}>
              Create exception
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={sectionLabel}>
        {label}
        {required && <span className="text-rose-400"> *</span>}
      </span>
      <div className="mt-2">{children}</div>
      {error && (
        <p className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}
