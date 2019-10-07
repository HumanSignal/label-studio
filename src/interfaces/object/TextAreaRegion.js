import React, { createRef, Component, Fragment } from "react";
import PropTypes from "prop-types";

import { observer, inject, Provider } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";
import { Message } from "semantic-ui-react";

import Types from "../../core/Types";

import Registry from "../../core/Registry";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";
import { TextAreaModel } from "../control/TextArea";
import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

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
  }));

const TextAreaRegionModel = types.compose(
  "TextAreaRegionModel",
  RegionsMixin,
  NormalizationMixin,
  Model,
);

const HtxTextAreaRegionView = ({ store, item }) => {
  let markStyle = {
    cursor: store.completionStore.selected.relationMode ? "crosshair" : "pointer",
    display: "block",
  };

  if (item.selected) {
    markStyle = {
      ...markStyle,
      border: "1px solid red",
    };
  } else if (item.highlighted) {
    markStyle = {
      ...markStyle,
      border: "2px solid red",
    };
  }

  return (
    <Message
      className="warning"
      style={markStyle}
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
      <p>{item._value}</p>
    </Message>
  );
};

const HtxTextAreaRegion = inject("store")(observer(HtxTextAreaRegionView));

Registry.addTag("textarearegion", TextAreaRegionModel, HtxTextAreaRegion);

export { TextAreaRegionModel, HtxTextAreaRegion };
