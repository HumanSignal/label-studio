import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import Types from "../../core/Types";

/**
 * View element. It's analogous to div element in html and can be used to visual configure display of blocks
 * @example
 * <View style="display: flex;">
 *  <View style="flex: 50%">
 *   <Header value="Facts:"></Header>
 *   <Text name="text" value="$fact"></Text>
 *  </View>
 *  <View style="flex: 50%; margin-left: 1em">
 *   <Header value="Enter your question:"></Header>
 *   <TextArea name="question" ></TextArea>
 *  </View>
 * </View>
 * @name View
 * @param {block|inline} display
 * @param {style} style css style string
 * @param {className} class name of the css style to apply
 */
const TagAttrs = types.model({
  classname: types.optional(types.string, ""),
  display: types.optional(types.string, "block"),
  style: types.maybeNull(types.string),
});

const Model = types.model({
  id: types.identifier,
  type: "view",
  children: Types.unionArray([
    "view",
    "header",
    "labels",
    "table",
    "choices",
    "rating",
    "ranker",
    "rectangle",
    "polygon",
    "keypoint",
    "brush",
    "rectanglelabels",
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
  ]),
});

const ViewModel = types.compose("ViewModel", TagAttrs, Model);

const HtxView = observer(({ item }) => {
  let style = {};

  if (item.display === "inline") {
    style = { display: "inline-block", marginRight: "15px" };
  }

  if (item.style) {
    style = Tree.cssConverter(item.style);
  }

  return (
    <div className={item.classname} style={style}>
      {Tree.renderChildren(item)}
    </div>
  );
});

Registry.addTag("view", ViewModel, HtxView);

export { HtxView, ViewModel };
