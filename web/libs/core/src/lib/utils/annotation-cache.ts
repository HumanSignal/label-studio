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
  detail: (id: number | string) => ["annotations", id] as const,
};

/**
 * Invalidate annotation cache from anywhere (even outside React).
 * Call this after an annotation is updated/submitted.
 */
export const invalidateAnnotationCache = (annotationId?: number | string) => {
  if (annotationId) {
    queryClient.invalidateQueries({ queryKey: annotationKeys.detail(annotationId) });
  } else {
    // Invalidate all annotations
    queryClient.invalidateQueries({ queryKey: annotationKeys.all });
  }
};

/**
 * Invalidate distribution cache for a task.
 * Call this after annotations are added/removed/updated for a task.
 */
export const invalidateDistributionCache = (taskId?: number | string) => {
  if (taskId) {
    queryClient.invalidateQueries({ queryKey: ["task-distribution", taskId] });
  } else {
    // Invalidate all distributions
    queryClient.invalidateQueries({ queryKey: ["task-distribution"] });
  }
};
