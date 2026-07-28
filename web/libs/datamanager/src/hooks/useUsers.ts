import { useCallback, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

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

export interface APIUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UsersResponse {
  results: APIUser[];
  count: number;
  displayCount?: number;
}

export type UsersApiResponse = UsersResponse | (APIUser[] & { count?: number; displayCount?: number });

type SelectedUserValue = number | number[] | null | undefined;

export const normalizeUsersResponse = (response: UsersApiResponse): UsersResponse => {
  const normalized: UsersResponse = Array.isArray(response)
    ? {
        results: response,
        count: response.count ?? response.length,
        ...(response.displayCount === undefined ? {} : { displayCount: response.displayCount }),
      }
    : response;
  return normalized;
};

export const normalizeSelectedUserIds = (selectedValue: SelectedUserValue): number[] => {
  const values = Array.isArray(selectedValue) ? selectedValue : selectedValue == null ? [] : [selectedValue];
  return [...new Set(values)];
};

export const getUsersPageSize = (pageSize: number, selectedUserIds: number[]): number =>
  Math.max(pageSize, selectedUserIds.length);

export const mergeSelectedUsers = (
  response: UsersResponse,
  cachedUsers: APIUser[],
  selectedUserIds: number[],
): UsersResponse => {
  const selectedIds = new Set(selectedUserIds);
  const responseIds = new Set(response.results.map(({ id }) => id));
  const selectedUsers = cachedUsers.filter(({ id }) => selectedIds.has(id) && !responseIds.has(id));

  return {
    ...response,
    results: [...response.results, ...selectedUsers],
    displayCount: response.count + selectedUsers.length,
  };
};

export const deduplicateUsers = (users: APIUser[]): APIUser[] => {
  const usersById = new Map<number, APIUser>();
  users.forEach((user) => usersById.set(user.id, user));
  return Array.from(usersById.values());
};

export const getUsersItemCount = (serverCount: number, loadedUserCount: number, hasNextPage?: boolean): number =>
  hasNextPage === false ? loadedUserCount : serverCount;

// DataManager-style user fetching with pagination using React Query
export const useDataManagerUsers = (
  projectId: string | number,
  pageSize = 20,
  isDeleted = false,
  role = null,
  search = null,
  selectedValue: SelectedUserValue = null,
) => {
  const seenUsersRef = useRef(new Map<number, APIUser>());
  const selectedUserIds = normalizeSelectedUserIds(selectedValue);
  const requestPageSize = getUsersPageSize(pageSize, selectedUserIds);
  const queryKey = ["users", projectId, requestPageSize, isDeleted, role, search, selectedUserIds];

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
          page_size: requestPageSize,
          project: projectId,
          is_deleted: isDeleted,
        };

        if (role) params.role = role;
        if (search) params.search = search;
        if (selectedUserIds.length) params.selected_value = selectedUserIds;
        const apiResponse = await store.apiCall?.("users", params);

        if (!apiResponse) {
          throw new Error("No users found in response or response is invalid");
        }
        const response = normalizeUsersResponse(apiResponse);
        response.results.forEach((user) => seenUsersRef.current.set(user.id, user));
        if (pageParam === 1 && search && selectedUserIds.length) {
          const hasMissingSelectedUsers = selectedUserIds.some((id) => !seenUsersRef.current.has(id));
          if (hasMissingSelectedUsers) {
            const selectedParams = { ...params };
            delete selectedParams.search;
            const selectedApiResponse = await store.apiCall?.("users", selectedParams);
            if (selectedApiResponse) {
              normalizeUsersResponse(selectedApiResponse).results.forEach((user) =>
                seenUsersRef.current.set(user.id, user),
              );
            }
          }
          const selectedUsers = selectedUserIds.flatMap((id) => {
            const user = seenUsersRef.current.get(id);
            return user ? [user] : [];
          });
          return mergeSelectedUsers(response, selectedUsers, selectedUserIds);
        }

        return response;
      },
      getNextPageParam: (lastPage, allPages) => {
        const totalCount = lastPage.count || 0;
        const currentPage = allPages.length;
        const hasMore = currentPage * requestPageSize < totalCount;
        return hasMore ? currentPage + 1 : undefined;
      },
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      keepPreviousData: true,
    },
  );

  // Flatten all pages into a single array
  const users = deduplicateUsers(data?.pages.flatMap((page) => page.results) ?? []);
  const serverTotal = data?.pages[0]?.displayCount ?? data?.pages[0]?.count ?? 0;
  const total = getUsersItemCount(serverTotal, users.length, hasNextPage);

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
