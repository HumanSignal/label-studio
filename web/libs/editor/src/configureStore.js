import AppStore from "./stores/AppStore";

// Get environment settings.
// Use development env when: running in dev, or when the production build is used for integration tests (Cypress sets window.__LSF_INTEGRATION_TEST__).
const getEnvironment = async () => {
  /* istanbul ignore next */
  const useDevelopment =
    (process.env.NODE_ENV === "development" && !process.env.BUILD_NO_SERVER) ||
    (typeof window !== "undefined" && window.__LSF_INTEGRATION_TEST__);
  if (useDevelopment) {
    return (await import("./env/development")).default;
  }

  return (await import("./env/production")).default;
};

// Configure default store
export const configureStore = async (params, events) => {
  if (params.options?.secureMode) window.LS_SECURE_MODE = true;

  const env = await getEnvironment();

  params = { ...params };

  // Support forceBottomPanel option
  if (params?.settings?.forceBottomPanel) {
    params.bottomSidePanel = true;
    params.settings = { ...(params.settings || {}), forceBottomPanel: true };
  }

  if (!params?.config && env.getExample) {
    const { task, config } = await env.getExample();

    params.config = config;
    params.task = task;
  } else if (params?.task) {
    params.task = env.getData(params.task);
  }
  if (params.task?.id) {
    params.taskHistory = [{ taskId: params.task.id, annotationId: null }];
  }

  const store = AppStore.create(params, {
    ...env.configureApplication(params),
    events,
  });

  store.initializeStore({
    ...(params.task ?? {}),
    // allow external integrations to control when the app is fully hydrated
    // default behaviour is to consider this point as hydrated
    hydrated: params?.hydrated ?? true,
    users: params.users ?? [],
    annotationHistory: params.history ?? [],
  });

  return { store, getRoot: env.rootElement };
};
