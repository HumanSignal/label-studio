import { FF_LSDV_4711, isFF } from "./feature-flags";

function registerServiceWorker(serviceWorkerFileName) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(serviceWorkerFileName)
      .then((registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.log("Service Worker registration failed:", error);
      });
  }
}

function awakenServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage({ type: "awaken" });
    });
  }
}

if (isFF(FF_LSDV_4711)) {
  // sw.js and sw-fallback.js are part of the label-studio/label_studio/core/static/js/ directory
  // and are copied with the rest of the static files when running `python manage.py collectstatic`
  registerServiceWorker("/sw.js");

  // Wake up the service worker when the page becomes visible
  // This is needed to ensure we are cleaning up cache when the user is using the application
  // and not only when the user is closing the tab.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      awakenServiceWorker();
    }
  });
} else {
  // Fallback service worker to disable all caching and just use the network
  registerServiceWorker("/sw-fallback.js");
}
