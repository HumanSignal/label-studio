type AnnotationOwner = number | string | { id?: number | string | null } | null | undefined;

type AnnotationLike = {
  completed_by?: AnnotationOwner;
};

let projectAccessHeld = false;
const holdListeners = new Set<() => void>();

/**
 * Whether the current user may edit this annotation.
 * Managers can edit any result. Members can edit their own, including a new
 * result that does not have an author yet.
 */
export function annotationEditable(
  annotation: AnnotationLike | null | undefined,
  currentUserId: number | string | null | undefined,
  canManage: boolean,
): boolean {
  if (canManage) return true;

  const completedBy = annotation?.completed_by;
  const ownerId = completedBy && typeof completedBy === "object" ? completedBy.id : completedBy;

  if (ownerId == null || ownerId === "") return true;
  return String(ownerId) === String(currentUserId);
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

export function isProjectAccessHeld(): boolean {
  return projectAccessHeld;
}

export function holdProjectAccessDenied(): void {
  projectAccessHeld = true;
  for (const listener of holdListeners) listener();
}

export function subscribeProjectAccessHeld(listener: () => void): () => void {
  holdListeners.add(listener);
  return () => {
    holdListeners.delete(listener);
  };
}
