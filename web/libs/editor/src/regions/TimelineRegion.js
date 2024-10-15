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
// it's used in `flatMap()`, so it can return both object and array of objects
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
      return self.ranges.flatMap(rangeToSequence);
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
    /**
     * Set ranges for the region, for now only one frame,
     * could be extended to multiple frames in a future in a form of (...ranges)
     * @param {number[]} [start, end] Start and end frames
     */
    setRanges([start, end]) {
      // we need only one item in undo history, so we'll update current one during drawing
      self.parent.annotation.history.setReplaceNextUndoState();
      self.ranges = [{ start, end }];
    },
  }));

const TimelineRegionModel = types.compose("TimelineRegionModel", RegionsMixin, AreaMixin, NormalizationMixin, Model);

Registry.addRegionType(TimelineRegionModel, "video");

export { TimelineRegionModel };
