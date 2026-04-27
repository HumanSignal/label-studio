import { isAlive, types } from "mobx-state-tree";

import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { VideoModel } from "../tags/object/Video/Video";
import { isDefined } from "../utils/utilities";
import { EditableRegion } from "./EditableRegion";

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

/**
 * TimelineRegion, a region on the video timeline.
 * @see Timeline/Views/Frames#onFrameScrub() - this method creates a region by drawing on the timeline
 */
const Model = types
  .model("TimelineRegionModel", {
    type: "timelineregion",
    object: types.late(() => types.reference(VideoModel)),

    ranges: types.array(TimelineRange),
  })
  .volatile(() => ({
    hideable: true,
    editableFields: [
      { property: "start", label: "Start frame" },
      { property: "end", label: "End frame" },
    ],
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

    onSelectInOutliner() {
      // skip video to the first frame of this region
      // @todo hidden/disabled timespans?
      self.object.setFrame(self.ranges[0].start);
    },

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
    isInLifespan(_targetFrame) {
      return true;
    },
    /**
     * Set range for the region, only one frame for now,
     * could be extended to multiple frames in a future in a form of (...ranges)
     * @param {number[]} [start, end] Start and end frames
     * @param {Object} [options]
     * @param {"new" | "edit" | undefined} [options.mode] Do we dynamically change the region ("new" one or "edit" existing one) or just edit it precisely (undefined)?
     *        In first two cases we need to update undo history only once
     */
    setRange([start, end], { mode } = {}) {
      if (self.locked) return;
      if (mode === "new") {
        // we need to update existing history item while drawing a new region
        self.parent.annotation.history.setReplaceNextUndoState();
      } else if (mode === "edit") {
        // we need to skip updating history item while editing existing region and record the state when we finish editing
        /** @see Video#finishDrawing() */
        self.parent.annotation.history.setSkipNextUndoState();
      }
      self.ranges = [{ start, end }];
    },
  }));

const TimelineRegionModel = types.compose(
  "TimelineRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  EditableRegion,
  Model,
);

Registry.addRegionType(TimelineRegionModel, "video");

export { TimelineRegionModel };
