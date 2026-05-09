import { useEffect, useRef, useState, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/utils/query-client";

interface UserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  initials?: string;
  phone?: string;
}

/** Query key factory for user-detail queries. */
export const userKeys = {
  all: ["users"] as const,
  detail: (id: number) => ["users", id] as const,
};

/**
 * Fetch a single user by ID from the API.
 * Throws on failure so TanStack Query can handle retries and error state.
 */
async function fetchUserById(userId: number): Promise<UserData> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch user ${userId}`);
  return response.json();
}

/** Wrapper to prevent caching lexical scopes in React Query */
const fetchUserQueryFn = ({ queryKey }: any) => {
  const userId = queryKey[1] as number;
  return fetchUserById(userId);
};

/**
 * Checks whether a user object has meaningful display data
 * (i.e., a name, username, or email that can be shown).
 */
export function isUserComplete(user: any): boolean {
  if (!user) return false;
  // Support both camelCase (MST UserExtended) and snake_case (API response)
  return !!(user.firstName || user.lastName || user.first_name || user.last_name || user.username || user.email);
}

/**
 * Tracks whether a DOM element has entered the viewport.
 * Once the element is observed as intersecting, the hook returns `true`
 * and disconnects the observer (one-shot).
 */
function useInView(elementRef: RefObject<HTMLElement | undefined>): boolean {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, isInView]);

  return isInView;
}

interface UseResolveUserOptions {
  /** The user object to check (may be incomplete, with only an `id`). */
  user: any;
  /** Callback invoked with the fetched user data so the consumer can update their store. */
  onUserResolved: (userData: UserData) => void;
  /** A ref to a DOM element; the fetch is deferred until this element enters the viewport. */
  elementRef: RefObject<HTMLElement | undefined>;
}

/**
 * Hook to lazily resolve incomplete user data using TanStack Query.
 *
 * When a user object only has an ID (no name/email), this hook uses an
 * IntersectionObserver to detect when the target element enters the viewport,
 * then fetches the full user from `/api/users/:id` and invokes `onUserResolved`.
 *
 * Caching and request deduplication are handled by TanStack Query's built-in
 * cache, so multiple components referencing the same user only trigger one
 * API call.
 */
export function useResolveUser({ user, onUserResolved, elementRef }: UseResolveUserOptions) {
  // Keep a stable reference to the callback to avoid re-running the effect
  const onResolvedRef = useRef(onUserResolved);
  onResolvedRef.current = onUserResolved;

  // Track whether we've already notified the consumer for this user ID
  const hasResolvedRef = useRef(false);

  const isInView = useInView(elementRef);
  const userId = user?.id;
  const needsResolving = typeof userId === "number" && !isUserComplete(user);

  // Reset the resolved flag when the user ID changes
  useEffect(() => {
    hasResolvedRef.current = false;
  }, [userId]);

  const { data } = useQuery({
    queryKey: userKeys.detail(userId!),
    queryFn: fetchUserQueryFn,
    enabled: needsResolving && isInView && typeof userId === "number",
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Notify the consumer once when user data is resolved
  useEffect(() => {
    if (data && !hasResolvedRef.current) {
      hasResolvedRef.current = true;
      try {
        onResolvedRef.current(data);
      } catch {
        // Consumer callback may fail if store was destroyed
      }
    }
  }, [data]);
}

/**
 * Clear the user cache. Useful for testing or when switching contexts.
 */
export function clearUserCache() {
  queryClient.removeQueries(userKeys.all);
}
