const STORAGE_KEY_PREFIX = "ls:visited-projects";
const MAX_PROJECTS = 10;

function getStorageKey(userId: number): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

/**
 * Get the list of recently visited project IDs from localStorage for a specific user.
 * Returns an array of project IDs sorted by most recently visited first.
 */
export function getVisitedProjectIds(userId?: number): number[] {
  if (!userId) return [];

  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is number => typeof id === "number");
  } catch {
    return [];
  }
}

/**
 * Add a project ID to the visited projects list for a specific user.
 * If the project already exists, it moves to the front.
 * The list is capped at MAX_PROJECTS (10).
 */
export function addVisitedProject(projectId: number, userId?: number): void {
  if (!userId) return;

  try {
    const current = getVisitedProjectIds(userId);
    const filtered = current.filter((id) => id !== projectId);
    const updated = [projectId, ...filtered].slice(0, MAX_PROJECTS);

    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
