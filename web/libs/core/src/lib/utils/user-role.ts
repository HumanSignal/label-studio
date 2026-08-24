/** Organization/project role code for annotators (LSE `ROLES.ANNOTATOR`). */
export const ANNOTATOR_ROLE = "AN";

export function isAnnotatorRole(): boolean {
  return (window as { APP_SETTINGS?: { user?: { role?: string } } }).APP_SETTINGS?.user?.role === ANNOTATOR_ROLE;
}
