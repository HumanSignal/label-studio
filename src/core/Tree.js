import React from "react";
import { getType, getParentOfType } from "mobx-state-tree";
import { parseString } from "xml2js";

import Registry from "./Registry";
import { guidGenerator } from "./Helpers";

/**
 * Clone React Tree
 * @param {*} items
 * @param {*} attrs
 */
function cloneReactTree(items, attrs) {
  let clone = null;
  clone = function(children) {
    const res = [];

    React.Children.forEach(children, function(child) {
      let el;

      if (child.props) {
        let moreProps = {};

        if (typeof attrs === "function") {
          moreProps = attrs(child);
        } else if (typeof attrs === "object") {
          moreProps = attrs;
        }

        el = React.cloneElement(child, moreProps, clone(child.props.children));
      } else {
        el = child;
      }

      res.push(el);
    });

    return res;
  };

  return clone(items);
}

/**
 * Function to convert CSS string to object
 * @param {string} style
 * @returns {object}
 */
function cssConverter(style) {
  if (!style) return null;

  let result = {},
    attributes = style.split(";"),
    firstIndexOfColon,
    i,
    key,
    value;

  for (i = 0; i < attributes.length; i++) {
    firstIndexOfColon = attributes[i].indexOf(":");
    key = attributes[i].substring(0, firstIndexOfColon);
    value = attributes[i].substring(firstIndexOfColon + 1);

    key = key.replace(/ /g, "");
    if (key.length < 1) {
      continue;
    }

    if (value[0] === " ") {
      value = value.substring(1);
    }

    if (value[value.length - 1] === " ") {
      value = value.substring(0, value.length - 1);
    }

    var ukey = key.replace(/(-.)/g, x => x[1].toUpperCase());

    result[ukey] = value;
  }

  return result;
}

/**
 *
 * @param {*} attrs
 */
function attrsToProps(attrs) {
  const props = {};

  if (!attrs) return props;

  for (let item of Object.keys(attrs)) {
    /**
     * Convert node of Tree to boolean value
     */
    if (item !== "value" && (attrs[item] === "true" || attrs[item] === "false")) {
      props[item.toLowerCase()] = JSON.parse(attrs[item]);
    } else {
      props[item.toLowerCase()] = attrs[item];
    }
  }

  return props;
}

/**
 *
 * @param {*} html
 */
function treeToModel(html) {
  /**
   * Remove all line breaks from a string
   * @param {string}
   * @returns {string}
   */
  function removeAllBreaks(data) {
    return data.replace(/(\r\n|\n|\r)/gm, "");
  }

  /**
   * Edit all self closing tags from XML View
   * TODO: Fix bug: if the value of <Choice /> or another tag contains "/>" function return error
   * @param {string} data
   * @returns {string}
   */
  function editSelfClosingTags(data) {
    let split = data.split("/>");
    let newData = "";

    for (let i = 0; i < split.length - 1; i++) {
      let edsplit = split[i].split("<");
      newData += split[i] + "></" + edsplit[edsplit.length - 1].split(" ")[0] + ">";
    }

    return newData + split[split.length - 1];
  }

  /**
   * Generate new node
   * @param {object} node
   */
  function addNode(node) {
    if (!node.$$) return null;

    let text = null;
    const res = [];

    for (let chld of node.$$) {
      if (chld["#name"] !== "__text__") {
        const data = buildData(chld);
        const children = addNode(chld);

        if (children) {
          if (typeof children === "string") data["value"] = children;
          else data.children = children;
        }

        res.push(data);
      } else {
        text = chld._;
      }
    }

    return res.length === 0 ? text : res;
  }

  /**
   * Generate obj with main data
   */
  function buildData(node) {
    const data = attrsToProps(node.$);

    /**
     * Generation id of node
     */
    data["id"] = guidGenerator();

    /**
     * Build type name
     */
    data["type"] = node["#name"].toLowerCase();

    return data;
  }

  const htmlWithotBreaks = removeAllBreaks(html);
  const htmlSelfClosingTags = editSelfClosingTags(htmlWithotBreaks);
  let document;

  // it's actually a sync function, but there is no sync interface
  // because of some backwards compat
  parseString(
    htmlSelfClosingTags,
    {
      explicitChildren: true,
      preserveChildrenOrder: true,
      charsAsChildren: true,
    },
    function(err, result) {
      document = result;
    },
  );

  const root = buildData(Object.values(document)[0]);
  root.children = addNode(Object.values(document)[0]);

  return root;
}

/**
 * Render items of tree
 * @param {*} el
 */
function renderItem(el) {
  const View = Registry.getViewByModel(getType(el).name);

  if (!View) {
    throw new Error("No view for model:" + getType(el).name);
  }

  return <View key={guidGenerator()} item={el} />;
}

/**
 *
 * @param {*} item
 */
function renderChildren(item) {
  if (item && item.children && item.children.length) {
    return item.children.map(el => {
      return renderItem(el);
    });
  } else {
    return null;
  }
}

/**
 *
 * @param {*} name
 * @param {*} tree
 */
function findInterface(name, tree) {
  let fn;
  fn = function(node) {
    if (getType(node).name === name) return node;

    if (node.children) {
      for (let chld of node.children) {
        const res = fn(chld);
        if (res) return res;
      }
    }
  };

  return fn(tree);
}

/**
 *
 * @param {*} obj
 * @param {*} classes
 */
function findParentOfType(obj, classes) {
  for (let c of classes) {
    try {
      const p = getParentOfType(obj, c);
      if (p) return p;
    } catch (err) {}
  }

  return null;
}

/**
 *
 * @param {*} obj
 * @param {*} classes
 */
function filterChildrenOfType(obj, classes) {
  const res = [];

  let fn;
  fn = function(node) {
    for (let c of classes) {
      if (getType(node).name === c) res.push(node);
    }

    if (node.children) {
      for (let chld of node.children) {
        fn(chld);
      }
    }
  };

  fn(obj);

  return res;
}

export default {
  cloneReactTree,
  renderItem,
  renderChildren,
  treeToModel,
  findInterface,
  findParentOfType,
  filterChildrenOfType,
  cssConverter,
};
