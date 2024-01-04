import React from 'react';
import { getParentOfType, getType } from 'mobx-state-tree';
import { IAnyComplexType, IAnyStateTreeNode } from 'mobx-state-tree/dist/internal';

import Registry from './Registry';
import { parseValue } from '../utils/data';
import { FF_DEV_3391, isFF } from '../utils/feature-flags';
import { guidGenerator } from '../utils/unique';

interface ConfigNodeBaseProps {
  id: string;
  type: string;
  tagName: string;
}

interface ConfigNode extends ConfigNodeBaseProps {
  // [key: string]: string,
  children?: ConfigNode[];
  value?: string;
}

interface IAnnotation {
  id: string;
  ids: Map<string, IAnyStateTreeNode>;
}

export const TRAVERSE_SKIP = 'skip';
export const TRAVERSE_STOP = 'stop';

function detectParseError(doc?: Document) {
  let node = doc?.children?.[0];

  for (let i = 0; i < 3; i++) {
    if (node?.tagName === 'parsererror') return node.textContent;
    node = node?.children?.[0];
  }
}

const deepReplaceAttributes = (
  root: Element,
  idx: number,
  indexFlag: string,
) => {
  function recursiveClone(node: Element) {
    if (node.attributes === undefined) return;

    const attrNames = Array.from(node.attributes).map(att => att.name);

    for (const name of attrNames) {
      const value = node.getAttribute(name);

      node.setAttribute(name, value?.replace?.(indexFlag, `${idx}`) ?? '');
    }

    node.childNodes.forEach(node => recursiveClone(node as Element));
  }

  recursiveClone(root);
};

function tagIntoObject(
  node: Element,
  taskData: Record<string, any>,
  replaces?: Record<string, string>,
): ConfigNode {
  const props = attrsToProps(node, replaces);
  const type = node.tagName.toLowerCase();
  const indexFlag = props.indexflag ?? '{{idx}}';
  const id = isFF(FF_DEV_3391)
    ? node.getAttribute('name') ?? guidGenerator()
    : guidGenerator();
  const data: ConfigNode = {
    ...props,
    id,
    tagName: node.tagName,
    type,
  };

  if (type === 'repeater') {
    const repeaterArray = parseValue(props.on, taskData) || [];
    const views = [];

    for (let i = 0; i < repeaterArray.length; i++) {
      const newReplaces: Record<string, string> = { ...replaces, [indexFlag]: i };
      const view = {
        id: guidGenerator(),
        tagName: 'View',
        type: 'view',
        children: [...node.children].map(child => {
          const clonedNode = child.cloneNode(true) as Element;

          deepReplaceAttributes(clonedNode, i, indexFlag);

          return tagIntoObject(clonedNode, taskData, newReplaces);
        }),
      };

      views.push(view);
    }

    data.tagName = 'View';

    if (props.mode === 'pagination') {
      data.type = 'pagedview';
    } else {
      data.type = 'view';
    }

    data.children = views;
  } else
  // contains only text nodes; HyperText can contain any structure
  if (node.childNodes.length && (!node.children.length || type === 'hypertext')) {
    data.value = node.innerHTML?.trim() || data.value || '';
  } else if (node.children.length) {
    data.children = [...node.children].map(child => tagIntoObject(child, taskData));
  }

  return data;
}

/**
 * Function to convert CSS string to object
 * @param {string} style
 * @returns {object}
 */
function cssConverter(style: string) {
  if (!style) return null;

  const result: Record<string, string> = {},
    attributes = style.split(';');

  let firstIndexOfColon,
    i,
    key,
    value;

  for (i = 0; i < attributes.length; i++) {
    firstIndexOfColon = attributes[i].indexOf(':');
    key = attributes[i].substring(0, firstIndexOfColon);
    value = attributes[i].substring(firstIndexOfColon + 1);

    key = key.replace(/ /g, '');
    if (key.length < 1) {
      continue;
    }

    if (value[0] === ' ') {
      value = value.substring(1);
    }

    if (value[value.length - 1] === ' ') {
      value = value.substring(0, value.length - 1);
    }

    const ukey = key.replace(/(-.)/g, x => x[1].toUpperCase());

    result[ukey] = value;
  }

  return result;
}

/**
 *
 * @param {*} attrs
 */
function attrsToProps(node: Element, replaces?: Record<string, string>): Record<string, any> {
  const props: Record<string, any> = {};

  if (!node) return props;

  for (const attr of node.attributes) {
    const { name, value } = attr;

    if (name !== 'value' && ['true', 'false'].includes(value)) {
      // Convert node of Tree to boolean value
      props[name.toLowerCase()] = value === 'true';
    } else {
      if (replaces) {
        let finalValue = value;

        for (const [key, index] of Object.entries(replaces)) {
          finalValue = finalValue.replace(key, index);
        }
        props[name.toLowerCase()] = finalValue;
      } else {
        props[name.toLowerCase()] = value;
      }
    }
  }

  return props;
}

