import { getParent, getType, isRoot, types } from 'mobx-state-tree';

import Registry from './Registry';

function _mixedArray(fn) {
  return function(arr) {
    return types.maybeNull(types.array(fn(arr)));
  };
}

function _oneOf(lookup, err) {
  return function(arr) {
    return types.union({
      dispatcher: sn => {
        if (arr.find(val => sn.type === val)) {
          return lookup(sn.type);
        } else {
          throw Error(err + sn.type);
        }
      },
    });
  };
}

const oneOfTags = _oneOf(Registry.getModelByTag, 'Not expecting tag: ');
const tagsArray = _mixedArray(oneOfTags);

function unionArray(arr) {
  const type = types.maybeNull(types.array(oneOfTags(arr)));

  type.value = arr;
  return type;
}

function unionTag(arr) {
  return types.maybeNull(types.enumeration('unionTag', arr));
}

function tagsTypes(arr) {
  const type = types.frozen(arr.map(val => val.toLowerCase()));

  type.describe = () => `(${arr.join('|')})`;
  type.value = arr;
  return type;
}

function allModelsTypes() {
  const args = [
    {
      dispatcher: sn => {
        if (!sn) return types.literal(undefined);
        if (Registry.tags.includes(sn.type)) {
          return Registry.getModelByTag(sn.type);
        } else {
          throw Error('Not expecting tag: ' + sn.type);
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

  for (const t of types) if (nt === t) return true;

  return false;
}

function getParentOfTypeString(node, str) {
  // same as getParentOfType but checks models .name instead of type
  let parent = getParent(node);

  if (!Array.isArray(str)) str = [str];

  while (parent) {
    const name = getType(parent).name;

    if (str.find(c => c === name)) return parent;

    parent = isRoot(parent) ? null : getParent(parent);
  }

  return null;
}

function getParentTagOfTypeString(node, str) {
  // same as getParentOfType but checks models .name instead of type
  let parent = getParent(node);

  if (!Array.isArray(str)) str = [str];

  while (parent) {
    const parentType = parent.type;

    if (str.find(c => c === parentType)) return parent;

    parent = isRoot(parent) ? null : getParent(parent);
  }

  return null;
}

const oneOfTools = _oneOf(Registry.getTool, 'Not expecting tool: ');
const toolsArray = _mixedArray(oneOfTools);

const Types = {
  unionArray,
  allModelsTypes,
  unionTag,
  tagsTypes,
  isType,
  getParentOfTypeString,
  getParentTagOfTypeString,
  tagsArray,
  toolsArray,
};

export default Types;
