import { types, getRoot, getParentOfType } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Utils from "../utils";
import { HyperTextLabelsModel } from "../tags/control/HyperTextLabels";
import { HyperTextModel } from "../tags/object/HyperText";
import { guidGenerator } from "../core/Helpers";

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
    states: types.maybeNull(types.array(types.union(HyperTextLabelsModel))),
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
            text: self.text,
          },
        };

        if (self.normalization) tree["normalization"] = self.normalization;

        return tree;
      };

      if (self.states && self.states.length) {
        return self.states.map(s => {
          const tree = buildTree(s);

          tree["value"]["htmllabels"] = s.getSelectedNames();

          return tree;
        });
      } else {
        return buildTree(parent);
      }
    },

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
