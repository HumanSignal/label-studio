export const mockFF = () => {
  const { APP_SETTINGS = {} } = window;
  const originalAppSettings = APP_SETTINGS;
  const originalFF = originalAppSettings.feature_flags || {};
  
  const windowMock = {
    APP_SETTINGS: {
      ...APP_SETTINGS,
      feature_flags: {
        ...originalFF,
      },
    },
  };
  
  const setup = () => {
    // Set up the window mock before running tests
    global.window.APP_SETTINGS = windowMock.APP_SETTINGS;
  };
  
  const reset = () => {
    // Reset the window mock after running tests
    global.window.APP_SETTINGS = originalAppSettings;
  };
  
  const set = (kv: { [key: string]: boolean }) => {
    // Set a feature flag
    Object.entries(kv).forEach(([key, value]) => {
      global.window.APP_SETTINGS.feature_flags[key] = value;
    });
  };
    
  return {
    setup,
    set,
    reset,
  };
};
