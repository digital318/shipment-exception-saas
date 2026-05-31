type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function formatUnknownError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const supabaseError = error as SupabaseErrorLike;
    if (supabaseError.message) {
      const parts = [supabaseError.message];
      if (supabaseError.code) parts.push(`(${supabaseError.code})`);
      if (supabaseError.details) parts.push(`— ${supabaseError.details}`);
      if (supabaseError.hint) parts.push(`Hint: ${supabaseError.hint}`);
      return parts.join(" ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return "Unknown error";
}

export function serializeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const supabaseError = error as SupabaseErrorLike;
    return JSON.stringify(
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: supabaseError.code ?? null,
        details: supabaseError.details ?? null,
        hint: supabaseError.hint ?? null,
      },
      null,
      2,
    );
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function throwReadableError(error: unknown): never {
  throw new Error(formatUnknownError(error));
}

export function logSimulateExceptionError(label: string, error: unknown): void {
  console.error(`[CarrierSync] Simulate Exception — ${label}`, error);
  console.error(
    `[CarrierSync] Simulate Exception — ${label} (serialized)`,
    serializeUnknownError(error),
  );
}