/**
 *
 * @param {string} html
 */
function treeToModel(html: string, store: { task: { dataObj: Record<string, any> }}): ConfigNode {
  const parser = new DOMParser();

  const doc = parser.parseFromString(html, 'application/xml');

  const root = doc?.children?.[0];
  const parserError = detectParseError(doc);

  if (parserError) {
    throw new Error(parserError);
  }

  return tagIntoObject(root, store.task?.dataObj ?? {});

  // this.serializer = new XMLSerializer();

  // this.initRoot();

  // const root = buildData(Object.values(document)[0]);

  // root.children = addNode(Object.values(document)[0]);

  // return root;
}

/**
 * Render items of tree
 * @param {*} el
 */
function renderItem(ref: IAnyStateTreeNode, annotation: IAnnotation, includeKey = true) {
  let el = ref;

  if (isFF(FF_DEV_3391)) {
    if (!annotation) return null;

    el = annotation.ids.get(cleanUpId(ref.id ?? ref.name));
  }

  if (!el) {
    console.error(`Can't find element ${ref.id ?? ref.name} in annotation ${annotation?.id}`);
    return null;
  }

  const type = getType(el);
  const identifierAttribute = type.identifierAttribute;
  const typeName = type.name;
  const View = Registry.getViewByModel(typeName);

  if (!View) {
    throw new Error(`No view for model: ${typeName}`);
  }
  const key = (identifierAttribute && el[identifierAttribute]) || guidGenerator();

  return <View key={includeKey ? key : undefined} item={el} />;
}

/**
 *
 * @param {*} item
 */
function renderChildren(item: IAnyStateTreeNode, annotation: IAnnotation) {
  if (item && item.children && item.children.length) {
    return item.children.map((el: IAnyStateTreeNode) => {
      return renderItem(el, annotation);
    });
  } else {
    return null;
  }
}

/**
 *
 * @param {*} obj
 * @param {*} classes
 */
export function findParentOfType(obj: IAnyStateTreeNode, classes: IAnyComplexType[]) {
  for (const c of classes) {
    try {
      const p = getParentOfType(obj, c);

      if (p) return p;
    } catch (err) {
      console.error(err);
    }
  }

  return null;
}

/**
 *
 * @param {*} obj
 * @param {*} classes
 */
function filterChildrenOfType(obj: IAnyStateTreeNode, classes: string | string[]) {
  const res: IAnyStateTreeNode[] = [];
  const cls = Array.isArray(classes) ? classes : [classes];

  traverseTree(obj, function(node) {
    for (const c of cls) {
      if (getType(node).name === c) res.push(node);
    }
  });

  return res;
}

type TraverseResult = void | typeof TRAVERSE_SKIP | typeof TRAVERSE_STOP;

function traverseTree(root: IAnyStateTreeNode, cb: (node: IAnyStateTreeNode) => TraverseResult) {
  const visitNode = function(node: IAnyStateTreeNode): TraverseResult {
    const res = cb(node);

    if (res === TRAVERSE_SKIP) return;
    if (res === TRAVERSE_STOP) return TRAVERSE_STOP;

    if (node.children) {
      for (const chld of node.children) {
        const visit = visitNode(chld);

        if (visit === TRAVERSE_STOP) return TRAVERSE_STOP;
      }
    }
  };

  visitNode(root);
}

const cleanUpId = (id: string) => id.replace(/@.*/, '');

function extractNames(root: IAnyStateTreeNode) {
  const objects: IAnyStateTreeNode[] = [];
  const names = new Map<string, IAnyStateTreeNode>();
  const toNames = new Map<string, IAnyStateTreeNode[]>();

  // hacky way to get all the available object tag names
  const objectTypes = Registry.objectTypes().map(type => type.name.replace('Model', '').toLowerCase());

  traverseTree(root, node => {
    if (node.name) {
      names.set(cleanUpId(node.name), node);
      if (objectTypes.includes(node.type)) objects.push(cleanUpId(node.name));
    }
  });

  // initialize toName bindings [DOCS] name & toName are used to
  // connect different components to each other
  traverseTree(root, node => {
    const isControlTag = node.name && !objectTypes.includes(node.type);
    // auto-infer missed toName if there is only one object tag in the config

    if (isControlTag && !node.toname && objects.length === 1) {
      node.toname = objects[0];
    }

    if (node && node.toname) {
      const val = toNames.get(node.toname);

      if (val) {
        val.push(names.get(cleanUpId(node.name)));
      } else {
        toNames.set(node.toname, [names.get(cleanUpId(node.name))]);
      }
    }
  });

  return { names, toNames };
}

export default {
  renderItem,
  renderChildren,
  treeToModel,
  findParentOfType,
  filterChildrenOfType,
  cssConverter,
  traverseTree,
  extractNames,
  cleanUpId,
};
