self.addEventListener("fetch", (event) => {
  // Fallback service worker simply fetches the network request without any caching
  // This is here to make sure if the application cannot work properly with the standard service worker
  // we can shut it down and fallback to this one and still have a working application.
  event.respondWith(fetch(event.request));
});
