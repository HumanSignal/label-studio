import { tryReference, types } from 'mobx-state-tree';
import * as xpath from 'xpath-range';
import Registry from '../core/Registry';
import { AreaMixin } from '../mixins/AreaMixin';
import { HighlightMixin } from '../mixins/HighlightMixin';
import NormalizationMixin from '../mixins/Normalization';
import RegionsMixin from '../mixins/Regions';
import { RichTextModel } from '../tags/object/RichText/model';
import { findRangeNative, rangeToGlobalOffset } from '../utils/selection-tools';
import { isDefined } from '../utils/utilities';
import { FF_LSDV_4620_3, isFF } from '../utils/feature-flags';

const GlobalOffsets = types.model('GlobalOffset', {
  start: types.number,
  end: types.number,
  // distinguish loaded globalOffsets from user's annotation and internally calculated one;
  // we should rely only on calculated offsets to find ranges, see initRangeAndOffsets();
  // it should be in the model to avoid reinit on undo/redo.
  calculated: false,
}).views(self => ({
  get serialized() {
    // should never get to serialized result
    return { start: self.start, end: self.end };
  },
}));

const Model = types
  .model('RichTextRegionModel', {
    type: 'richtextregion',
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
    cachedRange: null,
  }))
  .views(self => ({
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
  .actions(self => ({
    beforeDestroy() {
      try {
        self.removeHighlight();
      } catch (e) {
        console.warn(e);
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
          if (isFF(FF_LSDV_4620_3)) {
            const xpathRange = self.parent.globalOffsetsToRelativeOffsets(self.globalOffsets);

            Object.assign(res.value, {
              ...xpathRange,
              globalOffsets: self.globalOffsets.serialized,
            });
          } else {
            // Calculate proper XPath right before serialization
            const root = self._getRootNode(true);
            const range = findRangeNative(
              self.globalOffsets.start,
              self.globalOffsets.end,
              root,
            );

            if (!range) throw new Error;

            const xpathRange = xpath.fromRange(range, root);

            Object.assign(res.value, {
              ...xpathRange,
              globalOffsets: self.globalOffsets.serialized,
            });
          }
        } catch (e) {
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

      if (self.object.savetextresult === 'yes' && isDefined(self.text)) {
        res.value['text'] = self.text;
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

    getRangeToHighlight() {
      const root = self._getRootNode();

      if (!root || !self.globalOffsets) return undefined;

      const rangeIsMissing = !self.cachedRange
        || self.cachedRange.collapsed
        // if this range is in detached iframe it'll look like a good one, check this
        || !self.cachedRange.startContainer?.ownerDocument?.defaultView;

      if (rangeIsMissing) {
        const { start, end } = self.globalOffsets;

        self.cachedRange = findRangeNative(start, end, root);
      }

      return self.cachedRange;
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

      const root = self._getRootNode();
      let range;

      // 0. Text regions are simple — just get range by offsets
      if (self.isText) {
        const { startOffset: start, endOffset: end } = self;

        self.globalOffsets = { start, end, calculated: true };
        if (!isFF(FF_LSDV_4620_3)) {
          self.cachedRange = findRangeNative(start, end, root);
        }
        return;
      }

      if (isFF(FF_LSDV_4620_3)) {

        // 1. first try to find range by xpath in the original layout
        
        const offsets = self.parent.relativeOffsetsToGlobalOffsets(self.start, self.startOffset, self.end, self.endOffset);

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
      } else {

        // 1. first try to find range by xpath in original document
        range = self._getRange({ useOriginalContent: true });

        if (range) {
        // we need this range in the visible document, so find it by global offsets
          const originalRoot = self._getRootNode(true);
          const [start, end] = rangeToGlobalOffset(range, originalRoot);

          self.globalOffsets = { start, end, calculated: true };
          self.cachedRange = findRangeNative(start, end, root);

          return;
        }

        // 2. then try to find range on visible document
        // that's for old buggy annotations created over dirty document state
        range = self._getRange({ useOriginalContent: false });

        if (range) {
          const [start, end] = rangeToGlobalOffset(range, root);

          self.globalOffsets = { start, end, calculated: true };
          self.cachedRange = range;

          return;
        }

        // 3. if xpaths are broken use globalOffsets if given
        if (self.globalOffsets && isDefined(root)) {
          const { start, end } = self.globalOffsets;

          self.cachedRange = findRangeNative(start, end, root);

          if (self.cachedRange) {
            self._fixXPaths(self.cachedRange, root);
            self.globalOffsets.calculated = true;
          }

          return;
        }
      }

      // 4. out of options — region is broken
      // @todo show error in console and regions list
      return undefined;
    },

    // fix XPaths when we found region by globalOffsets
    _fixXPaths(range, root) {
      const normedRange = xpath.fromRange(range, root);

      if (!isDefined(normedRange)) return;

      self.start = normedRange.start;
      self.end = normedRange.end;
      self.startOffset = normedRange.startOffset;
      self.endOffset = normedRange.endOffset;
    },

    _setXPaths(value) {
      self.start = value.start;
      self.end = value.end;
      self.startOffset = value.startOffset;
      self.endOffset = value.endOffset;
    },

    _getRange({ useOriginalContent = false, useCache = true } = {}) {
      const rootNode = self._getRootNode(useOriginalContent);
      const hasCache = isDefined(self._cachedRange) && !useOriginalContent && useCache;
      const rootNodeExists = hasCache && (rootNode && !rootNode.contains(self._cachedRange.commonAncestorContainer));

      if (hasCache === false || rootNodeExists) {
        const foundRange = self._createNativeRange(useOriginalContent);

        // Skip cache for original content tag
        if (useOriginalContent || useCache === false) return foundRange;

        return (self._cachedRange = foundRange);
      }

      return self._cachedRange;
    },

    _getRootNode(originalContent = false) {
      const parent = self.parent;
      let ref;

      if (isFF(FF_LSDV_4620_3)) ref = parent.visibleNodeRef;
      else if (originalContent) ref = parent.originalContentRef;
      else if (parent.useWorkingNode) ref = parent.workingNodeRef;
      else ref = parent.visibleNodeRef;

      const node = ref.current;

      return node?.contentDocument?.body ?? node;
    },

    _createNativeRange(useOriginalContent = false) {
      const rootNode = self._getRootNode(useOriginalContent);

      if (rootNode === undefined) return undefined;

      const { start, startOffset, end, endOffset } = self;

      try {
        return xpath.toRange(start, startOffset, end, endOffset, rootNode);
      } catch (err) {
        // actually this happens when regions cannot be located by xpath for some reason
        console.warn('can\'t locate xpath', { start, end }, err);
      }

      return undefined;
    },
  }));

const RichTextRegionModel = types.compose(
  'RichTextRegionModel',
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  Model,
  HighlightMixin,
);

Registry.addRegionType(RichTextRegionModel, 'text');
Registry.addRegionType(RichTextRegionModel, 'hypertext');
Registry.addRegionType(RichTextRegionModel, 'richtext');

export { RichTextRegionModel };
