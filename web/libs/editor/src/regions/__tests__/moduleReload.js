export const createBunReloadStamp = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const importModuleWithBunReload = (modulePath, stamp = createBunReloadStamp()) => {
  return import(`${modulePath}?bun_reload=${stamp}`);
};

export const importModulesWithBunReload = async (modulePaths) => {
  const stamp = createBunReloadStamp();
  return Promise.all(modulePaths.map((modulePath) => importModuleWithBunReload(modulePath, stamp)));
};
