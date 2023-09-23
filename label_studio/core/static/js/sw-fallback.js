self.addEventListener("fetch", () => {
  // Fallback service worker that does nothing.
  // This is here to make sure if the application cannot work properly with the standard service worker
  // we can shut it down and fallback to this one and still have a working application.
});
