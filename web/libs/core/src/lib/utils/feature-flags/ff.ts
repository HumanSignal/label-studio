import { FF_NEW_STORAGES, FF_THEME_TOGGLE } from "./flags";

const FEATURE_FLAGS = window.APP_SETTINGS?.feature_flags || {};

// TODO: remove the override + if statement once LSE and LSO start building
// react the same way and `fflag_fix_front_lsdv_4620_memory_leaks_100723_short` is removed
const FLAGS_OVERRIDE: Record<string, boolean> = {
  // While it's safe to have overrides living here forever,
  // they could disrupt others' work if left. Keep it clean
  // and remove overrides before merging.
  //
  // Add your flags overrides as following:
  // [FF_FLAG_NAME]: boolean
  [FF_NEW_STORAGES]: true,
  [FF_THEME_TOGGLE]: true,
};

/**
 * Checks if the Feature Flag is active or not.
 */
export const isActive = (id: string) => {
  const defaultValue = window.APP_SETTINGS?.feature_flags_default_value === true;
  const isSentryOSS =
    window?.APP_SETTINGS?.sentry_environment === "opensource" || process.env.NODE_ENV === "development";

  if (isSentryOSS && id in FLAGS_OVERRIDE) return FLAGS_OVERRIDE[id];
  if (id in FEATURE_FLAGS) return FEATURE_FLAGS[id] ?? defaultValue;

  return defaultValue;
};

/**
 * @deprecated
 */
export const isFlagEnabled = (id: string, flagList: Record<string, boolean>, defaultValue = false) => {
  if (id in flagList) {
    return flagList[id] ?? defaultValue;
  }
  return defaultValue;
};

/**
 * Checks if the Feature Flag is active or not.
 *
 * @deprecated Use `isActive` instead
 */
export function isFF(id: string) {
  // TODO: remove the override + if statement once LSE and LSO start building react the same way and fflag_fix_front_lsdv_4620_memory_leaks_100723_short is removed
  const override: Record<string, boolean> = FLAGS_OVERRIDE;
  if (window?.APP_SETTINGS?.sentry_environment === "opensource" && id in override) {
    return override[id];
  }
  return isFlagEnabled(id, FEATURE_FLAGS, window.APP_SETTINGS?.feature_flags_default_value === true);
}

export * from "./flags";
