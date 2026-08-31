/**
 * Review-state resolution for annotation list filtering and classic editor mappers.
 *
 * Canonical runtime values after normalization:
 * - "accepted" — plain accept
 * - "rejected"
 * - "fixed" — Fix + Accept (API/history "fixed_and_accepted" maps here)
 */
import type { SharedAnnotation } from "./types";

export function normalizeReviewAcceptedState(state: unknown): SharedAnnotation["acceptedState"] {
  if (state === "accepted" || state === "rejected" || state === "fixed") return state;
  if (state === "fixed_and_accepted") return "fixed";
  return null;
}

export function isEnterpriseEdition(): boolean {
  return (
    (window as { APP_SETTINGS?: { version?: { edition?: string } } }).APP_SETTINGS?.version?.edition === "Enterprise"
  );
}

/**
 * Resolve review status from LSE task.source (annotators[idx].review aligned to annotations[idx]).
 */
export function resolveReviewAcceptedStateFromTaskSource(
  entity: { pk?: string | number | null; type?: string } | null | undefined,
  taskSource: unknown,
): SharedAnnotation["acceptedState"] {
  if (!isEnterpriseEdition() || !entity || entity.type === "prediction") return null;
  if (taskSource == null || taskSource === "") return null;

  try {
    const parsed = typeof taskSource === "string" ? JSON.parse(taskSource) : taskSource;
    const annotators = (parsed as { annotators?: unknown[] })?.annotators;
    const backendAnnotations = (parsed as { annotations?: unknown[] })?.annotations;
    if (!Array.isArray(annotators) || !Array.isArray(backendAnnotations)) return null;

    const idx = backendAnnotations.findIndex(
      (a) => entity.pk && (a as { id?: unknown })?.id && String((a as { id: unknown }).id) === String(entity.pk),
    );
    if (idx < 0 || idx >= annotators.length) return null;

    return normalizeReviewAcceptedState((annotators[idx] as { review?: unknown })?.review ?? null);
  } catch {
    return null;
  }
}

/**
 * Resolve review status for a classic MST entity: entity field first, then task.source fallback.
 */
export function resolveClassicEntityReviewState(
  entity:
    | {
        pk?: string | number | null;
        type?: string;
        acceptedState?: unknown;
        accepted_state?: unknown;
      }
    | null
    | undefined,
  store?: { task?: { source?: unknown } } | null,
): SharedAnnotation["acceptedState"] {
  if (!entity || entity.type === "prediction") return null;

  const direct = entity.acceptedState ?? entity.accepted_state;
  if (direct != null && direct !== "") {
    return normalizeReviewAcceptedState(direct);
  }

  return resolveReviewAcceptedStateFromTaskSource(entity, store?.task?.source);
}
