import { useQuery } from "@tanstack/react-query";

// Extend Window interface to include DataManager properties
declare global {
  interface Window {
    DM?: {
      store?: {
        apiCall: (method: string, params?: any) => Promise<any>;
      };
      apiCall?: (method: string, params?: any) => Promise<any>;
    };
  }
}

interface Action {
  id: string;
  title: string;
  order: number;
  hidden?: boolean;
  dialog?: {
    type?: string;
    text?: string;
    form?: any;
    title?: string;
  };
  children?: Action[];
  disabled?: boolean;
  disabledReason?: string;
  isSeparator?: boolean;
  isTitle?: boolean;
  callback?: (selection: any, action: Action) => void;
}

interface UseActionsOptions {
  projectId?: string;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

/**
 * Hook to fetch available actions from the DataManager API
 * Uses TanStack Query for data fetching and caching
 *
 * @param options - Configuration options for the query
 * @returns Object containing actions data, loading state, error state, and refetch function
 */
export const useActions = (options: UseActionsOptions = {}) => {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    projectId,
  } = options;

  const queryKey = ["actions", projectId];

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      // Use the correct DataManager API pattern - window.DM is the AppStore
      const store = window?.DM?.store || window?.DM;

      if (!store) {
        throw new Error("DataManager store not available");
      }

      const response = await store.apiCall?.("actions");

      if (!response) {
        throw new Error("No actions found in response or response is invalid");
      }

      return response as Action[];
    },
    enabled,
    staleTime,
    cacheTime,
  });

  const actions = data ?? [];

  return {
    actions,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
