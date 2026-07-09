/**
 * Pure filter logic for the annotations list.
 *
 * Applied *after* the capability-based type filter (enableAnnotations / enablePredictions)
 * that already lives in AnnotationsCarousel. This layer adds user-facing filtering:
 * text search, type toggle, and tri-state boolean status filters.
 */
import type {
  AnnotationsListBooleanFilter,
  AnnotationsListFilter,
  AnnotationsListStatusField,
  AnnotationsListStatusFilters,
  AnnotationsListTypeFilter,
  SharedAnnotation,
} from "./types";
import { userDisplayName } from "../utils/helpers";

export const DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS: AnnotationsListStatusFilters = {
  draft: null,
  groundTruth: null,
  skipped: null,
  unresolvedComments: null,
  reviewed: null,
  accepted: null,
  rejected: null,
  fixedAndAccepted: null,
};

export const DEFAULT_ANNOTATIONS_LIST_FILTER: AnnotationsListFilter = {
  query: "",
  type: "all",
  statuses: DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS,
};

/** Review-only status fields — meaningful only when LSE populates acceptedState. */
export const REVIEW_STATUS_FIELDS: AnnotationsListStatusField[] = ["accepted", "rejected", "fixedAndAccepted"];

/** Clears review status filters when the host does not support review status (OSS). */
export function stripReviewStatusFilters(
  filter: AnnotationsListFilter,
  enableReviewStatusFilters: boolean,
): AnnotationsListFilter {
  if (enableReviewStatusFilters) return filter;

  const statuses = { ...filter.statuses };
  for (const field of REVIEW_STATUS_FIELDS) {
    statuses[field] = null;
  }
  return { ...filter, statuses };
}

function isDraft(a: SharedAnnotation): boolean {
  return a.pk == null || (a.draftId != null && a.draftId > 0) || a.ephemeral === true;
}

function isReviewed(a: SharedAnnotation): boolean {
  return a.acceptedState != null;
}

function isAccepted(a: SharedAnnotation): boolean {
  return a.acceptedState === "accepted";
}

function isRejected(a: SharedAnnotation): boolean {
  return a.acceptedState === "rejected";
}

function isFixedAndAccepted(a: SharedAnnotation): boolean {
  return a.acceptedState === "fixed";
}

function getStatusValue(a: SharedAnnotation, field: AnnotationsListStatusField): boolean {
  switch (field) {
    case "draft":
      return isDraft(a);
    case "groundTruth":
      return a.groundTruth === true;
    case "skipped":
      return a.skipped === true;
    case "unresolvedComments":
      return (a.unresolvedCommentCount ?? 0) > 0;
    case "reviewed":
      return isReviewed(a);
    case "accepted":
      return isAccepted(a);
    case "rejected":
      return isRejected(a);
    case "fixedAndAccepted":
      return isFixedAndAccepted(a);
    default:
      return false;
  }
}

function matchesBooleanFilter(actual: boolean, filter: AnnotationsListBooleanFilter): boolean {
  if (filter === null) return true;
  return filter === actual;
}

function matchesTextQuery(a: SharedAnnotation, lowerQuery: string): boolean {
  if (a.pk != null && String(a.pk).toLowerCase().includes(lowerQuery)) return true;

  if (a.user) {
    const displayName = userDisplayName(a.user as Record<string, string>);
    if (displayName && displayName.toLowerCase().includes(lowerQuery)) return true;
    if (a.user.email && a.user.email.toLowerCase().includes(lowerQuery)) return true;
  }

  if (a.createdBy && a.createdBy.toLowerCase().includes(lowerQuery)) return true;

  if (a.versions?.result) {
    try {
      if (JSON.stringify(a.versions.result).toLowerCase().includes(lowerQuery)) return true;
    } catch {
      // non-serializable result — skip silently
    }
  }

  if (a.versions?.draft) {
    try {
      if (JSON.stringify(a.versions.draft).toLowerCase().includes(lowerQuery)) return true;
    } catch {
      // non-serializable draft — skip silently
    }
  }

  return false;
}

