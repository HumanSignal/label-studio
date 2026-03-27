/**
 * FIT-720: Shared annotation cache invalidation utilities
 *
 * These functions allow cache invalidation from anywhere in the app,
 * including non-React code (like MST actions in datamanager).
 * They use the shared queryClient instance directly.
 */
import { queryClient } from "./query-client";

// Query key factory for consistent key generation
export const annotationKeys = {
  all: ["annotations"] as const,
  /** Always stringify id — TanStack treats `["annotations", 1032]` and `["annotations", "1032"]` as different caches; mixed types broke invalidation after save. */
  detail: (id: number | string) => ["annotations", String(id)] as const,
};

/**
 * Invalidate annotation cache from anywhere (even outside React).
 * Call this after an annotation is updated/submitted.
 */
export const invalidateAnnotationCache = (annotationId?: number | string) => {
  if (annotationId !== undefined && annotationId !== "") {
    const idStr = String(annotationId);
    // Match normalized keys and any legacy entries that used a number in the key
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey;
        return k[0] === "annotations" && k.length >= 2 && String(k[1]) === idStr;
      },
    });
  } else {
    // Invalidate all annotations
    queryClient.invalidateQueries({ queryKey: annotationKeys.all });
  }
};

/**
 * Invalidate task agreement / distribution payload cache (GET `/api/tasks/:id/agreement/`).
 * Call this after annotations are added/removed/updated for a task.
 * Query key must match `useQuery` in `TaskSummary` and `Aggregation` (`["task-agreement", taskId]`).
 */
export const invalidateTaskAgreementCache = (taskId?: number | string) => {
  if (taskId) {
    queryClient.invalidateQueries({ queryKey: ["task-agreement", taskId] });
  } else {
    // Invalidate all task-agreement queries
    queryClient.invalidateQueries({ queryKey: ["task-agreement"] });
  }
};
