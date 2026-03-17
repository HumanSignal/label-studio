/**
 * Stub for environments that load this file without Vite (e.g. Node in tests).
 * Production and Vite-resolved imports use core/Registry.ts.
 */
/**
 * All methods are arrow functions so they keep `this` binding when passed
 * by reference (e.g. `_oneOf(Registry.getModelByTag, ...)` in Types.js).
 */
class RegistryStub {
  customTags = [];
  tags = [];
  models = {};
  views = {};
  views_models = {};
  regions = [];
  objects = [];
  tools = {};
  perRegionViews = {};
  areas = new Map();

  addTag = (tag, model, view) => {
    this.tags.push(tag);
    this.models[tag] = model;
    this.views[tag] = view;
    if (model && model.name) this.views_models[model.name] = view;
  };
  addRegionType = (type, object, detector) => {
    this.regions.push(type);
    if (detector) type.detectByValue = detector;
    const existing = this.areas.get(object);
    if (existing) existing.push(type);
    else this.areas.set(object, [type]);
  };
  regionTypes = () => this.regions;
  addObjectType = (m) => { this.objects.push(m); };
  objectTypes = () => this.objects;
  modelsArr = () => Object.values(this.models);
  getViewByModel = (name) => this.views_models[name] || null;
  getViewByTag = (tag) => this.views[tag] || null;
  getAvailableAreas = (object, value) => {
    const available = this.areas.get(object);
    if (!available) return [];
    if (value) {
      for (const model of available) {
        if (model.detectByValue && model.detectByValue(value)) return [model];
      }
    }
    return available.filter((a) => !a.detectByValue);
  };
  getTool = (name) => this.tools[name] || null;
  getModelByTag = (tag) => this.models[tag] || null;
  addPerRegionView = (tag, model) => { this.perRegionViews[tag] = model; };
  getPerRegionView = (tag) => this.perRegionViews[tag] || null;
  addCustomTag = (def) => {
    if (def && def.model) this.addTag(def.tag?.toLowerCase?.() || "", def.model, def.view);
    this.customTags.push(def);
  };
}

export default new RegistryStub();
