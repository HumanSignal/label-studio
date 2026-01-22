import { atom } from "jotai";
import { getVisitedProjectIds } from "@humansignal/core";

/**
 * Atom to track when the HomePage is visited or returned to.
 * Updated from the HomePage component whenever the location changes to trigger a refresh of visited projects.
 */
export const locationKeyAtom = atom<string>("");

/**
 * Derived atom that automatically reads visited project IDs from localStorage.
 * Re-evaluates whenever locationKeyAtom changes (when navigating to/returning to HomePage).
 */
const getUserId = () => window.APP_SETTINGS?.user?.id;
export const visitedIdsAtom = atom((get) => {
  // Subscribe to location changes - this causes re-evaluation on navigation
  get(locationKeyAtom);
  return getVisitedProjectIds(getUserId());
});

export const PROJECTS_TO_SHOW = 10;

/**
 * Atom to store the raw projects data from the API.
 * This is set by the HomePage component after fetching.
 */
export const projectsDataAtom = atom<APIProject[] | null>(null);

/**
 * Derived atom that sorts projects by visited order.
 * Visited projects appear first (in visited order), followed by non-visited projects.
 */
export const sortedProjectsAtom = atom((get) => {
  const projects = get(projectsDataAtom);
  const visitedIds = get(visitedIdsAtom);

  if (!projects) return [];
  if (visitedIds.length === 0) return projects;

  const visitedSet = new Set(visitedIds);
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Get visited projects that exist in the results (in visited order)
  const visitedProjects = visitedIds.map((id) => projectMap.get(id)).filter((p): p is APIProject => p !== undefined);

  // Get non-visited projects to fill remaining slots
  const nonVisitedProjects = projects.filter((p) => !visitedSet.has(p.id));

  return [...visitedProjects, ...nonVisitedProjects].slice(0, PROJECTS_TO_SHOW);
});

export const creationDialogOpen = atom(false);
export const invitationOpen = atom(false);
