type LogEventFn = (eventName: string, metadata?: Record<string, unknown>) => void;
declare global {
  interface Window {
    __lsa: LogEventFn;
  }
  const __lsa: LogEventFn;
}

const logEvent: LogEventFn = (eventName, metadata = {}) => {
  // Don't send if collect_analytics is falsey
  if (!(window as any).APP_SETTINGS?.collect_analytics) return;

  const payload = {
    ...metadata,
    event: eventName,
    url: window.location.href,
  };

  // Use requestIdleCallback to send the event after the main thread is free
  // Fallback to setTimeout for Safari which doesn't support requestIdleCallback
  const scheduleCallback = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
  scheduleCallback(() => {
    const params = new URLSearchParams({ __: JSON.stringify(payload) });
    const url = `/__lsa/?${params}`;
    // Use sendBeacon if available for better reliability during page unload
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        // Fallback handling
        const img = new Image();
        img.src = url;
      }
    } catch {
      // Ignore errors here
    }
  });
};

export const registerAnalytics = () => {
  window.__lsa = logEvent;
};

// Usage examples:
// __lsa("data_import.view");
// __lsa("template.select", { template_type: "object_detection", template_id: "od_1" });
// __lsa("doc.click", { href: "https://labelstud.io/docs/guide/setup" });
