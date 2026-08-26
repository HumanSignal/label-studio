/**
 * Helpers for Django REST Framework-style `validation_errors` payloads returned
 * through {@link WrappedResponse} (see `callApi` / api-proxy).
 */

export type ValidationErrorsMap = Record<string, unknown>;

/**
 * Reads `validation_errors` from a wrapped API error result.
 * Prefers `result.response.validation_errors`, then top-level `result.validation_errors`.
 */
export function getValidationErrors(result: unknown): ValidationErrorsMap | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as {
    response?: { validation_errors?: unknown };
    validation_errors?: unknown;
  };
  const raw = r.response?.validation_errors ?? r.validation_errors;
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ValidationErrorsMap;
  }
  return undefined;
}

/**
 * Normalizes one field's validation payload to a list of user-facing strings.
 * DRF may return a string, a list of strings, or ErrorDetail-like `{ string: string }` objects.
 */
export function validationFieldMessages(ve: unknown, key: string): string[] {
  if (!ve || typeof ve !== "object") return [];
  const raw = (ve as ValidationErrorsMap)[key];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) =>
      typeof item === "string" ? item : String((item as { string?: unknown })?.string ?? item),
    );
  }
  if (typeof raw === "string") return [raw];
  if (typeof raw === "object" && raw !== null && "string" in raw) {
    return [String((raw as { string: unknown }).string)];
  }
  return [String(raw)];
}
