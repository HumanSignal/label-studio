import { types, getParentOfType, destroy, getRoot } from "mobx-state-tree";

import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import { LabelsModel } from "../control/Labels";
import { RatingModel } from "../control/Rating";

import { AudioPlusModel } from "./AudioPlus";

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    start: types.number,
    end: types.number,

    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel))),
    // regionbg: types.string,
    // selectedregionbg: types.string
  })
  .views(self => ({
    get parent() {
      return getParentOfType(self, AudioPlusModel);
    },

    get regionbg() {
      return self.parent.regionbg;
    },

    get selectedregionbg() {
      return self.parent.selectedregionbg;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    toStateJSON() {
      const parent = self.parent;
      const buildTree = obj => {
        const tree = {
          id: self.pid,
          // type: getType(s).name,
          from_name: obj.name,
          to_name: parent.name,
          source: parent.value,
          type: "region",
          // text: parent.text,
          value: {
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
          // in case of labels it's gonna be, labels: ["label1", "label2"]
          tree["value"][s.type] = s.getSelectedNames();
          tree["type"] = s.type;

          return tree;
        });
      } else {
        return buildTree(parent);
      }
    },

    unselectRegion() {
      self.selected = false;
      self._ws_region.update({ color: self.regionbg });
      self.completion.setHighlightedNode(null);
    },

    selectRegion() {
      self.selected = true;
      self.completion.setHighlightedNode(self);
      self._ws_region.update({ color: self.selectedregionbg });
    },

    setHighlight(val) {
      self.highlighted = val;

      if (val) {
        // self._ws_region.update({ color: self.selectedregionbg });
        self._ws_region.element.style.border = "2px solid red";
      } else {
        // self._ws_region.update({ color: self.regionbg });
        self._ws_region.element.style.border = "none";
      }
    },

    beforeDestroy() {
      if (self._ws_region) self._ws_region.remove();
    },

    onClick(wavesurfer) {
      if (!self.completion.relationMode) {
        Object.values(wavesurfer.regions.list).forEach(r => {
          r.update({ color: self.regionbg });
        });

        self._ws_region.update({ color: self.selectedregionbg });
      }

      self.onClickRegion();
      // self.props.clickRegion(reg._range);
    },

    onMouseOver() {
      if (self.completion.relationMode) {
        self.setHighlight(true);
        self._ws_region.element.style.cursor = "crosshair";
      }
    },

    onMouseLeave() {
      if (self.completion.relationMode) {
        self.setHighlight(false);
        self._ws_region.element.style.cursor = "move";
      }
    },

    onUpdateEnd(wavesurfer) {
      self.start = self._ws_region.start;
      self.end = self._ws_region.end;

      // console.log(self._ws_region.style());

      // console.log(self.start);
      // console.log(self.end);

      // Object.values(wavesurfer.regions.list).forEach((r) => {
      //     r.update({ color: self.regionbg });
      // });

      // self._ws_region.update({ color: self.selectedregionbg });
    },
  }));

const AudioRegionModel = types.compose(
  "AudioRegionModel",
  RegionsMixin,
  NormalizationMixin,
  Model,
);

export { AudioRegionModel };
