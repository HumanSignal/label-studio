import { useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { queryClient } from "@humansignal/core/lib/utils/query-client";

// Extend Window interface to include DataManager properties
declare global {
  interface Window {
    DM?: {
      store?: {
        apiCall: (method: string, params: any) => Promise<any>;
      };
      apiCall?: (method: string, params: any) => Promise<any>;
    };
  }
}

interface APIUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UsersResponse {
  results: APIUser[];
  count: number;
}

// DataManager-style user fetching with pagination using React Query
export const useDataManagerUsers = (
  projectId: string,
  pageSize = 20,
  isDeleted = false,
  role = null,
  search = null,
  selectedValue = null,
) => {
  const queryKey = ["users", projectId, pageSize, isDeleted, role, search, selectedValue];

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
    {
      queryKey,
      queryFn: async ({ pageParam = 1 }) => {
        // Use the correct DataManager API pattern - window.DM is the AppStore
        const store = window?.DM?.store || window?.DM;

        if (!store) {
          throw new Error("DataManager store not available");
        }

        const params: any = {
          page: pageParam,
          page_size: pageSize,
          project: projectId,
          is_deleted: isDeleted,
        };

        if (role) params.role = role;
        if (search) params.search = search;
        if (selectedValue) params.selected_value = selectedValue;
        const response = await store.apiCall?.("users", params);

        if (!response) {
          throw new Error("No users found in response or response is invalid");
        }
        if (search && selectedValue && response.count) {
          const users: any = queryClient.getQueryData([
            "users",
            projectId,
            pageSize,
            isDeleted,
            role,
            null,
            selectedValue,
          ])?.pages?.[0];
          if (users) {
            const selectedUser = users.find((user: any) => user.id === selectedValue);
            const results = [...response.filter((user: any) => user.id !== selectedValue), selectedUser];
            results.count = results.length;
            return results;
          }
        }

        return response as UsersResponse;
      },
      getNextPageParam: (lastPage, allPages) => {
        const totalCount = lastPage.count || 0;
        const currentPage = allPages.length;
        const hasMore = currentPage * pageSize < totalCount;
        return hasMore ? currentPage + 1 : undefined;
      },
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  );

  // Flatten all pages into a single array
  const users = data?.pages.flatMap((page) => page.results ?? page) ?? [];
  const total = data?.pages[0]?.count ?? 0;

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, hasNextPage]);

  return {
    users,
    isLoading,
    isError,
    error,
    hasMore: hasNextPage,
    total,
    loadMore,
    refetch,
    isFetchingNextPage,
  };
};
