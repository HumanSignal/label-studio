type AnnotationOwner = number | string | { id?: number | string | null } | null | undefined;

type AnnotationLike = {
  id?: number | string | null;
  pk?: number | string | null;
  completed_by?: AnnotationOwner;
  user?: AnnotationOwner;
  userGenerate?: boolean;
  sentUserGenerate?: boolean;
  draftId?: number | string | null;
  editable?: boolean;
  readonly?: boolean;
};

/** Shared across bundles. Data Manager and ApiProvider must see the same hold. */
export const PROJECT_ACCESS_HELD_KEY = "__labelStudioProjectAccessHeld";
const PROJECT_ACCESS_PROJECT_KEY = "__labelStudioProjectAccessProjectId";
const PROJECT_ACCESS_WATCH_KEY = "__labelStudioProjectAccessPathWatch";

export const PROJECT_ACCESS_HELD_EVENT = "label-studio:project-access-held";
const PROJECT_ACCESS_RELEASED_EVENT = "label-studio:project-access-released";

const BLOCKED_HTTP_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

type SharedWindow = Window & Record<string, unknown>;

function sharedWindow(): SharedWindow | null {
  if (typeof window === "undefined") return null;
  return window as SharedWindow;
}

function projectIdFromPathname(pathname: string | null | undefined): string | null {
  const match = /^\/projects\/([^/]+)/.exec(pathname ?? "");
  return match?.[1] ?? null;
}

function installPathnameWatch(): void {
  const target = sharedWindow();
  const browserHistory = target?.history;
  if (!target || !browserHistory || target[PROJECT_ACCESS_WATCH_KEY]) return;
  target[PROJECT_ACCESS_WATCH_KEY] = true;

  const notify = () => {
    syncProjectAccessHoldToPathname(window.location?.pathname ?? "");
  };
  const originalPush = browserHistory.pushState.bind(browserHistory);
  const originalReplace = browserHistory.replaceState.bind(browserHistory);

  browserHistory.pushState = ((...args: Parameters<History["pushState"]>) => {
    originalPush(...args);
    notify();
  }) as History["pushState"];

  browserHistory.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    originalReplace(...args);
    notify();
  }) as History["replaceState"];

  window.addEventListener("popstate", notify);
}

installPathnameWatch();

/**
 * Whether the current user may edit this annotation.
 * Managers can edit saved results. Private drafts require their owner; members
 * can also edit a new result that does not have an author yet.
 */
export function annotationEditable(
  annotation: AnnotationLike | null | undefined,
  currentUserId: number | string | null | undefined,
  canManage: boolean,
): boolean {
  const privateDraft = annotation?.userGenerate === true && annotation.sentUserGenerate === false && annotation.draftId;
  if (canManage && !privateDraft) return true;

  const completedBy = annotation?.completed_by ?? annotation?.user;
  const ownerId = completedBy && typeof completedBy === "object" ? completedBy.id : completedBy;

  if (ownerId == null || ownerId === "") {
    if (privateDraft) return false;
    // API annotations use id; editor models always have pk and an unrelated
    // transient id, even before they have been submitted.
    const savedId = annotation && "pk" in annotation ? annotation.pk : annotation?.id;
    return (
      savedId == null || savedId === "" || (annotation?.userGenerate === true && annotation.sentUserGenerate === false)
    );
  }
  return String(ownerId) === String(currentUserId);
}

/** Deletion respects ownership as well as the editor's read-only state. */
export function annotationDeletable(
  annotation: AnnotationLike | null | undefined,
  currentUserId: number | string | null | undefined,
  canManage: boolean,
): boolean {
  if (!annotation || annotation.editable === false || annotation.readonly) return false;
  return annotationEditable(annotation, currentUserId, canManage);
}

/**
 * Project 403 and 404 should stay on the open project page.
 * Other paths and 401 keep the existing navigation.
 */
export function shouldHoldProjectAccessDenied(pathname: string, status: number): boolean {
  const code = Number(status);
  if (code !== 403 && code !== 404) return false;
  return /^\/projects\/[^/]+/.test(pathname ?? "");
}

/** API path segments after `/api/` that always belong to the open project's work. */
const PROJECT_WORK_RESOURCES = new Set(["tasks", "annotations", "drafts"]);
/** `/api/dm/<name>` calls that load the open project itself. */
const DM_PROJECT_RESOURCES = new Set(["project", "tasks", "views"]);

