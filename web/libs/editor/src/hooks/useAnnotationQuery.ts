/**
 * FIT-720: Shared annotation fetching hook using TanStack Query
 *
 * Provides caching, deduplication, and invalidation for annotation fetches.
 */
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

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

// Query key factory for consistent key generation
export const annotationKeys = {
  all: ["annotations"] as const,
  detail: (id: number | string) => ["annotations", id] as const,
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

/**
 * Hook for fetching a single annotation with TanStack Query
 * Use this when you want reactive data that auto-updates
 */
export const useAnnotation = (id: number | string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: annotationKeys.detail(id!),
    queryFn: () => fetchAnnotation(id!),
    enabled: !!id && options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
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
        // ensureQueryData returns cached data if fresh, otherwise fetches
        // It also deduplicates concurrent requests automatically
        return await queryClient.ensureQueryData({
          queryKey: annotationKeys.detail(id),
          queryFn: () => fetchAnnotation(id),
          staleTime: 30000,
          gcTime: 5 * 60 * 1000,
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
        queryFn: () => fetchAnnotation(id),
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
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

/**
 * FIT-720: Global reference to the editor's QueryClient
 * Set by the App component on mount, used for invalidation from non-React code
 */
let editorQueryClientRef: ReturnType<typeof useQueryClient> | null = null;

/**
 * Set the global query client reference (called by App component)
 */
export const setEditorQueryClient = (client: ReturnType<typeof useQueryClient>) => {
  editorQueryClientRef = client;
};

/**
 * Invalidate annotation cache from anywhere (even outside React)
 * Call this after an annotation is updated/submitted
 */
export const invalidateAnnotationCache = (annotationId?: number | string) => {
  if (!editorQueryClientRef) {
    return;
  }

  if (annotationId) {
    editorQueryClientRef.invalidateQueries({ queryKey: annotationKeys.detail(annotationId) });
  } else {
    // Invalidate all annotations
    editorQueryClientRef.invalidateQueries({ queryKey: annotationKeys.all });
  }
};

/**
 * Invalidate distribution cache for a task
 * Call this after annotations are added/removed/updated for a task
 */
export const invalidateDistributionCache = (taskId?: number | string) => {
  if (!editorQueryClientRef) {
    return;
  }

  if (taskId) {
    editorQueryClientRef.invalidateQueries({ queryKey: ["task-distribution", taskId] });
  } else {
    // Invalidate all distributions
    editorQueryClientRef.invalidateQueries({ queryKey: ["task-distribution"] });
  }
};
