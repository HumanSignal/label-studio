import { FF_NEW_STORAGES, FF_SEGMENT_ANYTHING_ML_BACKEND, FF_THEME_TOGGLE } from "./flags";

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
  const flags = window.APP_SETTINGS?.feature_flags || {};
  const defaultValue = window.APP_SETTINGS?.feature_flags_default_value === true;
  const isSentryOSS =
    window?.APP_SETTINGS?.sentry_environment === "opensource" || process.env.NODE_ENV === "development";

  if (isSentryOSS && id in FLAGS_OVERRIDE) return FLAGS_OVERRIDE[id];
  if (id in flags) return flags[id] ?? defaultValue;

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
  const override: Record<string, boolean> = FLAGS_OVERRIDE;
  if (window?.APP_SETTINGS?.sentry_environment === "opensource" && id in override) {
    return override[id];
  }
  return isFlagEnabled(
    id,
    window.APP_SETTINGS?.feature_flags || {},
    window.APP_SETTINGS?.feature_flags_default_value === true,
  );
}

/** True when the editor should render the SAM interactive UI. */
export const isSegmentAnythingEditorEnabled = () => isActive(FF_SEGMENT_ANYTHING_ML_BACKEND);

export * from "./flags";
