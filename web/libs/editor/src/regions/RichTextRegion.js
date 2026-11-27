import { tryReference, types } from "mobx-state-tree";
import Registry from "../core/Registry";
import { AreaMixin } from "../mixins/AreaMixin";
import { HighlightMixin } from "../mixins/HighlightMixin";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import { RichTextModel } from "../tags/object/RichText/model";
import { isDefined } from "../utils/utilities";

const GlobalOffsets = types
  .model("GlobalOffset", {
    start: types.number,
    end: types.number,
    // distinguish loaded globalOffsets from user's annotation and internally calculated one;
    // we should rely only on calculated offsets to find ranges, see initRangeAndOffsets();
    // it should be in the model to avoid reinit on undo/redo.
    calculated: false,
  })
  .views((self) => ({
    get serialized() {
      // should never get to serialized result
      return { start: self.start, end: self.end };
    },
  }));

const Model = types
  .model("RichTextRegionModel", {
    type: "richtextregion",
    object: types.late(() => types.reference(RichTextModel)),

    startOffset: types.integer,
    endOffset: types.integer,
    start: types.string,
    end: types.string,
    text: types.maybeNull(types.string),
    isText: types.optional(types.boolean, false),
    globalOffsets: types.maybeNull(GlobalOffsets),
  })
  .volatile(() => ({
    hideable: true,
  }))
  .views((self) => ({
    get parent() {
      return tryReference(() => self.object);
    },
    getRegionElement() {
      return self._spans?.[0];
    },
    get displayValue() {
      return self.text;
    },
  }))
  .actions((self) => ({
    beforeDestroy() {
      try {
        self.removeHighlight();
      } catch (e) {
        console.warn(e);
      }
    },

    /**
     * Applies additional data from the given result.
     * In the results we have almost all data meaningful stored in value but in regions we have two places for it:
     * - region itself (fields in model)
     * - related results (in results array)
     * so for some fields we should control more if we want to apply fields that could be in both places into the region.
     * This method also helps to avoid region type detection at the deserialization stage.
     *
     * @param {Object} result - The result object containing additional data.
     * @returns {void}
     */
    applyAdditionalDataFromResult(result) {
      const isMainResult = result?.type?.endsWith("labels");
      const hasText = isDefined(result?.value?.text);

      if (isMainResult && hasText) {
        self.text = result.value.text;
      }
    },

    serialize() {
      const res = {
        value: {},
      };

      if (self.isText) {
        Object.assign(res.value, {
          start: self.startOffset,
          end: self.endOffset,
        });
      } else {
        try {
          const xpathRange = self.parent.globalOffsetsToRelativeOffsets(self.globalOffsets);

          Object.assign(res.value, {
            ...xpathRange,
            globalOffsets: self.globalOffsets.serialized,
          });
        } catch (_e) {
          // regions may be broken, so they don't have globalOffsets
          // or they can't be applied on current html, so just keep them untouched
          const { start, end, startOffset, endOffset } = self;

          Object.assign(res.value, { start, end, startOffset, endOffset });

          if (self.globalOffsets) {
            Object.assign(res.value, {
              globalOffsets: self.globalOffsets.serialized,
            });
          }
        }
      }

      if (self.object.savetextresult === "yes" && isDefined(self.text)) {
        res.value.text = self.text;
      }

      return res;
    },

    // text regions have only start/end, so we should update start/endOffsets with these values
    updateTextOffsets(startOffset, endOffset) {
      Object.assign(self, { startOffset, endOffset });
    },

    updateGlobalOffsets(start, end) {
      self.globalOffsets = GlobalOffsets.create({
        start,
        end,
        calculated: true,
      });
    },

    updateXPathsFromGlobalOffsets() {
      const xPathRange = self.parent.globalOffsetsToRelativeOffsets(self.globalOffsets);

      if (xPathRange) {
        self._setXPaths(xPathRange);
      }
    },

    /**
     * Main method to detect HTML range and its offsets for LSF region
     * globalOffsets are used for:
     * - internal use (get ranges to highlight quickly)
     * - end users convenience
     * - for emergencies (xpath invalid)
     */
    initRangeAndOffsets() {
      if (self.globalOffsets?.calculated) return;

      // 0. Text regions are simple — just get range by offsets
      if (self.isText) {
        const { startOffset: start, endOffset: end } = self;

        self.globalOffsets = { start, end, calculated: true };
        return;
      }

      // 1. first try to find range by xpath in the original layout

      const offsets = self.parent.relativeOffsetsToGlobalOffsets(
        self.start,
        self.startOffset,
        self.end,
        self.endOffset,
      );

      if (offsets) {
        const [start, end] = offsets;

        self.globalOffsets = { start, end, calculated: true };
        return;
      }

      // 2. then try to find range on dynamically changed document
      // @todo or not todo?

      // 3. if xpaths are broken use globalOffsets if given
      if (self.globalOffsets) {
        self.updateXPathsFromGlobalOffsets();

        return;
      }

      // 4. out of options — region is broken
      // @todo show error in console and regions list
      return undefined;
    },

    _setXPaths(value) {
      self.start = value.start;
      self.end = value.end;
      self.startOffset = value.startOffset;
      self.endOffset = value.endOffset;
    },
  }));

const RichTextRegionModel = types.compose(
  "RichTextRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  Model,
  HighlightMixin,
);

Registry.addRegionType(RichTextRegionModel, "text");
Registry.addRegionType(RichTextRegionModel, "hypertext");
Registry.addRegionType(RichTextRegionModel, "richtext");

export { RichTextRegionModel };
