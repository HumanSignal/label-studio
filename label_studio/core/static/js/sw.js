const CACHE_NAME = "ls-cache-v1";
const CACHE_EXPIRATION_HEADER = "x-cache-expiration";
const CACHE_EXPIRATION_DEFAULT = 50 * 1000; // 50 seconds
const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

function parseCacheHeaders(cachedResponse) {
  const expirationTimestamp = parseInt(
    cachedResponse.headers.get(CACHE_EXPIRATION_HEADER)
  );

  return {
    expirationTimestamp: isNaN(expirationTimestamp) ? 0 : expirationTimestamp,
  };
}

function removeExpiredItems() {
  caches.open(CACHE_NAME).then((cache) => {
    cache.keys().then((requests) => {
      requests.forEach((request) => {
        cache.match(request).then((response) => {
          const { expirationTimestamp } = parseCacheHeaders(response);
          if (expirationTimestamp && Date.now() > expirationTimestamp) {
            cache.delete(request);
          }
        });
      });
    });
  });
}

// Cleanup expired items every hour in case the user never refreshes the page
// This is to avoid the cache growing indefinitely, though the data is not large it is just a precaution
function startCleanupTimer() {
  if (!self.cleanupTimer) {
    removeExpiredItems(); // Perform cleanup immediately
    self.cleanupTimer = setInterval(removeExpiredItems, CACHE_CLEANUP_INTERVAL);
  }
}

async function handlePresignedUrl(event) {
  // For now just catch presign requests and cache them
  // to void constantly requesting the same presign URL
  // even when it is not expired.
  // This is so the server can just naively proxy the presign request
  // and the performance is not degraded.
  const requestPathToCache = "/presign/";

  // Check if the request URL doesn't match the specified path part
  // or if it is not a request to the same origin we will just fetch it
  if (
    !event.request.url.startsWith(self.location.origin) ||
    !event.request.url.includes(requestPathToCache) ||
    // This is to avoid an error trying to load a direct presign URL in a new tab
    !event.request.referrer ||
    // Easier to leave this uncached as if we were to handle this caching
    // it would be more complex and not really worth the effort as it is not the most repeated
    // request and it is not a big deal if it is not cached.
    // If this was to be cached it forces a full resource request instead of a chunked ranged one.
    event.request.headers.get("range")
  ) {
    // For other requests, just allow the network to handle it
    return false;
  }

  event.respondWith(
    // Cache first approach, look for the cached response and check if it's still valid
    caches
      .match(event.request)
      .then(async (cachedResponse) => {
        if (cachedResponse) {
          // Check if the expiration timestamp has passed
          const { expirationTimestamp } = parseCacheHeaders(cachedResponse);

          const valid =
            !expirationTimestamp || expirationTimestamp > Date.now();
          const url = cachedResponse.headers.get("Location");

          if (valid && url) {
            // If the cached response is a redirect, fetch the redirect URL
            return fetch(url);
          }
        }

        // If there's no valid cached response, fetch redirect from the network and cache the response
        // fetch the actual request to return to the user immediately
        return fetch(event.request.url).then((response) => {
          if (response.redirected) {
            // Get the Cache-Control header value if provided
            const cacheControl = response.headers.get("Cache-Control");
            // This will be the target URL if the response is a redirect
            const url = response.url;

            // Extract the max-age value from the Cache-Control header
            // If there's no max-age, use the default value
            const maxAgeMatch =
              cacheControl && cacheControl.match(/max-age=(\d+)/);

            let maxAge = CACHE_EXPIRATION_DEFAULT;

            if (maxAgeMatch) {
              const _age = parseInt(maxAgeMatch[1]);
              if (!isNaN(_age)) {
                maxAge = (_age - 10) * 1000; // Leave 10s of margin so there is no possible overlap
              }
            }

            // Calculate the expiration timestamp based on the max-age value
            const expirationTimestamp = Date.now() + maxAge;

            const headers = new Headers(response.headers);
            headers.append("Location", url);
            headers.append(CACHE_EXPIRATION_HEADER, expirationTimestamp);

            // Create a redirect response with the expiration timestamp header
            const cachedResponse = new Response(null, {
              status: 303,
              statusText: "See Other",
              headers: headers,
            });

            // Store the new Response object in the cache
            caches.open(CACHE_NAME).then(async (cache) => {
              try {
                await cache.put(event.request, cachedResponse);
              } catch (error) {
                if (error.name !== "QuotaExceededError") {
                  // Ignore QuotaExceededError errors, they are expected
                  console.error("Cache put failed:", error);
                }
              }
            });
          }

          return response;
        });
      })
      .catch((error) => {
        console.error("Fetch failed:", error);
        throw error;
      })
  );

  // response was handled by the serviceworker.
  // this is for later so we can create a middleware style pipeline to attempt to match and handle
  // the request in order of priority
  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log("Opened cache:", CACHE_NAME);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", async (event) => {
  await handlePresignedUrl(event);
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "awaken") {
    startCleanupTimer();
  }
});

startCleanupTimer();
