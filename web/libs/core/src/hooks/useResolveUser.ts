import { useEffect, useRef, type RefObject } from "react";

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

/**
 * Module-level cache for user fetch results.
 * Maps userId -> full user data object.
 * Shared across all consumers so repeated user IDs
 * only trigger a single API call.
 */
const userCache = new Map<number, UserData>();

/**
 * Module-level map of in-flight fetch promises.
 * Prevents duplicate concurrent requests for the same user ID.
 */
const pendingFetches = new Map<number, Promise<UserData | null>>();

/**
 * Tracks user IDs that have already been resolved (fetched and enriched),
 * so we don't set up observers or fetch again on re-renders.
 */
const resolvedUserIds = new Set<number>();

/**
 * Fetch a single user by ID from the API, with deduplication.
 * Returns the user data or null on failure.
 */
async function fetchUserById(userId: number): Promise<UserData | null> {
  // Return cached result if available
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  // Deduplicate in-flight requests
  if (pendingFetches.has(userId)) {
    return pendingFetches.get(userId)!;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) return null;
      const data: UserData = await response.json();
      userCache.set(userId, data);
      return data;
    } catch {
      return null;
    } finally {
      pendingFetches.delete(userId);
    }
  })();

  pendingFetches.set(userId, fetchPromise);
  return fetchPromise;
}

/**
 * Checks whether a user object has meaningful display data
 * (i.e., a name, username, or email that can be shown).
 */
export function isUserComplete(user: any): boolean {
  if (!user) return false;
  // Support both camelCase (MST UserExtended) and snake_case (API response)
  return !!(
    user.firstName ||
    user.lastName ||
    user.first_name ||
    user.last_name ||
    user.username ||
    user.email
  );
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
 * Hook to lazily resolve incomplete user data.
 *
 * When a user object only has an ID (no name/email), this hook uses an
 * IntersectionObserver to detect when the target element enters the viewport,
 * then fetches the full user from `/api/users/:id` and invokes `onUserResolved`.
 *
 * Results are cached at the module level so that if multiple components
 * reference the same user, only one API call is made.
 */
export function useResolveUser({ user, onUserResolved, elementRef }: UseResolveUserOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Keep a stable reference to the callback to avoid re-running the effect
  const onResolvedRef = useRef(onUserResolved);
  onResolvedRef.current = onUserResolved;

  useEffect(() => {
    const userId = user?.id;

    // Nothing to resolve if there's no numeric user ID
    if (!userId || typeof userId !== "number") return;

    // Skip if already resolved globally
    if (resolvedUserIds.has(userId)) return;

    // If user already has complete data, mark as resolved
    if (isUserComplete(user)) {
      resolvedUserIds.add(userId);
      return;
    }

    // Check if the cache already has this user (e.g. fetched by another component)
    const cached = userCache.get(userId);
    if (cached) {
      try {
        onResolvedRef.current(cached);
      } catch {
        // Consumer callback may fail if store is not ready
      }
      resolvedUserIds.add(userId);
      return;
    }

    // Set up IntersectionObserver to fetch when element comes into view
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          // Stop observing once triggered
          observerRef.current?.disconnect();
          observerRef.current = null;

          // Fetch the user data
          fetchUserById(userId).then((userData) => {
            if (userData) {
              try {
                onResolvedRef.current(userData);
              } catch {
                // Consumer callback may fail if store was destroyed
              }
            }
            resolvedUserIds.add(userId);
          });
        }
      },
      { threshold: 0 },
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [user, elementRef]);
}

/**
 * Clear the user cache. Useful for testing or when switching contexts.
 */
export function clearUserCache() {
  userCache.clear();
  pendingFetches.clear();
  resolvedUserIds.clear();
}