function migrateLegacyTypeFromStatuses(raw: unknown): AnnotationsListTypeFilter | null {
  if (Array.isArray(raw)) {
    if (raw.includes("annotation")) return "annotation";
    if (raw.includes("prediction")) return "prediction";
    return null;
  }

  if (!raw || typeof raw !== "object") return null;

  const statuses = raw as Record<string, unknown>;
  if (statuses.annotation === true) return "annotation";
  if (statuses.prediction === true || statuses.annotation === false) return "prediction";
  return null;
}

function normalizeStatusFilters(raw: unknown): AnnotationsListStatusFilters {
  const normalized: AnnotationsListStatusFilters = { ...DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS };

  if (Array.isArray(raw)) {
    for (const field of raw) {
      if (typeof field === "string" && field in normalized) {
        normalized[field as AnnotationsListStatusField] = true;
      }
    }
    return normalized;
  }

  if (!raw || typeof raw !== "object") return normalized;

  for (const field of Object.keys(DEFAULT_ANNOTATIONS_LIST_STATUS_FILTERS) as AnnotationsListStatusField[]) {
    const value = (raw as Record<string, unknown>)[field];
    if (value === true || value === false || value === null) {
      normalized[field] = value;
    }
  }

  return normalized;
}

/** Normalizes persisted or legacy filter payloads into the current shape. */
export function normalizeAnnotationsListFilter(raw: unknown): AnnotationsListFilter {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_ANNOTATIONS_LIST_FILTER;
  }

  const value = raw as Partial<AnnotationsListFilter> & { statuses?: unknown };
  let type: AnnotationsListTypeFilter =
    value.type === "annotation" || value.type === "prediction" || value.type === "all"
      ? value.type
      : DEFAULT_ANNOTATIONS_LIST_FILTER.type;

  const legacyType = migrateLegacyTypeFromStatuses(value.statuses);
  if (legacyType && type === "all") {
    type = legacyType;
  }

  return {
    query: typeof value.query === "string" ? value.query : DEFAULT_ANNOTATIONS_LIST_FILTER.query,
    type,
    statuses: normalizeStatusFilters(value.statuses),
  };
}

export function hasActiveStatusFilters(statuses: AnnotationsListStatusFilters): boolean {
  return Object.values(statuses).some((value) => value !== null);
}

function matchesAnnotationStatusFilters(a: SharedAnnotation, statuses: AnnotationsListStatusFilters): boolean {
  for (const field of Object.keys(statuses) as AnnotationsListStatusField[]) {
    const statusFilter = statuses[field];
    if (!matchesBooleanFilter(getStatusValue(a, field), statusFilter)) return false;
  }
  return true;
}

/**
 * Returns true when the annotation matches the given filter.
 * Does NOT account for the "selected annotation always visible" rule —
 * callers should apply that separately.
 */
export function matchesAnnotationsListFilter(a: SharedAnnotation, filter: AnnotationsListFilter): boolean {
  const normalized = normalizeAnnotationsListFilter(filter);

  if (normalized.type !== "all" && a.type !== normalized.type) return false;

  const statusFiltersActive = hasActiveStatusFilters(normalized.statuses);

  if (a.type === "prediction") {
    if (normalized.type === "all" && statusFiltersActive) return false;
    // Predictions-only mode and no status filters: include all predictions.
  } else if (!matchesAnnotationStatusFilters(a, normalized.statuses)) {
    return false;
  }

  const trimmed = normalized.query.trim();
  if (trimmed.length > 0) {
    if (!matchesTextQuery(a, trimmed.toLowerCase())) return false;
  }

  return true;
}

/**
 * Filter an entity list, ensuring the currently selected annotation
 * is always included even when it doesn't match the filter.
 */
export function filterAnnotationsList(
  entities: SharedAnnotation[],
  filter: AnnotationsListFilter,
  selectedId: string | null,
): SharedAnnotation[] {
  return entities.filter((a) => matchesAnnotationsListFilter(a, filter) || (selectedId != null && a.id === selectedId));
}

/** Returns true when the filter has any active criteria. */
export function isFilterActive(filter: AnnotationsListFilter): boolean {
  const normalized = normalizeAnnotationsListFilter(filter);
  return normalized.query.trim().length > 0 || normalized.type !== "all" || hasActiveStatusFilters(normalized.statuses);
}
