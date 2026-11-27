/** Organization/project role code for annotators (LSE `ROLES.ANNOTATOR`). */
export const ANNOTATOR_ROLE = "AN";

/** Organization role code for View-Only members (LSE `ROLES.VIEW_ONLY`). */
export const VIEW_ONLY_ROLE = "VO";

/** User type code for View-Only seats (LSE `USER_TYPES.VIEW_ONLY`). */
export const VIEW_ONLY_USER_TYPE = "viewonly";

export function isAnnotatorRole(): boolean {
  return (window as { APP_SETTINGS?: { user?: { role?: string } } }).APP_SETTINGS?.user?.role === ANNOTATOR_ROLE;
}

export function isViewOnlyUser(
  user?: {
    organization_membership?: { role?: string; user_type?: string | null } | null;
    user_type?: string | null;
    role?: string | null;
  } | null,
): boolean {
  if (user?.organization_membership?.role === VIEW_ONLY_ROLE) return true;
  if (user?.organization_membership?.user_type === VIEW_ONLY_USER_TYPE) return true;
  if (user?.user_type === VIEW_ONLY_USER_TYPE) return true;
  if (user?.role === VIEW_ONLY_ROLE) return true;
  return (window as { APP_SETTINGS?: { user?: { role?: string } } }).APP_SETTINGS?.user?.role === VIEW_ONLY_ROLE;
}
