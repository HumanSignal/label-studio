/**
 * AuthProvider and useAuth Hook
 *
 * This module provides authentication context and user management for Label Studio.
 * The useAuth hook consolidates functionality previously split between useAuth and useCurrentUser,
 * providing a unified interface for:
 * - Current user data access
 * - User profile updates (asynchronous)
 * - Loading states
 * - Permission checking
 *
 * Interface:
 * - user: Current user data or null
 * - isLoading: True when fetching or updating user
 * - refetch: Refetch current user data
 * - update: Update user profile (returns promise)
 * - permissions: Permission checking helpers (can, canAny, canAll)
 */
import { createContext, memo, useCallback, useContext, useMemo } from "react";
import type { APIUser } from "../types/user";
import { useAtomValue } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { currentUserAtom, currentUserUpdateAtom } from "../atoms/user";

export enum ABILITY {
  can_create_tokens = "users.token.any",
}

export type Ability = ABILITY;

export type AuthPermissions = {
  can: (a: string) => boolean;
  canAny: (as: string[]) => boolean;
  canAll: (as: string[]) => boolean;
};

type AuthState = {
  user: APIUser | null;
  isLoading: boolean;
  refetch: () => void;
  update: (userUpdate: Partial<APIUser>) => Promise<APIUser> | undefined;
  permissions: AuthPermissions;
};

const AuthContext = createContext<AuthState | null>(null);

const makePermissionChecker = (list?: (Ability | string)[]) => {
  const abilities = new Set<string>((list as string[]) ?? []);
  const has = (a: string) => {
    if (abilities.size === 0) return false;
    if (abilities.has(`-${a}`)) return false;
    if (abilities.has("*")) return true;
    return abilities.has(a);
  };
  return {
    can: (a: string) => has(a),
    canAny: (arr: string[]) => arr.some((a) => !abilities.has(`-${a}`) && (abilities.has("*") || abilities.has(a))),
    canAll: (arr: string[]) => arr.every((a) => !abilities.has(`-${a}`) && (abilities.has("*") || abilities.has(a))),
  };
};

export const AuthProvider = memo<{ children: React.ReactNode }>(({ children }) => {
  // User query and mutation
  const userQuery = useAtomValue(currentUserAtom);
  const updateUserMutation = useAtomValue(currentUserUpdateAtom);
  const queryClient = useAtomValue(queryClientAtom);

  // User functions
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
  }, [queryClient]);

  const update = useCallback(
    (userUpdate: Partial<APIUser>) => {
      if (!userQuery.data) {
        console.error("User is not loaded. Try fetching first.");
        return;
      }
      return updateUserMutation.mutateAsync({ pk: userQuery.data.id, user: userUpdate });
    },
    [userQuery.data, updateUserMutation],
  );

  // Permissions
  const checker = useMemo(() => makePermissionChecker(userQuery.data?.permissions), [userQuery.data?.permissions]);
  const permissionHelpers = useMemo<AuthPermissions>(() => {
    return {
      can: (a: string) => checker.can(String(a)),
      canAny: (abilities: string[]) => checker.canAny(abilities.map((a) => String(a))),
      canAll: (abilities: string[]) => checker.canAll(abilities.map((a) => String(a))),
    };
  }, [checker]);

  const contextValue: AuthState = useMemo(() => {
    return {
      user: userQuery.isSuccess ? userQuery.data : null,
      isLoading: userQuery.isFetching || updateUserMutation.isPending,
      refetch,
      update,
      permissions: permissionHelpers,
    };
  }, [
    userQuery.isSuccess,
    userQuery.data,
    userQuery.isFetching,
    updateUserMutation.isPending,
    refetch,
    update,
    permissionHelpers,
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
});

export const useAuth = () => {
  const ctx = useContext(AuthContext)!;

  return {
    user: ctx.user,
    isLoading: ctx.isLoading,
    refetch: ctx.refetch,
    update: ctx.update,
    permissions: ctx.permissions,
  };
};
