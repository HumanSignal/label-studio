export function cutFibers(object) {
  const objects = [object];
  let obj;

  while ((obj = objects.pop())) {
    const keys = Object.keys(obj);
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const isSvg = obj.elementType === 'svg';

    // preventing processing svgs due to the problem with props,
    // props sometimes come from the global variables, so it's tricky to clean them without breaking icons itself
    if (isSvg) continue;

    for (const key of keys) {
      const prop = obj[key];
      const isWritable = descriptors[key].writable;

      if (prop && isWritable) {
        if (key !== '_debugOwner' && typeof prop === 'object' && {}.hasOwnProperty.call(prop, 'stateNode')) {
          objects.push(obj[key]);
        }
        if (typeof prop === 'object' || typeof prop === 'function') {
          obj[key] = null;
        }
      }
    }
  }
}

export function findReactKey(node) {
  const keys = Object.keys(node);

  for (const key of keys) {
    const match = RegExp(/^__reactProps(\$[^$]+)$/).exec(key);

    if (match) {
      return match[1];
    }
  }
  return '';
}

export function cleanDomAfterReact(nodes, reactKey) {
  for (const node of nodes) {
    if (node.isConnected) return;
    // preventing processing svgs due to the problem with props,
    // props sometimes come from the global variables, so it's tricky to clean them without breaking icons itself
    if (node.tagName === 'svg') return;
    const reactPropKeys = (Object.keys(node)).filter(key => key.startsWith('__react') && (!RegExp(/^(?:__reactProps|__reactFiber)/).exec(key) || RegExp(new RegExp(`\\${reactKey}$`)).exec(key)));

    if (reactPropKeys.length) {
      for (const key of reactPropKeys) {
        cutFibers(node[key]);
        node[key] = null;
      }
      if (node.childNodes) {
        cleanDomAfterReact(node.childNodes, reactKey);
      }
    }
  }
}

const globalCache = new WeakMap();

function createCleaner() {
  let ref = null;

  return (node) => {
    if (node) {
      ref = node;
    } else {
      if (ref) {
        const lastRef = ref;
        const reactKey = findReactKey(lastRef);

        ref = null;
        setTimeout(() => {
          cleanDomAfterReact([lastRef], reactKey);
        });
      }
    }
  };
}

export function reactCleaner(object, key = 'default') {
  if (!globalCache.has(object)) {
    globalCache.set(object, new Map());
  }
  const cache = globalCache.get(object);

  if (!cache.has(key)) {
    cache.set(key, createCleaner());
  }

  return cache.get(key);
}
