/**
 * Hook for fetching state history from the API
 */

import { useQuery } from "@tanstack/react-query";
import { getApiInstance } from "@humansignal/core/lib/api-provider/api-instance";

export interface StateHistoryItem {
  state: string;
  created_at: string;
  triggered_by: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  previous_state?: string;
  transition_name?: string;
  reason?: string;
  context_data?: {
    reason?: string;
  };
}

export interface StateHistoryResponse {
  results: StateHistoryItem[];
}

export interface UseStateHistoryOptions {
  entityType: "task" | "annotation" | "project";
  entityId: number;
  enabled?: boolean;
}

/**
 * Hook to fetch state transition history for an entity
 *
 * @param options - Configuration options
 * @returns Query result with state history data
 */
export function useStateHistory({ entityType, entityId, enabled = true }: UseStateHistoryOptions) {
  const queryKey = ["state-history", entityType, entityId];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const api = getApiInstance();

      // Use the API provider to make the request
      const result = await api.invoke<StateHistoryResponse>("fsmStateHistory", { entityType, entityId });

      // Handle API errors
      if (result?.error || !result?.$meta?.ok) {
        throw new Error(result?.error || "Failed to fetch state history");
      }

      return result as StateHistoryResponse;
    },
    enabled: enabled && !!entityId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2,
  });

  return { data, isLoading, isError, error, refetch };
}
