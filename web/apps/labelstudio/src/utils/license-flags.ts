import { isFlagEnabled } from "./helpers";

/**
 * Control Visibility and Access of Cloud Storage Connectors for Managers
 */
export const LF_CLOUD_STORAGE_FOR_MANAGERS = "hide_storage_settings_for_manager";

export function isInLicense(id: string) {
  return isFlagEnabled(id, window.APP_SETTINGS?.flags || {});
}
