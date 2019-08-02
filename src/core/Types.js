import { types, getType, getParent } from "mobx-state-tree";
import Registry from "./Registry";

function unionArray(arr) {
  return types.maybeNull(types.array(oneOf(arr)));
}

function oneOf(arr) {
  return types.union({
    dispatcher: sn => {
      if (arr.find(val => sn.type === val)) {
        return Registry.getModelByTag(sn.type);
      } else {
        throw Error("Not expecting tag: " + sn.type);
      }
    },
  });
}

function allModelsTypes() {
  const args = [
    {
      dispatcher: sn => {
        if (Registry.tags.find(val => sn.type === val)) {
          return Registry.getModelByTag(sn.type);
        } else {
          throw Error("Not expecting tag: " + sn.type);
        }
      },
    },
    Registry.modelsArr(),
  ];

  const results = [].concat.apply([], args);

  return types.union.apply(null, results);
}

function isType(node, types) {
  const nt = getType(node);
  for (let t of types) if (nt === t) return true;

  return false;
}

function getParentOfTypeString(node, str) {
  // same as getParentOfType but checks models .name instead of type
  let parent = getParent(node);

  if (!Array.isArray(str)) str = [str];

  while (parent) {
    const name = getType(parent).name;

    if (str.find(c => c === name)) return parent;

    parent = getParent(parent);
  }

  return null;
}

export default { unionArray, allModelsTypes, oneOf, isType, getParentOfTypeString };
