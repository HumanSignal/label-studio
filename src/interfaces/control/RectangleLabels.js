import { observer } from "mobx-react";
import React, { Component } from "react";

import { types } from "mobx-state-tree";

import Types from "../../core/Types";
import Registry from "../../core/Registry";

import { guidGenerator } from "../../core/Helpers";
import SelectedModelMixin from "../mixins/SelectedModel";
import InfoModal from "../../components/Infomodal/Infomodal";

import { HtxLabels, LabelsModel } from "./Labels";
import { RectangleModel } from "./Rectangle";

/**
 * RectangleLabels tag creates labeled rectangles
 * Used only for Image
 * @example
 * <View>
 *   <RectangleLabels name="labels" toName="image">
 *     <Label value="Person"></Label>
 *     <Label value="Animal"></Label>
 *   </RectangleLabels>
 *   <Image name="image" value="$image"></Image>
 * </View>
 * @name RectangleLabels
 * @param {string} name name of the element
 * @param {string} toname name of the image to label
 * @param {float=} [opacity=0.6] opacity of rectangle
 * @param {string=} fillColor rectangle fill color, default is transparent
 * @param {string=} strokeColor stroke color
 * @param {number=} [strokeWidth=1] width of stroke
 * @param {boolean=} [canRotate=true] show or hide rotation handle
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),
});

const Model = types
  .model("RectangleLabelsModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "rectanglelabels",
    children: Types.unionArray(["labels", "label", "choice"]),
  })
  .views(self => ({
    get shouldBeUnselected() {
      return self.choice === "single";
    },
  }))
  .actions(self => ({
    getSelectedColor() {
      // return first selected label color
      const sel = self.children.find(c => c.selected === true);
      return sel && sel.background;
    },

    /**
     * Usage check of selected labels before send completion to server
     */
    beforeSend() {
      const names = self.getSelectedNames();

      if (names && self.type === "rectanglelabels") {
        self.unselectAll();
      }
    },

    fromStateJSON(obj, fromModel) {
      self.unselectAll();

      if (!obj.value.rectanglelabels) {
        InfoModal.error("Error with labels.");
        return;
      }

      if (obj.id) self.pid = obj.id;

      /**
       * Found correct label from config
       */
      obj.value.rectanglelabels.forEach(inLabel => {
        const label = self.findLabel(inLabel);

        if (!label) {
          InfoModal.error("Error with labels. Not found: " + obj.value.rectanglelabels);
          return;
        }

        label.markSelected(true);
      });
    },
  }));

const Composition = types.compose(
  LabelsModel,
  RectangleModel,
  TagAttrs,
  Model,
  SelectedModelMixin,
);
const RectangleLabelsModel = types.compose(
  "RectangleLabelsModel",
  Composition,
);

const HtxRectangleLabels = observer(({ item }) => {
  return <HtxLabels item={item} />;
  // return (
  //   <div
  //     style={{
  //       marginTop: "1em",
  //       marginBottom: "1em",
  //       display: "flex",
  //       justifyContent: "flex-start",
  //       alignItems: "center",
  //       flexFlow: "wrap",
  //     }}
  //   >
  //     {Tree.renderChildren(item)}
  //   </div>
  // );
});

Registry.addTag("rectanglelabels", RectangleLabelsModel, HtxRectangleLabels);

export { HtxRectangleLabels, RectangleLabelsModel };
