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
const MAX_USERS_PAGE_SIZE = 100;

interface DataManagerUserScope {
  column?: string;
}

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
  Math.min(Math.max(pageSize, selectedUserIds.length), MAX_USERS_PAGE_SIZE);

export const chunkSelectedUserIds = (selectedUserIds: number[]): number[][] => {
  const chunks: number[][] = [];
  for (let index = 0; index < selectedUserIds.length; index += MAX_USERS_PAGE_SIZE) {
    chunks.push(selectedUserIds.slice(index, index + MAX_USERS_PAGE_SIZE));
  }
  return chunks;
};

export const mergeSelectedUsers = (
  response: UsersResponse,
  cachedUsers: APIUser[],
  selectedUserIds: number[],
  inflateDisplayCount = true,
): UsersResponse => {
  const selectedIds = new Set(selectedUserIds);
  const responseIds = new Set(response.results.map(({ id }) => id));
  const selectedUsers = cachedUsers.filter(({ id }) => selectedIds.has(id) && !responseIds.has(id));

  return {
    ...response,
    results: [...response.results, ...selectedUsers],
    displayCount: response.count + (inflateDisplayCount ? selectedUsers.length : 0),
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
  search = null,
  selectedValue: SelectedUserValue = null,
  scope: DataManagerUserScope = {},
) => {
  const seenUsersRef = useRef(new Map<number, APIUser>());
  const selectedUserIds = normalizeSelectedUserIds(selectedValue);
  const selectedUserIdChunks = chunkSelectedUserIds(selectedUserIds);
  const requestPageSize = getUsersPageSize(pageSize, selectedUserIds);
  // Include column so predicate-scoped pickers do not share React Query cache entries.
  // Do not reintroduce removed isDeleted/role — those were dropped from the options contract (FIT-2282).
  const queryKey = ["projectUsers", projectId, scope.column, requestPageSize, search, selectedUserIds];

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
          ordering: "id",
        };

        if (search) params.search = search;
        if (scope.column) params.column = scope.column;
        if (selectedUserIdChunks.length) params.selected_value = selectedUserIdChunks[0];
        const apiResponse = await store.apiCall?.("projectUsers", params);

        if (!apiResponse) {
          throw new Error("No users found in response or response is invalid");
        }
        const response = normalizeUsersResponse(apiResponse);
        response.results.forEach((user) => seenUsersRef.current.set(user.id, user));
        if (pageParam === 1 && selectedUserIdChunks.length && (search || selectedUserIdChunks.length > 1)) {
          const chunksToFetch = search ? selectedUserIdChunks : selectedUserIdChunks.slice(1);
          await Promise.all(
            chunksToFetch.map(async (selectedIds) => {
              const missingSelectedIds = selectedIds.filter((id) => !seenUsersRef.current.has(id));
              if (!missingSelectedIds.length) return;

              const selectedParams = {
                ...params,
                page: 1,
                page_size: MAX_USERS_PAGE_SIZE,
                selected_value: missingSelectedIds,
              };
              delete selectedParams.search;
              const selectedApiResponse = await store.apiCall?.("projectUsers", selectedParams);
              if (selectedApiResponse) {
                const missingIds = new Set(missingSelectedIds);
                normalizeUsersResponse(selectedApiResponse)
                  .results.filter(({ id }) => missingIds.has(id))
                  .forEach((user) => seenUsersRef.current.set(user.id, user));
              }
            }),
          );
          const selectedUsers = selectedUserIds.flatMap((id) => {
            const user = seenUsersRef.current.get(id);
            return user ? [user] : [];
          });
          return mergeSelectedUsers(response, selectedUsers, selectedUserIds, Boolean(search));
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
