import { types } from "mobx-state-tree";
import { CustomJSON, StringOrNumberID } from "./types";

const registry = new Map();

export const registerModel = (name, model) => {
  registry.set(name, model);
};

export const DynamicModel = (name, columns, properties) => {
  const modelProperties = {};

  const typeWrapper = (type) => types.optional(types.maybeNull(type), null);

  columns?.forEach((col) => {
    if (col.parent || col.id === "id") return;

    let propertyType;

    switch (col.type) {
      case "Number":
        propertyType = typeWrapper(types.number);
        break;
      case "Boolean":
        propertyType = typeWrapper(types.boolean);
        break;
      case "List":
        propertyType = typeWrapper(CustomJSON);
        break;
      default:
        propertyType = typeWrapper(types.union(types.string, types.number));
        break;
    }
    modelProperties[col.id] = propertyType;
  });

  Object.assign(modelProperties, {
    id: StringOrNumberID,
    ...(properties ?? {}),
  });

  const model = types.model(name, modelProperties);

  registerModel(name, types.model(name, modelProperties));

  return model;
};

DynamicModel.get = (name) => {
  return registry.get(name);
};
