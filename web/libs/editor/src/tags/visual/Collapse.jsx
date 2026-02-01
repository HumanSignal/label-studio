import { getRoot, types } from "mobx-state-tree";
import { observer } from "mobx-react";
import { Collapse } from "antd";

import Registry from "../../core/Registry";
import Types from "../../core/Types";
import Tree from "../../core/Tree";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import { isStarterCloudPlan } from "@humansignal/core";
import { FF_BULK_ANNOTATION, isFF } from "../../utils/feature-flags";
import { guidGenerator } from "../../utils/unique";

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
 * @param {boolean} [open=false]      - Sets default collapsed state
 */
const PanelModel = types
  .model({
    type: "panel",

    _value: types.optional(types.string, ""),
    value: types.optional(types.string, ""),

    open: types.maybeNull(types.boolean),

    children: Types.unionArray([
      "view",
      "header",
      "labels",
      "label",
      "table",
      "taxonomy",
      "choices",
      "choice",
      "collapse",
      "datetime",
      "number",
      "rating",
      "ranker",
      "rectangle",
      "ellipse",
      "polygon",
      "keypoint",
      "brush",
      "bitmask",
      "magicwand",
      "rectanglelabels",
      "bitmasklabels",
      "ellipselabels",
      "polygonlabels",
      "vector",
      "vectorlabels",
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
      "pdf",
      "video",
      "videorectangle",
      "timelinelabels",
      "custominterface",
      ...Registry.customTags.map((t) => t.tag.toLowerCase()),
    ]),
  })
  .views((self) => ({
    // Indicates that it could exist without information about objects, taskData and regions
    get isIndependent() {
      // if value starts with $ it's related to the data but in case of Panel it's just affect title
      // we may still want to show it even if there is no data
      // if (self.value && self.value[0] === "$") return false;

      // In other cases Panel can exist independent if it has some independent children
      return !!self.children?.some((c) => {
        return c.isIndependent === true;
      });
    },
  }));

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "collapse",

    size: types.optional(types.string, "4"),
    style: types.maybeNull(types.string),

    _value: types.optional(types.string, ""),
    value: types.optional(types.string, ""),

    bordered: types.optional(types.boolean, false),
    accordion: types.optional(types.boolean, true),
    open: types.maybeNull(types.boolean),

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

const CollapseModel = types.compose("CollapseModel", AnnotationMixin, Model, ProcessAttrsMixin);

const HtxCollapse = observer(({ item }) => {
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isStarterCloudPlan() && item.store.hasInterface("annotation:bulk");
  const visibleChildren = item.children.filter((i) => i.type === "panel" && (!isBulkMode || i.isIndependent));

  // Get default active keys based on both Collapse-level and Panel-level open properties
  // Global open sets the base state for all panels
  // Local open can override the global state for individual panels
  const defaultActiveKeys = visibleChildren.filter((panel) => panel.open ?? item.open).map((c) => `panel-${c.value}`);

  // For accordion mode, only the first active key should be used
  const finalActiveKeys = item.accordion
    ? defaultActiveKeys.length > 0
      ? [defaultActiveKeys[0]]
      : []
    : defaultActiveKeys;

  return (
    <Collapse bordered={item.bordered} accordion={item.accordion} defaultActiveKey={finalActiveKeys}>
      {visibleChildren.map((c, index) => (
        <Panel key={`panel-${c.value}`} header={c._value || c.value || `Panel ${index + 1}`} forceRender>
          {Tree.renderChildren(c, item.annotation)}
        </Panel>
      ))}
    </Collapse>
  );
});

Registry.addTag("panel", types.compose("PanelModel", PanelModel, ProcessAttrsMixin), () => {});
Registry.addTag("collapse", CollapseModel, HtxCollapse);

export { HtxCollapse, CollapseModel };
