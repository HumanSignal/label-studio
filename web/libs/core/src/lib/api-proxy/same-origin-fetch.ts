/**
 * `sameOriginFetch` wraps the global `fetch` and adds the `X-Requested-With: XMLHttpRequest`
 * header to any "unsafe" request (POST/PUT/PATCH/DELETE) whose target URL resolves to the
 * same origin as the current page.
 *
 * This module is the single definition of that header: `APIProxy.getDefaultHeaders`
 * (services/lso/web/libs/core/src/lib/api-proxy/index.ts) and the Data Manager proxy
 * (services/lso/web/libs/datamanager/src/utils/api-proxy/index.js) import `REQUESTED_WITH_HEADER` /
 * `REQUESTED_WITH_VALUE` from here, so raw `fetch` call sites outside those proxies carry the same signal.
 *
 * It must NEVER add the header to a cross-origin request (presigned cloud-storage uploads, third-party
 * APIs, etc.) — doing so could trigger an unwanted CORS preflight or leak an internal header to a
 * third party. Cross-origin requests, and safe methods (GET/HEAD/OPTIONS), are passed straight through
 * to the global `fetch` unmodified.
 */

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * The single source of truth for the CSRF-style marker header (FIT-2967 / FIT-2968).
 *
 * Every same-origin unsafe request the frontend makes — through `sameOriginFetch`, the core
 * `APIProxy`, or the Data Manager `APIProxy` — carries `REQUESTED_WITH_HEADER: REQUESTED_WITH_VALUE`.
 * Server-side enforcement (FIT-2968) must import/mirror these exact values; do not redefine them
 * anywhere else in the frontend.
 */
export const REQUESTED_WITH_HEADER = "X-Requested-With";
export const REQUESTED_WITH_VALUE = "XMLHttpRequest";

/** Ready-to-spread header object: `{ "X-Requested-With": "XMLHttpRequest" }`. */
export const REQUESTED_WITH_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  [REQUESTED_WITH_HEADER]: REQUESTED_WITH_VALUE,
});

/** True for the HTTP methods that must carry the marker header (POST/PUT/PATCH/DELETE). */
export function isUnsafeMethod(method: string | undefined | null): boolean {
  return UNSAFE_METHODS.has((method ?? "GET").toUpperCase());
}

/**
 * Resolves `input` (a fetch `RequestInfo | URL`) to a URL string, using `window.location.href`
 * as the base for relative paths, the same way the browser's `fetch` would.
 */
function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  // Request object
  return input.url;
}

/**
 * True when `url` (absolute or relative) resolves to the current page's origin. Cross-origin
 * targets (presigned S3/GCS/Azure uploads, external ML backends, Stripe, Hubspot, ...) must never
 * receive the marker header — it would force a CORS preflight and can fail the write.
 */
export function isSameOrigin(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.href);

    return resolved.origin === window.location.origin;
  } catch (_e) {
    // Relative/unparsable URLs (e.g. no `window` in a non-browser context) are treated
    // conservatively as same-origin so the header is still sent for normal app paths.
    return true;
  }
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");

  return (method || "GET").toUpperCase();
}

/**
 * Adds the header onto whatever shape of headers the caller already passed, instead of always
 * normalizing to a `Headers` instance. A lot of call sites (and their tests) pass — and assert
 * against — a plain header object; preserving that shape keeps `sameOriginFetch` a true drop-in
 * replacement for `fetch` rather than a wrapper that silently changes what a spy on `fetch` sees.
 */
function withRequestedWithHeader(existingHeaders: HeadersInit | undefined): HeadersInit {
  if (existingHeaders instanceof Headers) {
    const headers = new Headers(existingHeaders);

    headers.set(REQUESTED_WITH_HEADER, REQUESTED_WITH_VALUE);
    return headers;
  }

  if (Array.isArray(existingHeaders)) {
    const headers = new Headers(existingHeaders);

    headers.set(REQUESTED_WITH_HEADER, REQUESTED_WITH_VALUE);
    return headers;
  }

  // Plain object (or undefined) — keep it a plain object.
  return { ...(existingHeaders ?? {}), [REQUESTED_WITH_HEADER]: REQUESTED_WITH_VALUE };
}

/**
 * Drop-in replacement for `fetch` that adds `X-Requested-With: XMLHttpRequest` to unsafe
 * (POST/PUT/PATCH/DELETE) requests targeting the current origin. GET/HEAD/OPTIONS requests and
 * any request targeting a different origin are forwarded to `fetch` unchanged.
 */
export function sameOriginFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = resolveUrl(input);
  const method = resolveMethod(input, init);

  if (!isUnsafeMethod(method) || !isSameOrigin(url)) {
    return fetch(input, init);
  }

  const existingHeaders = init?.headers ?? (input instanceof Request ? input.headers : undefined);

  return fetch(input, {
    ...init,
    headers: withRequestedWithHeader(existingHeaders),
  });
}
