import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import { types, getType, getRoot, getParentOfType } from "mobx-state-tree";

import insertAfter from "insert-after";

import { cloneNode } from "../../core/Helpers";
import Registry from "../../core/Registry";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import * as xpath from "xpath-range";

import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

import { runTemplate } from "../../core/Template";

import InfoModal from "../../components/Infomodal/Infomodal";
import { LabelsModel } from "../control/Labels";
import { HyperTextModel } from "./HyperText";

import { normalizeBoundaries } from "../../utils/html";

import Utils from "../../utils";

const Model = types
  .model("HyperTextRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "hypertextregion",
    startOffset: types.integer,
    start: types.string,
    endOffset: types.integer,
    end: types.string,
    text: types.string,
    states: types.maybeNull(types.array(types.union(LabelsModel))),
  })
  .views(self => ({
    get parent() {
      return getParentOfType(self, HyperTextModel);
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    highlightStates() {},

    toStateJSON() {
      const parent = self.parent;
      const buildTree = obj => {
        const tree = {
          id: self.pid,
          from_name: obj.name,
          to_name: parent.name,
          source: parent.value,
          type: "htmllabels",
          value: {
            startOffset: self.startOffset,
            endOffset: self.endOffset,
            start: self.start,
            end: self.end,
          },
        };

        if (self.normalization) tree["normalization"] = self.normalization;

        return tree;
      };

      if (self.states && self.states.length) {
        return self.states.map(s => {
          const tree = buildTree(s);
          // in case of labels it's gonna be, htmllabels: ["label1", "label2"]
          tree["value"]["html" + s.type] = s.getSelectedNames();
          tree["type"] = "html" + s.type;

          return tree;
        });
      } else {
        return buildTree(parent);
      }
    },

    /**
     * Select audio region
     */
    selectRegion() {
      self.selected = true;
      self.completion.setHighlightedNode(self);
      self._spans.forEach(span => {
        span.style.backgroundColor = Utils.Colors.rgbaChangeAlpha(span.style.backgroundColor, 0.8);
      });
    },

    _updateSpansOpacity(opacity) {
      self._spans &&
        self._spans.forEach(span => {
          span.style.backgroundColor = Utils.Colors.rgbaChangeAlpha(span.style.backgroundColor, opacity);
        });
    },

    /**
     * Unselect audio region
     */
    unselectRegion() {
      self.selected = false;
      self.completion.setHighlightedNode(null);
      self._updateSpansOpacity(0.3);
    },

    setHighlight(val) {
      self.highlighted = val;

      if (val) self._updateSpansOpacity(0.8);
      else if (!self.selected) self._updateSpansOpacity(0.3);
    },

    beforeDestroy() {
      var norm = [];
      if (self._spans) {
        self._spans.forEach(span => {
          while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);

          norm.push(span.parentNode);
          span.parentNode.removeChild(span);
        });
      }

      norm.forEach(n => n.normalize());
    },
  }));

const HyperTextRegionModel = types.compose("HyperTextRegionModel", RegionsMixin, NormalizationMixin, Model);

export { HyperTextRegionModel };
