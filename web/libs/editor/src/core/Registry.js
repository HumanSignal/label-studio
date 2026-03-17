/**
 * Stub for environments that load this file without Vite (e.g. Node in tests).
 * Production and Vite-resolved imports use core/Registry.ts.
 */
class RegistryStub {
  addTag() {}
  addRegionType() {}
  regionTypes() {
    return [];
  }
  addObjectType() {}
  objectTypes() {
    return [];
  }
  modelsArr() {
    return [];
  }
  getViewByModel() {
    return null;
  }
  getViewByTag() {
    return null;
  }
  getAvailableAreas() {
    return [];
  }
  getTool() {
    return null;
  }
  getModelByTag() {
    return null;
  }
  addPerRegionView() {}
  getPerRegionView() {
    return null;
  }
  addCustomTag() {}
}

export default new RegistryStub();
