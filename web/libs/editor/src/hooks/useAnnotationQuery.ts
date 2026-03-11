/**
 * FIT-720: Shared annotation fetching hook using TanStack Query
 *
 * Provides caching, deduplication, and invalidation for annotation fetches.
 * Cache invalidation utilities (invalidateAnnotationCache, invalidateDistributionCache)
 * live in @humansignal/core/lib/utils/annotation-cache and are re-exported from this module.
 */
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { annotationKeys } from "@humansignal/core/lib/utils/annotation-cache";

// Re-export annotationKeys so existing consumers don't break
export { annotationKeys };
// Re-export cache invalidation functions from core
export { invalidateAnnotationCache, invalidateDistributionCache } from "@humansignal/core/lib/utils/annotation-cache";

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
const fetchAnnotationQueryFn = ({ queryKey }: any) => {
  return fetchAnnotation(queryKey[1] as string | number);
};

/**
 * Hook for fetching a single annotation with TanStack Query
 * Use this when you want reactive data that auto-updates
 */
export const useAnnotation = (id: number | string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: annotationKeys.detail(id!),
    queryFn: fetchAnnotationQueryFn,
    enabled: !!id && options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for imperative annotation fetching with caching
 * Use this for lazy loading where you trigger fetches manually
 */
export const useAnnotationFetcher = () => {
  const queryClient = useQueryClient();

  /**
   * Check if annotation is currently being fetched
   */
  const isAnnotationFetching = useCallback(
    (id: number | string): boolean => {
      const state = queryClient.getQueryState(annotationKeys.detail(id));
      return state?.fetchStatus === "fetching";
    },
    [queryClient],
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
          queryKey: annotationKeys.detail(id),
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
    [queryClient],
  );

  /**
   * Prefetch annotation (non-blocking)
   */
  const prefetchAnnotation = useCallback(
    (id: number | string) => {
      queryClient.prefetchQuery({
        queryKey: annotationKeys.detail(id),
        queryFn: fetchAnnotationQueryFn,
        staleTime: 30000,
        cacheTime: 5 * 60 * 1000,
      });
    },
    [queryClient],
  );

  /**
   * Cancel in-flight annotation fetch
   */
  const cancelAnnotationFetch = useCallback(
    (id: number | string) => {
      queryClient.cancelQueries({ queryKey: annotationKeys.detail(id) });
    },
    [queryClient],
  );

  /**
   * Invalidate annotation cache (force refetch on next access)
   */
  const invalidateAnnotation = useCallback(
    (id: number | string) => {
      queryClient.invalidateQueries({ queryKey: annotationKeys.detail(id) });
    },
    [queryClient],
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
      return queryClient.getQueryData(annotationKeys.detail(id)) !== undefined;
    },
    [queryClient],
  );

  /**
   * Get cached annotation data (if available)
   */
  const getCachedAnnotation = useCallback(
    (id: number | string): AnnotationData | undefined => {
      return queryClient.getQueryData(annotationKeys.detail(id));
    },
    [queryClient],
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
  };
};

/**
 * Get the query client for external invalidation
 * Use this in non-component code (like MST actions)
 */
export { useQueryClient };