/**
 * Whether the failed request is for the open project, one of its tasks, an
 * annotation, or a draft. Side resources (ML backends, storage, webhooks,
 * import, export) return false: a member is expected to get 403 there and
 * that must not lock annotation.
 *
 * Without a URL the request cannot be told apart, so the existing hold stays.
 */
export function isOpenProjectRequest(
  pathname: string | null | undefined,
  requestUrl: string | null | undefined,
): boolean {
  if (!requestUrl) return true;

  let requestPath: string;
  try {
    requestPath = new URL(requestUrl, "http://localhost").pathname;
  } catch {
    return true;
  }

  const apiIndex = requestPath.indexOf("/api/");
  const apiPath = apiIndex === -1 ? requestPath : requestPath.slice(apiIndex + "/api".length);
  const [head, next, after] = apiPath.split("/").filter(Boolean);

  if (PROJECT_WORK_RESOURCES.has(head)) return true;
  if (head === "dm") return DM_PROJECT_RESOURCES.has(next);
  if (head === "projects") {
    const openProjectId = projectIdFromPathname(pathname);
    if (openProjectId === null || next !== openProjectId) return false;
    return after === undefined || after === "next";
  }

  return false;
}

/**
 * Hold the open project page only when the denied request is the project's own
 * work. The page pathname alone is not enough: a 403 from a side resource
 * such as `/api/ml` must not lock a member who can still annotate.
 */
export function shouldHoldProjectRequestDenied(
  pathname: string,
  status: number,
  requestUrl: string | null | undefined,
): boolean {
  return shouldHoldProjectAccessDenied(pathname, status) && isOpenProjectRequest(pathname, requestUrl);
}

export function isProjectAccessHeld(): boolean {
  return sharedWindow()?.[PROJECT_ACCESS_HELD_KEY] === true;
}

export function holdProjectAccessDenied(): void {
  const target = sharedWindow();
  if (!target) return;
  installPathnameWatch();
  target[PROJECT_ACCESS_HELD_KEY] = true;
  target[PROJECT_ACCESS_PROJECT_KEY] = projectIdFromPathname(window.location?.pathname ?? "");
  window.dispatchEvent(new Event(PROJECT_ACCESS_HELD_EVENT));
}

export function clearProjectAccessHold(): void {
  const target = sharedWindow();
  if (!target || target[PROJECT_ACCESS_HELD_KEY] !== true) return;
  target[PROJECT_ACCESS_HELD_KEY] = false;
  target[PROJECT_ACCESS_PROJECT_KEY] = null;
  window.dispatchEvent(new Event(PROJECT_ACCESS_RELEASED_EVENT));
}

/** Drop the hold when the open project id changes. Same-project routes stay held. */
export function syncProjectAccessHoldToPathname(pathname: string): void {
  if (!isProjectAccessHeld()) return;
  const heldFor = sharedWindow()?.[PROJECT_ACCESS_PROJECT_KEY] ?? null;
  if (projectIdFromPathname(pathname) !== heldFor) clearProjectAccessHold();
}

/**
 * While the project is held, block writes. Reads still run.
 */
export function shouldBlockRequestWhileProjectAccessHeld(httpMethod: string | null | undefined): boolean {
  if (!isProjectAccessHeld()) return false;
  return BLOCKED_HTTP_METHODS.has(String(httpMethod ?? "GET").toUpperCase());
}

/** HTTP verb from an ApiConfig endpoint (`"PATCH:/projects/:pk"` or `{ path, method }`). */
export function httpMethodFromEndpoint(endpoint: unknown): string {
  const source =
    typeof endpoint === "string"
      ? endpoint
      : endpoint && typeof endpoint === "object" && "path" in endpoint
        ? String((endpoint as { path?: unknown }).path ?? "")
        : "";
  const matched = /^(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS):/i.exec(source);
  if (matched) return matched[1].toUpperCase();
  if (endpoint && typeof endpoint === "object" && "method" in endpoint && (endpoint as { method?: unknown }).method) {
    return String((endpoint as { method: unknown }).method).toUpperCase();
  }
  return "GET";
}

export function subscribeProjectAccessHeld(listener: () => void): () => void {
  const target = sharedWindow();
  if (!target) return () => {};
  installPathnameWatch();
  const onChange = () => listener();
  target.addEventListener(PROJECT_ACCESS_HELD_EVENT, onChange);
  target.addEventListener(PROJECT_ACCESS_RELEASED_EVENT, onChange);
  return () => {
    target.removeEventListener(PROJECT_ACCESS_HELD_EVENT, onChange);
    target.removeEventListener(PROJECT_ACCESS_RELEASED_EVENT, onChange);
  };
}
