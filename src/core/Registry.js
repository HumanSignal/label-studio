/**
 * Class for register View
 */
class _Registry {
  constructor() {
    this.tags = [];
    this.models = {};
    this.views = {};

    this.views_models = {};

    this.tools = {};
  }

  addTag(tag, model, view) {
    this.tags.push(tag);
    this.models[tag] = model;
    this.views[tag] = view;
    this.views_models[model.name] = view;
  }

  modelsArr() {
    return Object.values(this.models);
  }

  getViewByModel(modelName) {
    const view = this.views_models[modelName];

    if (!view) throw new Error("No view for model: " + modelName);

    return view;
  }

  getViewByTag(tag) {
    return this.views[tag];
  }

  getTool(name) {
    const model = this.tools[name];
    if (!model) {
      const models = Object.keys(this.tools);
      throw new Error("No model registered for tool: " + name + "\nAvailable models:\n\t" + models.join("\n\t"));
    }

    return model;
  }

  addTool(name, model) {
    this.tools[name] = model;
  }

  /**
   * Get model
   * @param {*} tag
   */
  getModelByTag(tag) {
    const model = this.models[tag];

    if (!model) {
      const models = Object.keys(this.models);
      throw new Error("No model registered for tag: " + tag + "\nAvailable models:\n\t" + models.join("\n\t"));
    }

    return model;
  }
}

const Registry = new _Registry();

Registry.getTool = Registry.getTool.bind(Registry);
Registry.getModelByTag = Registry.getModelByTag.bind(Registry);

export default Registry;
