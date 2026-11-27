export const getProjectHotkeysSettingsPath = (projectId: string | number): string =>
  `/user/account/hotkeys?project=${encodeURIComponent(projectId)}`;

export const getProjectIdFromPathname = (pathname: string): number | null => {
  const match = pathname.match(/\/projects\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
};
