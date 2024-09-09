import React from "react";
import { getRoot, types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { Collapse } from "antd";

import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";

import Types from "../../core/Types";
import Tree from "../../core/Tree";
import { FF_BULK_ANNOTATION } from "../../utils/feature-flags";

const { Panel } = Collapse;

/**
 * Collapse tag, a content area which can be collapsed and expanded.
 * @example
 * <Collapse>
 *   <Panel value="Panel Header">
 *     <View><Header value="Hello world" /></View>
 *   </Panel>
 * </Collapse>
 * @name Collapse
 * @param {boolean} [accordion=true]  - Works as an accordion
 * @param {string} [bordered=false]   - Shows border
 */
const PanelModel = types
  .model({
    type: "panel",

    _value: types.optional(types.string, ""),
    value: types.optional(types.string, ""),

    children: Types.unionArray([
      "view",
      "header",
      "labels",
      "label",
      "table",
      "taxonomy",
      "choices",
      "choice",
      "rating",
      "ranker",
      "rectangle",
      "ellipse",
      "polygon",
      "keypoint",
      "brush",
      "rectanglelabels",
      "ellipselabels",
      "polygonlabels",
      "keypointlabels",
      "brushlabels",
      "hypertextlabels",
      "text",
      "audio",
      "image",
      "hypertext",
      "audioplus",
      "list",
      "dialog",
      "textarea",
      "pairwise",
      "style",
      "label",
      "relations",
      "filter",
      "timeseries",
      "timeserieslabels",
      "paragraphs",
      "paragraphlabels",
    ]),
  })
  .views((self) => ({
    // Indicates that it could exist without information about objects, taskData and regions
    get isIndependent() {
      // if value starts with $ it's related to the data but in case of Panel it's just affect title
      // we may still want to show it even if there is no data
      // if (self.value && self.value[0] === "$") return false;

      // In other cases Panel can exist independent if it hase some independent children
      return !!self.children?.some((c) => {
        return c.isIndependent === true;
      });
    },
  }));

const Model = types
  .model({
    type: "collapse",

    size: types.optional(types.string, "4"),
    style: types.maybeNull(types.string),

    _value: types.optional(types.string, ""),
    value: types.optional(types.string, ""),

    bordered: types.optional(types.boolean, false),
    accordion: types.optional(types.boolean, true),

    children: Types.unionArray(["panel"]),
  })
  .views((self) => ({
    get store() {
      return getRoot(self);
    },
    // Indicates that it could exist without information about objects, taskData and regions
    get isIndependent() {
      // It is independent if some panels in it are so
      return !!self.children?.some((c) => {
        return c.isIndependent === true;
      });
    },
  }));

const CollapseModel = types.compose("CollapseModel", Model, ProcessAttrsMixin);

const HtxCollapse = observer(({ item }) => {
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && item.store.hasInterface("annotation:bulk");

  return (
    <Collapse bordered={item.bordered} accordion={item.accordion}>
      {item.children
        .filter((i) => i.type === "panel" && (!isBulkMode || i.isIndependent))
        .map((i) => (
          <Panel key={i._value} header={i._value}>
            {Tree.renderChildren(i, item.annotation)}
          </Panel>
        ))}
    </Collapse>
  );
});

Registry.addTag("panel", types.compose("PanelModel", PanelModel, ProcessAttrsMixin), () => {});
Registry.addTag("collapse", CollapseModel, HtxCollapse);

export { HtxCollapse, CollapseModel };
