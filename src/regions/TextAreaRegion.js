import React from "react";
import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";
import { Alert } from "antd";

import Constants from "../core/Constants";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { TextAreaModel } from "../tags/control/TextArea";
import { guidGenerator } from "../core/Helpers";

const Model = types
  .model("TextAreaRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),

    type: "textarearegion",

    _value: types.string,
    // states: types.array(types.union(LabelsModel, ChoicesModel)),
  })
  .views(self => ({
    get parent() {
      return getParentOfType(self, TextAreaModel);
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    toStateJSON() {
      const toname = self.parent.toname || self.parent.name;

      return {
        id: self.pid,
        from_name: self.parent.name,
        to_name: toname,
        type: self.parent.type,
        value: {
          text: self._value,
        },
      };
    },
  }));

const TextAreaRegionModel = types.compose("TextAreaRegionModel", RegionsMixin, NormalizationMixin, Model);

const HtxTextAreaRegionView = ({ store, item }) => {
  let markStyle = {
    cursor: store.completionStore.selected.relationMode ? Constants.RELATION_MODE_CURSOR : Constants.POINTER_CURSOR,
    display: "block",
    marginBottom: "0.5em",
  };

  if (item.selected) {
    markStyle = {
      ...markStyle,
      border: "1px solid red",
    };
  } else if (item.highlighted) {
    markStyle = {
      ...markStyle,
      border: Constants.HIGHLIGHTED_CSS_BORDER,
    };
  }

  return (
    <div
      onClick={item.onClickRegion}
      onMouseOver={() => {
        if (store.completionStore.selected.relationMode) {
          item.setHighlight(true);
        }
      }}
      onMouseOut={() => {
        /* range.setHighlight(false); */
        if (store.completionStore.selected.relationMode) {
          item.setHighlight(false);
        }
      }}
    >
      <Alert type="success" message={item._value} style={markStyle} />
    </div>
  );
};

const HtxTextAreaRegion = inject("store")(observer(HtxTextAreaRegionView));

Registry.addTag("textarearegion", TextAreaRegionModel, HtxTextAreaRegion);

export { TextAreaRegionModel, HtxTextAreaRegion };
