/**
 * FIT-720: Shared annotation fetching hook using TanStack Query
 *
 * Provides caching, deduplication, and invalidation for annotation fetches.
 * Cache invalidation utilities (invalidateAnnotationCache, invalidateTaskAgreementCache)
 * live in @humansignal/core/lib/utils/annotation-cache and are re-exported from this module.
 */
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { annotationKeys, ANNOTATION_DETAIL_TASK_SCOPE } from "@humansignal/core/lib/utils/annotation-cache";

// Re-export annotationKeys so existing consumers don't break
export { annotationKeys, ANNOTATION_DETAIL_TASK_SCOPE };
// Re-export cache invalidation functions from core
export {
  invalidateAnnotationCache,
  invalidateAnnotationCachesForTask,
  invalidateTaskAgreementCache,
} from "@humansignal/core/lib/utils/annotation-cache";

// Type for annotation API response
export type AnnotationData = {
  id: number;
  result: any[];
  created_at?: string;
  updated_at?: string;
  completed_by?: any;
  ground_truth?: boolean;
  [key: string]: any;
};

/**
 * Fetch a single annotation from the API
 */
export const fetchAnnotation = async (id: number | string): Promise<AnnotationData> => {
  const response = await fetch(`/api/annotations/${id}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch annotation ${id}: ${response.status}`);
  }
  return response.json();
};

/** Wrapper to prevent caching lexical scopes in React Query */
const fetchAnnotationQueryFn = ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const k = queryKey;
  const id =
    k[1] === ANNOTATION_DETAIL_TASK_SCOPE && k.length >= 4 ? (k[3] as string | number) : (k[1] as string | number);
  return fetchAnnotation(id);
};

/**
 * Hook for fetching a single annotation with TanStack Query
 * Use this when you want reactive data that auto-updates
 */
export const useAnnotation = (
  id: number | string | undefined,
  options?: { enabled?: boolean; taskId?: number | string | null },
) => {
  return useQuery({
    queryKey: annotationKeys.detail(options?.taskId, id!),
    queryFn: fetchAnnotationQueryFn,
    enabled: !!id && options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for imperative annotation fetching with caching
 * Use this for lazy loading where you trigger fetches manually
 * @param taskId - When set, cache keys are scoped to the task so invalidation can target all annotations on that task.
 */
export const useAnnotationFetcher = (taskId?: number | string | null) => {
  const queryClient = useQueryClient();

  const detailKey = useCallback(
    (annotationId: number | string) => annotationKeys.detail(taskId, annotationId),
    [taskId],
  );

  /**
   * Check if annotation is currently being fetched
   */
  const isAnnotationFetching = useCallback(
    (id: number | string): boolean => {
      const state = queryClient.getQueryState(detailKey(id));
      return state?.fetchStatus === "fetching";
    },
    [queryClient, detailKey],
  );

  /**
   * Fetch annotation with caching - won't duplicate in-flight requests
   * Uses ensureQueryData which returns cached data immediately if available
   */
  const fetchAnnotationCached = useCallback(
    async (id: number | string): Promise<AnnotationData | null> => {
      try {
        // fetchQuery returns cached data if fresh, otherwise fetches
        // It also deduplicates concurrent requests automatically
        return await queryClient.fetchQuery({
          queryKey: detailKey(id),
          queryFn: fetchAnnotationQueryFn,
          staleTime: 30000,
          cacheTime: 5 * 60 * 1000,
        });
      } catch (error: any) {
        // Silently ignore cancellation errors - they're expected when scrolling
        if (error?.name === "CancelledError" || error?.revert === true) {
          return null;
        }
        return null;
      }
    },
    [queryClient, detailKey],
  );

  /**
   * Prefetch annotation (non-blocking)
   */
  const prefetchAnnotation = useCallback(
    (id: number | string) => {
      queryClient.prefetchQuery({
        queryKey: detailKey(id),
        queryFn: fetchAnnotationQueryFn,
        staleTime: 30000,
        cacheTime: 5 * 60 * 1000,
      });
    },
    [queryClient, detailKey],
  );

  /**
   * Cancel in-flight annotation fetch
   */
  const cancelAnnotationFetch = useCallback(
    (id: number | string) => {
      queryClient.cancelQueries({ queryKey: detailKey(id) });
    },
    [queryClient, detailKey],
  );

  /**
   * Invalidate annotation cache (force refetch on next access)
   */
  const invalidateAnnotation = useCallback(
    (id: number | string) => {
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
    [queryClient, detailKey],
  );

  /**
   * Invalidate all annotations
   */
  const invalidateAllAnnotations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: annotationKeys.all });
  }, [queryClient]);

  /**
   * Check if annotation is in cache
   */
  const isAnnotationCached = useCallback(
    (id: number | string) => {
      if (queryClient.getQueryData(detailKey(id)) !== undefined) return true;
      if (taskId != null && taskId !== "") {
        return queryClient.getQueryData(annotationKeys.detail(undefined, id)) !== undefined;
      }
      return false;
    },
    [queryClient, detailKey, taskId],
  );

  /**
   * Get cached annotation data (if available)
   */
  const getCachedAnnotation = useCallback(
    (id: number | string): AnnotationData | undefined => {
      const scoped = queryClient.getQueryData(detailKey(id)) as AnnotationData | undefined;
      if (scoped !== undefined) return scoped;
      if (taskId != null && taskId !== "") {
        return queryClient.getQueryData(annotationKeys.detail(undefined, id)) as AnnotationData | undefined;
      }
      return undefined;
    },
    [queryClient, detailKey, taskId],
  );

  /**
   * Cached annotation snapshot safe to merge into MST (e.g. on Summary mount).
   * Omits stale entries so we do not re-apply pre-invalidation data after save/refetch.
   */
  const getFreshCachedAnnotation = useCallback(
    (id: number | string): AnnotationData | undefined => {
      const tryKey = (key: readonly unknown[]) => {
        const state = queryClient.getQueryState(key);
        const data = queryClient.getQueryData(key) as AnnotationData | undefined;
        if (data?.result === undefined) return undefined;
        if (!state || state.isStale) return undefined;
        return data;
      };
      const primary = tryKey(detailKey(id));
      if (primary !== undefined) return primary;
      if (taskId != null && taskId !== "") {
        return tryKey(annotationKeys.detail(undefined, id));
      }
      return undefined;
    },
    [queryClient, detailKey, taskId],
  );

  return {
    fetchAnnotationCached,
    prefetchAnnotation,
    cancelAnnotationFetch,
    invalidateAnnotation,
    invalidateAllAnnotations,
    isAnnotationCached,
    isAnnotationFetching,
    getCachedAnnotation,
    getFreshCachedAnnotation,
  };
};

/**
 * Get the query client for external invalidation
 * Use this in non-component code (like MST actions)
 */
export { useQueryClient };
