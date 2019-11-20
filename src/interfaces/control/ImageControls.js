import React from "react";
import { observer, inject } from "mobx-react";
import { types, getParent } from "mobx-state-tree";

import { guidGenerator } from "../../core/Helpers";
import Registry from "../../core/Registry";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";
import Hint from "../../components/Hint/Hint";
import ImageControls from "../../components/ImageControls/ImageControls";

/**
 * Shortcut tag can be used to define a shortcut, which adds a predefined object
 * @example
 * <View>
 *   <TextArea name="txt-1">
 *     <Shortcut alias="Silence" value="<SILENCE>" hotkey="ctrl+1"></Shortcut>
 *   </TextArea>
 * </View>
 * @name Shortcut
 * @param {string} value A value of the shortcut
 * @param {string} alias Shortcut alias
 * @param {string} hotkey Hotkey
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  alias: types.maybeNull(types.string),
  hotkey: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "imagecontrols",
    _value: types.optional(types.string, ""),
  })
  .views(self => ({}))
  .actions(self => ({}));

const ImageControlsModel = types.compose(
  "ImageControlsModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

const HtxImageControlsView = inject("store")(
  observer(({ item, store }) => {
    return <ImageControls item={item} />;
  }),
);

Registry.addTag("imagecontrols", ImageControlsModel, HtxImageControlsView);

export { HtxImageControlsView, ImageControlsModel };
