import { QueryClient as QC } from "@tanstack/react-query";

/**
 * Allows for e2e testing without cache if user is from e2e domain
 */
export const shouldBypassCache = window?.APP_SETTINGS?.user?.email?.endsWith(".e2e") ?? false;

/**
 * How long to keep queries in cache before garbage collecting them
 */
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const TEST_CACHE_TIME = 500; // 500 milliseconds to ensure proper deduping in application usage under test, but not long enough to cause issues in e2e tests

export const queryClient = new QC({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      cacheTime: shouldBypassCache ? TEST_CACHE_TIME : DEFAULT_CACHE_TIME,
      // Always attempt to fetch regardless of browser's network status detection.
      // This is critical for air-gapped environments where navigator.onLine may
      // return false even though the local Label Studio server is reachable.
      networkMode: "always",
    },
  },
});
