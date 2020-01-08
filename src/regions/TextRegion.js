import React from "react";
import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Constants from "../core/Constants";
import Hint from "../components/Hint/Hint";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import Utils from "../utils";
import styles from "./TextRegion/TextRegion.module.scss";
import { LabelsModel } from "../tags/control/Labels";
import { RatingModel } from "../tags/control/Rating";
import { TextModel } from "../tags/object/Text";
import { guidGenerator } from "../core/Helpers";

const Model = types
  .model("TextRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "textrange",
    start: types.integer,
    end: types.integer,
    text: types.string,
    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel))),
  })
  .views(self => ({
    get parent() {
      return getParentOfType(self, TextModel);
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    // highlightStates() {},

    /**
     *
     */
    toStateJSON() {
      const parent = self.parent;
      const buildTree = obj => {
        const tree = {
          id: self.pid,
          from_name: obj.name,
          to_name: parent.name,
          source: parent.value,
          type: "region",
          // text: parent.text,
          value: {
            start: self.start,
            end: self.end,
            text: self.text,
          },
        };

        if (self.normalization) tree["normalization"] = self.normalization;

        return tree;
      };

      if (self.states && self.states.length) {
        return self.states.map(s => {
          const tree = buildTree(s);
          // in case of labels it's gonna be, labels: ["label1", "label2"]
          tree["value"][s.type] = s.getSelectedNames();
          tree["type"] = s.type;

          return tree;
        });
      } else {
        return buildTree(parent);
      }
    },
  }));

const TextRegionModel = types.compose("TextRegionModel", RegionsMixin, NormalizationMixin, Model);

/**
 * Region state hint
 * @param {*} props
 */
const RegionState = props => {
  const localState = props.state;

  /**
   * Get name of label
   */
  const selectedString = localState.getSelectedString();
  const selectedColor = Utils.Colors.convertToRGBA(localState.getSelectedColor(), 0.3);
  let style = {
    background: selectedColor,
  };

  if (props.style) style = { ...style, outline: props.style.outline };

  return (
    <Hint className={styles.state} style={style}>
      <span data-hint={true}>&nbsp;[{selectedString}]</span>
    </Hint>
  );
};

const HtxTextRegionView = ({ store, item, letterGroup, range, textCharIndex, onMouseOverHighlightedWord }) => {
  /**
   * Get color of label
   */
  let labelColor = "rgba(0, 0, 255, 0.1)";

  if (range.states) {
    labelColor = range.states.map(s => {
      return s.getSelectedColor();
    });
  }

  /**
   * TODO
   * Update function to all formats
   */
  if (labelColor.length !== 0) {
    labelColor = Utils.Colors.convertToRGBA(labelColor[0], 0.3);
  }

  let markStyle = {
    padding: "2px 0px",
    position: "relative",
    borderRadius: "2px",
    cursor: store.completionStore.selected.relationMode ? Constants.RELATION_MODE_CURSOR : Constants.POINTER_CURSOR,
  };

  let regionStates = range.states.map(state => (
    <RegionState
      key={range.id}
      state={state}
      bg={labelColor}
      hover={store.completionStore.selected.relationMode ? true : false}
      selected={range.selected}
      style={range.highlighted ? { outline: Constants.HIGHLIGHTED_CSS_BORDER } : null}
    />
  ));

  /**
   * Without label
   */
  if (!regionStates.length) {
    markStyle = {
      ...markStyle,
      background: "rgba(0, 0, 255, 0.1)",
    };
  }

  return (
    <span
      style={markStyle}
      onClick={range.onClickRegion}
      onMouseOver={() => {
        if (store.completionStore.selected.relationMode) {
          range.setHighlight(true);
        }
      }}
      onMouseOut={() => {
        if (store.completionStore.selected.relationMode) {
          range.setHighlight(false);
        }
      }}
    >
      {letterGroup}
      {regionStates}
    </span>
  );
};

const HtxTextRegion = inject("store")(observer(HtxTextRegionView));

Registry.addTag("textrange", TextRegionModel, HtxTextRegion);

export { TextRegionModel, HtxTextRegion };
