import { isAlive, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { VideoModel } from "../tags/object/Video/Video";
import { isDefined } from "../utils/utilities";

const TimelineRange = types.model("TimelineRange", {
  start: types.maybeNull(types.integer),
  end: types.maybeNull(types.integer),
});

// convert range to internal video timeline format
function rangeToSequence(range) {
  const { start, end } = range;

  if (!isDefined(start)) {
    if (!isDefined(end)) return [];
    return { frame: end, enabled: false };
  }
  if (!isDefined(end)) {
    return { frame: start, enabled: true };
  }
  if (start === end) {
    return { frame: start, enabled: false };
  }
  return [
    {
      frame: start,
      enabled: true,
    },
    {
      frame: end,
      enabled: false,
    },
  ];
}

const Model = types
  .model("TimelineRegionModel", {
    type: "timelineregion",
    object: types.late(() => types.reference(VideoModel)),

    ranges: types.array(TimelineRange),
  })
  .volatile(() => ({
    hideable: true,
  }))
  .views((self) => ({
    get parent() {
      return isAlive(self) ? self.object : null;
    },
    get sequence() {
      return self.ranges.map(rangeToSequence).flat();
    },
    getShape() {
      return null;
    },
  }))
  .actions((self) => ({
    /**
     * @example
     * {
     *   "value": {
     *     "ranges": [{"start": 3, "end": 5}],
     *     "timelinelabels": ["Moving"]
     *   }
     * }
     * @typedef {Object} TimelineRegionResult
     * @property {Object} value
     * @property {object[]} value.ranges Array of ranges, each range is an object with `start` and `end` properties. One range per region.
     * @property {string[]} [value.timelinelabels] Regions are created by `TimelineLabels`, and the corresponding label is listed here.
     */

    /**
     * @return {TimelineRegionResult}
     */
    serialize() {
      return {
        value: {
          ranges: self.ranges,
        },
      };
    },
    isInLifespan(targetFrame) {
      return true;
    },
    // it uses sequence to be compatible with internal video timeline regions format
    setSequence(sequence) {
      const [start, end] = sequence;

      self.parent.annotation.history.setReplaceNextUndoState();
      self.ranges = [{ start: start.frame, end: end.frame }];
    },
  }));

const TimelineRegionModel = types.compose(
  "TimelineRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(TimelineRegionModel, "video");

export { TimelineRegionModel };
