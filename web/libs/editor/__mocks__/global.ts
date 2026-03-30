/* istanbul ignore file */
export const mockFF = () => {
  const originalAppSettings = window.APP_SETTINGS ?? {};
  // Snapshot original flags so reset() can restore a clean copy
  const originalFFSnapshot = { ...(originalAppSettings.feature_flags || {}) };

  const setup = () => {
    global.window.APP_SETTINGS = {
      ...originalAppSettings,
      feature_flags: { ...originalFFSnapshot },
    };
  };

  const reset = () => {
    // Always reset to clean slate — ignore snapshot which may contain
    // pollution from earlier test files in Bun's shared process
    global.window.APP_SETTINGS = {
      ...originalAppSettings,
      feature_flags: {},
    };
  };

  const set = (kv: { [key: string]: boolean }) => {
    if (!global.window.APP_SETTINGS) global.window.APP_SETTINGS = {};
    if (!global.window.APP_SETTINGS.feature_flags) global.window.APP_SETTINGS.feature_flags = {};
    Object.entries(kv).forEach(([key, value]) => {
      global.window.APP_SETTINGS.feature_flags[key] = value;
    });
  };

  return { setup, set, reset };
};
