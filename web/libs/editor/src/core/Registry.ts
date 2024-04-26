/**
 * Class for register View
 */
class _Registry {
  tags: any[] = [];
  models: Record<string, any> = {};
  views: Record<string, any> = {};
  regions: any[] = [];
  objects: any[] = [];
  // list of available areas per object type
  areas = new Map();

  views_models: Record<string, any> = {};

  tools: Record<string, any> = {};

  perRegionViews: Record<string, any> = {};

  addTag(tag: string | number, model: { name: string | number }, view: any) {
    this.tags.push(tag);
    this.models[tag] = model;
    this.views[tag] = view;
    this.views_models[model.name] = view;
  }

  addRegionType(type: { detectByValue: any }, object: any, detector: any) {
    this.regions.push(type);
    if (detector) type.detectByValue = detector;
    const areas = this.areas.get(object);

    if (areas) areas.push(type);
    else this.areas.set(object, [type]);
  }

  regionTypes() {
    return this.regions;
  }

  addObjectType(type: any) {
    this.objects.push(type);
  }

  objectTypes() {
    return this.objects;
  }

  modelsArr() {
    return Object.values(this.models);
  }

  getViewByModel(modelName: string) {
    const view = this.views_models[modelName];

    if (!view) throw new Error("No view for model: " + modelName);

    return view;
  }

  getViewByTag(tag: string | number) {
    return this.views[tag];
  }

  getAvailableAreas(object: any, value: any) {
    const available = this.areas.get(object);

    if (!available) return [];
    if (value) {
      for (const model of available) {
        if (model.detectByValue && model.detectByValue(value)) return [model];
      }
    }
    return available.filter((a: { detectByValue: any }) => !a.detectByValue);
  }

  getTool(name: string) {
    const model = this.tools[name];

    if (!model) {
      const models = Object.keys(this.tools);

      throw new Error("No model registered for tool: " + name + "\nAvailable models:\n\t" + models.join("\n\t"));
    }

    return model;
  }

  /**
   * Get model
   * @param {string} tag
   * @return {import("mobx-state-tree").IModelType}
   */
  getModelByTag(tag: string) {
    const model = this.models[tag];

    if (!model) {
      const models = Object.keys(this.models);

      throw new Error("No model registered for tag: " + tag + "\nAvailable models:\n\t" + models.join("\n\t"));
    }

    return model;
  }

  addPerRegionView(tag: string | number, mode: string | number, view: any) {
    const tagViews = this.perRegionViews[tag] || {};

    tagViews[mode] = view;
    this.perRegionViews[tag] = tagViews;
  }

  getPerRegionView(tag: string | number, mode: string | number) {
    return this.perRegionViews[tag]?.[mode];
  }
}

const Registry = new _Registry();

Registry.getTool = Registry.getTool.bind(Registry);
Registry.getModelByTag = Registry.getModelByTag.bind(Registry);

export default Registry;
