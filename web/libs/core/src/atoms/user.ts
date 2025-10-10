import type { APIUser } from "@humansignal/core/types/user";
import { getApiInstance } from "../lib/api-provider/api-instance";
import { atomWithMutation, atomWithQuery, queryClientAtom } from "jotai-tanstack-query";

export const currentUserAtom = atomWithQuery(() => ({
  queryKey: ["current-user"],
  async queryFn() {
    const api = getApiInstance();
    return await api.invoke<APIUser>("me");
  },
}));

export const currentUserUpdateAtom = atomWithMutation((get) => ({
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
