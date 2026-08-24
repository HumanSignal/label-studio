/**
 * Sort helper for the annotations list.
 */
import { userDisplayName } from "../utils/helpers";
import type { AnnotationsListSortField, AnnotationsListSortState, SharedAnnotation } from "./types";

export const DEFAULT_ANNOTATIONS_LIST_SORT: AnnotationsListSortState = {
  field: "createdAt",
  direction: "desc",
};

const SORT_FIELDS: AnnotationsListSortField[] = ["createdAt", "updatedAt", "name"];

function isSortField(value: unknown): value is AnnotationsListSortField {
  return typeof value === "string" && SORT_FIELDS.includes(value as AnnotationsListSortField);
}

function getSortableDate(a: SharedAnnotation, field: AnnotationsListSortField): string {
  if (field === "updatedAt") {
    return a.updatedDate || a.createdDate || "";
  }
  return a.createdDate || "";
}

function getSortableName(a: SharedAnnotation): string {
  if (a.user) {
    const fromUser = userDisplayName(a.user as Record<string, string>);
    if (fromUser?.trim()) return fromUser.trim().toLowerCase();
  }
  if (a.createdBy?.trim()) return a.createdBy.trim().toLowerCase();
  const fallbackId = a.pk != null && String(a.pk) !== "" ? a.pk : a.id;
  return `annotation ${fallbackId}`.toLowerCase();
}

/** Normalizes legacy persisted sort values (plain field string) to full sort state. */
export function normalizeAnnotationsListSort(value: unknown): AnnotationsListSortState {
  if (isSortField(value)) {
    return { field: value, direction: "desc" };
  }

  if (value && typeof value === "object" && "field" in value && "direction" in value) {
    const candidate = value as AnnotationsListSortState;
    const field = isSortField(candidate.field) ? candidate.field : "createdAt";
    const direction = candidate.direction === "asc" ? "asc" : "desc";
    return { field, direction };
  }

  return DEFAULT_ANNOTATIONS_LIST_SORT;
}

/**
 * Returns a new array sorted by the selected field and direction.
 * Does not mutate the input.
 */
export function sortAnnotationsList(entities: SharedAnnotation[], sort: AnnotationsListSortState): SharedAnnotation[] {
  if (entities.length <= 1) return entities;

  const multiplier = sort.direction === "asc" ? 1 : -1;

  return [...entities].sort((a, b) => {
    const compare =
      sort.field === "name"
        ? getSortableName(a).localeCompare(getSortableName(b))
        : getSortableDate(a, sort.field).localeCompare(getSortableDate(b, sort.field));
    return multiplier * compare;
  });
}
