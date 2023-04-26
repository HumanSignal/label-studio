const CACHE_NAME = "ls-cache-v1";
const CACHE_EXPIRATION_HEADER = "x-cache-expiration";
const CACHE_TIMESTAMP_HEADER = "x-cache-timestamp";
const CACHE_EXPIRATION_DEFAULT = 50 * 1000; // 50 seconds
const CACHE_CLEANUP_INTERVAL = 1 * 60 * 1000; // 1 minute

function parseCacheHeaders(cachedResponse) {
  const expirationTimestamp = parseInt(
    cachedResponse.headers.get(CACHE_EXPIRATION_HEADER)
  );
  const timestamp = parseInt(
    cachedResponse.headers.get(CACHE_TIMESTAMP_HEADER)
  );

  return {
    expirationTimestamp: isNaN(expirationTimestamp) ? 0 : expirationTimestamp,
    timestamp: isNaN(timestamp) ? 0 : timestamp,
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

function startCleanupTimer() {
  if (!self.cleanupTimer) {
    removeExpiredItems(); // Perform cleanup immediately
    self.cleanupTimer = setInterval(removeExpiredItems, CACHE_CLEANUP_INTERVAL);
  }
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

self.addEventListener("fetch", (event) => {
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
    !event.request.url.includes(requestPathToCache)
  ) {
    // For other requests, just allow the network to handle it
    return;
  }

  event.respondWith(
    // Cache first approach, look for the cached response and check if it's still valid
    caches
      .match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Check if the expiration timestamp has passed
          const { timestamp, expirationTimestamp } =
            parseCacheHeaders(cachedResponse);

          if (
            !timestamp ||
            !expirationTimestamp ||
            timestamp < expirationTimestamp
          ) {
            // If the cached item is still valid or has no expiration timestamp, serve it
            return cachedResponse;
          }
        }

        // If there's no valid cached response, fetch from the network and cache the response
        return fetch(event.request).then((response) => {
          if (response.redirected) {
            // Get the Cache-Control header value
            const cacheControl = response.headers.get("Cache-Control");

            // Extract the max-age value from the Cache-Control header
            const maxAgeMatch =
              cacheControl && cacheControl.match(/max-age=(\d+)/);

            let maxAge = CACHE_EXPIRATION_DEFAULT;

            if (maxAgeMatch) {
              const _age = parseInt(maxAgeMatch[1]);
              if (!isNaN(_age)) {
                maxAge = _age * 1000;
              }
            }

            // Calculate the expiration timestamp based on the max-age value
            const expirationTimestamp = Date.now() + maxAge;

            // Create a new Response object with the custom header
            const headers = new Headers(response.headers);
            headers.append(CACHE_EXPIRATION_HEADER, expirationTimestamp);
            headers.append(CACHE_TIMESTAMP_HEADER, Date.now());

            const cachedResponse = new Response(response.clone().body, {
              status: response.status,
              statusText: response.statusText,
              headers: headers,
            });

            // Store the new Response object in the cache
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cachedResponse);
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
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "awaken") {
    startCleanupTimer();
  }
});

startCleanupTimer();
