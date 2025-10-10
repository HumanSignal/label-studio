import type { APIUser } from "@humansignal/core/types/user";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { atomWithMutation, atomWithQuery, queryClientAtom } from "jotai-tanstack-query";

export const currentUserAtom = atomWithQuery(() => ({
  queryKey: ["current-user"],
  async queryFn() {
    // @ts-expect-error - API.invoke typing issue with method names
    return await API.invoke<APIUser>("me");
  },
}));

export const currentUserUpdateAtom = atomWithMutation((get) => ({
  mutationKey: ["update-current-user"],
  async mutationFn({ pk, user }: { pk: number; user: Partial<APIUser> }) {
    // @ts-expect-error - API.invoke typing issue with method names
    return await API.invoke<APIUser>("updateUser", { pk }, { body: user });
  },

  onSettled() {
    const queryClient = get(queryClientAtom);
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
  },
}));
