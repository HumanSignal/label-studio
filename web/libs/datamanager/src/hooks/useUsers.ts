import { useCallback } from "react";
import { type InfiniteData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

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

export const chunkSelectedUserIds = (selectedUserIds: number[]): number[][] => {
  const chunks: number[][] = [];
  for (let index = 0; index < selectedUserIds.length; index += MAX_USERS_PAGE_SIZE) {
    chunks.push(selectedUserIds.slice(index, index + MAX_USERS_PAGE_SIZE));
  }
  return chunks;
};

export const appendSelectedUsers = (pagedUsers: APIUser[], selectedUsers: APIUser[]): APIUser[] => {
  const pagedIds = new Set(pagedUsers.map(({ id }) => id));
  return [...pagedUsers, ...selectedUsers.filter(({ id }) => !pagedIds.has(id))];
};

export const deduplicateUsers = (users: APIUser[]): APIUser[] => {
  const usersById = new Map<number, APIUser>();
  users.forEach((user) => usersById.set(user.id, user));
  return Array.from(usersById.values());
};

export const getUsersItemCount = (serverCount: number, loadedUserCount: number, hasNextPage?: boolean): number =>
  hasNextPage === false ? loadedUserCount : serverCount;

const getStore = () => {
  // Use the correct DataManager API pattern - window.DM is the AppStore
  const store = window?.DM?.store || window?.DM;
  if (!store) {
    throw new Error("DataManager store not available");
  }
  return store;
};

// DataManager-style user fetching with pagination using React Query.
// The option list keeps the server order whatever is selected: selected users are fetched on their own
// so the picker can show them without the list re-sorting them to the top. Selected users are looked up
// in the query cache, so a picker that remounts still finds the ones it loaded before.
export const useDataManagerUsers = (
  projectId: string | number,
  pageSize = 20,
  search = null,
  selectedValue: SelectedUserValue = null,
  scope: DataManagerUserScope = {},
) => {
  const queryClient = useQueryClient();
  const selectedUserIds = normalizeSelectedUserIds(selectedValue);
  // Include column so predicate-scoped pickers do not share React Query cache entries.
  // Do not reintroduce removed isDeleted/role — those were dropped from the options contract (FIT-2282).
  const queryKey = ["projectUsers", projectId, scope.column, pageSize, search];

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery(
    {
      queryKey,
      queryFn: async ({ pageParam = 1 }) => {
        const params: any = {
          page: pageParam,
          page_size: pageSize,
          project: projectId,
          ordering: "id",
        };

        if (search) params.search = search;
        if (scope.column) params.column = scope.column;
        const apiResponse = await getStore().apiCall?.("projectUsers", params);

        if (!apiResponse) {
          throw new Error("No users found in response or response is invalid");
        }
        return normalizeUsersResponse(apiResponse);
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
      keepPreviousData: true,
    },
  );

  const knownUsers = new Map<number, APIUser>();
  queryClient
    .getQueriesData<InfiniteData<UsersResponse>>(["projectUsers", projectId, scope.column])
    .forEach(([, cached]) => cached?.pages?.forEach((page) => page.results.forEach((u) => knownUsers.set(u.id, u))));
  queryClient
    .getQueriesData<APIUser[]>(["projectUsersSelected", projectId, scope.column])
    .forEach(([, cached]) => cached?.forEach((u) => knownUsers.set(u.id, u)));

  const missingSelectedIds = selectedUserIds.filter((id) => !knownUsers.has(id));
  useQuery({
    queryKey: ["projectUsersSelected", projectId, scope.column, missingSelectedIds],
    queryFn: async () => {
      const store = getStore();
      const batches = await Promise.all(
        chunkSelectedUserIds(missingSelectedIds).map(async (selectedIds) => {
          const params: any = {
            page: 1,
            page_size: MAX_USERS_PAGE_SIZE,
            project: projectId,
            ordering: "id",
            selected_value: selectedIds,
          };
          if (scope.column) params.column = scope.column;
          const apiResponse = await store.apiCall?.("projectUsers", params);
          if (!apiResponse) return [];
          const requestedIds = new Set(selectedIds);
          return normalizeUsersResponse(apiResponse).results.filter(({ id }) => requestedIds.has(id));
        }),
      );
      return batches.flat();
    },
    enabled: !!projectId && missingSelectedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const pagedUsers = deduplicateUsers(data?.pages.flatMap((page) => page.results) ?? []);
  const selectedUsers = selectedUserIds.flatMap((id) => {
    const user = knownUsers.get(id);
    return user ? [user] : [];
  });
  const users = appendSelectedUsers(pagedUsers, selectedUsers);
  // Selected users outside a search result are extra rows the server did not count.
  const appendedCount = search ? users.length - pagedUsers.length : 0;
  const serverTotal = (data?.pages[0]?.count ?? 0) + appendedCount;
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
