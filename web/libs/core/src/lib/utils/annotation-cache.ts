/**
 * FIT-720: Shared annotation cache invalidation utilities
 *
 * These functions allow cache invalidation from anywhere in the app,
 * including non-React code (like MST actions in datamanager).
 * They use the shared queryClient instance directly.
 */
import { queryClient } from "./query-client";

/** Segment discriminating task-scoped annotation detail keys from legacy 2-tuple keys. */
export const ANNOTATION_DETAIL_TASK_SCOPE = "task" as const;

// Query key factory for consistent key generation
export const annotationKeys = {
  all: ["annotations"] as const,
  /**
   * Detail cache key for GET /api/annotations/:id/.
   * When `taskId` is set, key is `["annotations","task",taskId,annotationId]` so callers can
   * invalidate all annotations on a task with a single prefix match (see {@link invalidateAnnotationCachesForTask}).
   * When `taskId` is omitted, uses legacy `["annotations", annotationId]` (backwards compatible).
   */
  detail: (taskId: number | string | undefined | null, annotationId: number | string) => {
    if (taskId != null && taskId !== "") {
      return ["annotations", ANNOTATION_DETAIL_TASK_SCOPE, String(taskId), String(annotationId)] as const;
    }
    return ["annotations", String(annotationId)] as const;
  },
};

/**
 * Invalidate all TanStack annotation-detail entries for a task (single prefix invalidation).
 */
export const invalidateAnnotationCachesForTask = (taskId?: number | string | null) => {
  if (taskId == null || taskId === "") return;
  queryClient.invalidateQueries({
    queryKey: ["annotations", ANNOTATION_DETAIL_TASK_SCOPE, String(taskId)],
  });
};

/**
 * Invalidate annotation cache from anywhere (even outside React).
 * Call this after an annotation is updated/submitted.
 * When `taskId` is known, prefer {@link invalidateAnnotationCachesForTask} for sibling-safe invalidation.
 */
export const invalidateAnnotationCache = (annotationId?: number | string, taskId?: number | string | null) => {
  if (annotationId !== undefined && annotationId !== "") {
    const idStr = String(annotationId);
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey;
        if (k[0] !== "annotations") return false;
        // Task-scoped: ["annotations", "task", taskStr, annStr]
        if (k[1] === ANNOTATION_DETAIL_TASK_SCOPE && k.length >= 4) {
          if (String(k[3]) !== idStr) return false;
          if (taskId != null && taskId !== "" && String(k[2]) !== String(taskId)) return false;
          return true;
        }
        // Legacy: ["annotations", annStr]
        return k.length === 2 && String(k[1]) === idStr;
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

type TaskAnnotationCacheSource = {
  id?: number | string;
  is_stub?: boolean;
  result?: unknown;
};

type TaskCacheSource = {
  id?: number | string;
  annotations?: Array<TaskAnnotationCacheSource | null | undefined> | null;
};

/**
 * Seed GET /api/annotations/:id/ cache from an already-hydrated task payload (FIT-2532).
 * Skips stubs so FIT-720 lazy-load can still fetch the selected row.
 */
export const primeAnnotationCachesFromTask = (task?: TaskCacheSource | null) => {
  if (task?.id == null || task.id === "" || !Array.isArray(task.annotations)) return;
  for (const annotation of task.annotations) {
    if (annotation?.id == null || annotation.id === "") continue;
    if (annotation.is_stub) continue;
    if (annotation.result === undefined) continue;
    queryClient.setQueryData(annotationKeys.detail(task.id, annotation.id), annotation);
    queryClient.setQueryData(annotationKeys.detail(undefined, annotation.id), annotation);
  }
};
