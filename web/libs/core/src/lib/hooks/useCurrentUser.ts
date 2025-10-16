import type { APIUser } from "@humansignal/core/types/user";
import { getApiInstance } from "../../lib/api-provider/api-instance";
import { useAtomValue } from "jotai";
import { atomWithMutation, atomWithQuery, queryClientAtom } from "jotai-tanstack-query";
import { useCallback } from "react";

const currentUserAtom = atomWithQuery(() => ({
  queryKey: ["current-user"],
  async queryFn() {
    const api = getApiInstance();
    return await api.invoke<APIUser>("me");
  },
}));

const currentUserUpdateAtom = atomWithMutation((get) => ({
  mutationKey: ["update-current-user"],
  async mutationFn({ pk, user }: { pk: number; user: Partial<APIUser> }) {
    const api = getApiInstance();
    return await api.invoke<APIUser>("updateUser", { pk }, { body: user });
  },

  onSettled() {
    const queryClient = get(queryClientAtom);
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
  },
}));

export function useCurrentUserAtom() {
  const user = useAtomValue(currentUserAtom);
  const updateUser = useAtomValue(currentUserUpdateAtom);
  const queryClient = useAtomValue(queryClientAtom);
  const refetch = useCallback(() => queryClient.invalidateQueries({ queryKey: ["current-user"] }), []);
  const update = useCallback(
    (userUpdate: Partial<APIUser>) => {
      if (!user.data) {
        console.error("User is not loaded. Try fetching first.");
        return;
      }
      updateUser.mutate({ pk: user.data.id, user: userUpdate });
    },
    [user.data?.id, updateUser.mutate],
  );

  const updateAsync = useCallback(
    (userUpdate: Partial<APIUser>) => {
      if (!user.data) {
        console.error("User is not loaded. Try fetching first.");
        return;
      }
      return updateUser.mutateAsync({ pk: user.data.id, user: userUpdate });
    },
    [user.data?.id, updateUser.mutate],
  );

  const commonResponse = {
    isInProgress: user.isFetching || updateUser.isPending,
    isUpdating: updateUser.isPending,
    loaded: user.isSuccess,
    fetch: refetch,
    update,
    updateAsync,
  } as const;

  return user.isSuccess
    ? ({
        user: user.data,
        error: null,
        ...commonResponse,
      } as const)
    : ({
        user: null,
        error: user.error,
        ...commonResponse,
      } as const);
}
