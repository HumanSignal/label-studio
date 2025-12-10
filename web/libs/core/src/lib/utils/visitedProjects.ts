const STORAGE_KEY = "ls:visited-projects";
const MAX_PROJECTS = 10;

/**
 * Get the list of recently visited project IDs from localStorage.
 * Returns an array of project IDs sorted by most recently visited first.
 */
export function getVisitedProjectIds(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is number => typeof id === "number");
  } catch {
    return [];
  }
}

/**
 * Add a project ID to the visited projects list.
 * If the project already exists, it moves to the front.
 * The list is capped at MAX_PROJECTS (10).
 */
export function addVisitedProject(projectId: number): void {
  try {
    const current = getVisitedProjectIds();
    const filtered = current.filter((id) => id !== projectId);
    const updated = [projectId, ...filtered].slice(0, MAX_PROJECTS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

