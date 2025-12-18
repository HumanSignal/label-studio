import * as d3 from "d3";
import { types } from "mobx-state-tree";

import { Hotkey } from "../core/Hotkey";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { TimeSeriesModel } from "../tags/object/TimeSeries";
import { guidGenerator } from "../core/Helpers";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { AnnotationMixin } from "../mixins/AnnotationMixin";

const hotkeys = Hotkey("TimeSeries", "Time Series Segmentation");

const Model = types
  .model("TimeSeriesRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "timeseriesregion",
    object: types.late(() => types.reference(TimeSeriesModel)),

    start: types.union(types.number, types.string),
    end: types.union(types.number, types.string),
    instant: false,
  })
  .volatile(() => ({
    hideable: true,
  }))
  .views((self) => ({
    get parent() {
      return self.object;
    },

    getRegionElement() {
      return self._brushRef;
    },
  }))
  .actions((self) => ({
    growRight(size) {
      self.end = self.end + size;
    },

    growLeft(size) {
      self.start = self.start - size;
    },

    shrinkRight(size) {
      self.end = self.end - size;
    },

    shrinkLeft(size) {
      self.start = self.start + size;
    },

    selectRegion() {
      const one = 1000;
      const lots = one * 10;

      hotkeys.addNamed("ts:grow-left", () => self.growLeft(one));
      hotkeys.addNamed("ts:grow-right", () => self.growRight(one));
      hotkeys.addNamed("ts:shrink-left", () => self.shrinkLeft(one));
      hotkeys.addNamed("ts:shrink-right", () => self.shrinkRight(one));

      hotkeys.addNamed("ts:grow-left-large", () => self.growLeft(lots));
      hotkeys.addNamed("ts:grow-right-large", () => self.growRight(lots));
      hotkeys.addNamed("ts:shrink-left-large", () => self.shrinkLeft(lots));
      hotkeys.addNamed("ts:shrink-right-large", () => self.shrinkRight(lots));

      self.parent.scrollToRegion(self);
    },

    updateAppearanceFromState() {
      const s = self.labelsState;

      if (!s) return;

      // @todo remove
      self.parent.updateView();
    },

    afterUnselectRegion() {
      [
        "ts:grow-left",
        "ts:grow-right",
        "ts:shrink-left",
        "ts:shrink-right",
        "ts:grow-left-large",
        "ts:grow-right-large",
        "ts:shrink-left-large",
        "ts:shrink-right-large",
      ].forEach((sc) => hotkeys.removeNamed(sc));

      self.parent.updateView();
    },

    updateRegion(start, end) {
      self.start = start;
      self.end = end;
      self.notifyDrawingFinished();
    },

    afterCreate() {
      if (typeof self.start === "string") {
        // deal only with timestamps/indices
        self.start = self.parent.parseTime(self.start);
        self.end = self.parent.parseTime(self.end);
      }
    },

    serialize() {
      // convert to original format from data/csv
      const format = self.parent.timeformat ? d3.utcFormat(self.parent.timeformat) : Number;
      const res = {
        value: {
          start: format(self.start),
          end: format(self.end),
          instant: self.instant,
        },
      };

      return res;
    },
  }));

const TimeSeriesRegionModel = types.compose(
  "TimeSeriesRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  AnnotationMixin,
  Model,
);

Registry.addTag("timeseriesregion", TimeSeriesRegionModel, () => {});
Registry.addRegionType(TimeSeriesRegionModel, "timeseries");

export { TimeSeriesRegionModel };
