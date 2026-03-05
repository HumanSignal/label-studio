import { getEnv, getParent, getRoot, getType, types } from "mobx-state-tree";
import { guidGenerator } from "../core/Helpers";
import { isDefined } from "../utils/utilities";
import { AnnotationMixin } from "./AnnotationMixin";
import { ReadOnlyRegionMixin } from "./ReadOnlyMixin";

const RegionsMixin = types
  .model({
    // id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),

    score: types.maybeNull(types.number),

    filtered: types.optional(types.boolean, false),

    parentID: types.optional(types.string, ""),

    fromSuggestion: false,

    // Dynamic preannotations enabled
    dynamic: false,

    origin: types.optional(types.enumeration(["prediction", "prediction-changed", "manual"]), "manual"),

    item_index: types.maybeNull(types.number),
  })
  .volatile(() => ({
    // selected: false,
    _highlighted: false,
    hidden: false,
    locked: false,
    isDrawing: false,
    perRegionFocusRequest: null,
    shapeRef: null,
    drawingTimeout: null,
    hideable: true,
  }))
  .views((self) => ({
    get perRegionStates() {
      const states = self.states;

      return states && states.filter((s) => s.perregion === true);
    },

    get store() {
      return getRoot(self);
    },

    get parent() {
      return getParent(self);
    },

    get editable() {
      throw new Error("Not implemented");
    },

    get isCompleted() {
      return !self.isDrawing;
    },

    get highlighted() {
      return self._highlighted;
    },

    get inSelection() {
      return self.annotation?.regionStore.isSelected(self);
    },

    get isReady() {
      return true;
    },

    get currentImageEntity() {
      return self.parent.findImageEntity(self.item_index ?? 0);
    },

    getConnectedDynamicRegions(excludeSelf) {
      const { regions = [] } = getRoot(self).annotationStore?.selected || {};
      const { type, labelName } = self;

      const result = regions.filter((region) => {
        if (excludeSelf && region === self) return false;
        const canBePartOfNotification = self.supportSuggestions ? self.dynamic : true;

        return (
          canBePartOfNotification &&
          region.type === type &&
          region.labelName === labelName &&
          region.results?.[0]?.to_name === self.results?.[0]?.to_name
        );
      });

      return result;
    },

    // Indicates that it is not temporary region created just to display data like Textarea's one
    // and is not a suggestion
    get isRealRegion() {
      return self.annotation?.areas?.has(self.id);
    },

    get shouldNotifyDrawingFinished() {
      // extra calls on destroying will be skipped
      // @see beforeDestroy action
      if (!self.isRealRegion) return false;
      if (self.annotation.isSuggestionsAccepting) return false;
      // There are two modes:
      // If object tag support suggestions - the region should be marked as a dynamic one to make notifications
      // If object tag doesn't support suggestions - every region works as dynamic with auto suggestions
      const canBeReasonOfNotification = self.supportSuggestions ? self.dynamic && !self.fromSuggestion : true;

      const isSmartEnabled = self.results.some((r) => r.from_name.smartEnabled);

      return isSmartEnabled && canBeReasonOfNotification;
    },
  }))
  .actions((self) => {
    return {
      setParentID(id) {
        self.parentID = id;
      },

      setDrawing(val) {
        self.isDrawing = val;
      },

      setShapeRef(ref) {
        if (!ref) return;
        self.shapeRef = ref;
      },

      setItemIndex(index) {
        if (!isDefined(index)) throw new Error("Index must be provided for", self);
        self.item_index = index;
      },

      beforeDestroy() {
        // beforeDestroy may be called by accident for Textarea and etc. as part of updateObjects action
        // in that case the region already has no results

        // The other bad behaviour is that beforeDestroy may be called on accepting suggestions 'cause they are deleting in that case

        // So if you see this bad thing during debugging - now you know why
        // and why we need this check
        if (self.isRealRegion) {
          return self.beforeDestroyArea();
        }
      },

      beforeDestroyArea() {
        self.notifyDrawingFinished({ destroy: true });
      },

      setLocked(locked) {
        if (locked instanceof Function) {
          self.locked = locked(self.locked);
        } else {
          self.locked = locked;
        }
      },

      makeDynamic() {
        self.dynamic = true;
      },

      // update region appearence based on it's current states, for
      // example bbox needs to update its colors when you change the
      // label, becuase it takes color from the label
      updateAppearenceFromState() {},

      serialize() {
        console.error("Region class needs to implement serialize");
      },

      /** @abstract */
      selectRegion() {},

      /** @abstract */
      afterUnselectRegion() {},

      onClickRegion(ev) {
        const annotation = self.annotation;

        if (!self.isReadOnly() && (self.isDrawing || annotation.isDrawing)) return;

        if (!self.isReadOnly() && annotation.isLinkingMode) {
          annotation.addLinkedRegion(self);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
        } else {
          self._selectArea(ev?.ctrlKey || ev?.metaKey);
        }
      },

      _selectArea(additiveMode = false) {
        this.cancelPerRegionFocus();
        const annotation = self.annotation;

        if (additiveMode) {
          annotation.toggleRegionSelection(self);
        } else {
          const wasNotSelected = !self.selected;

          if (wasNotSelected) {
            annotation.selectArea(self);
          } else {
            annotation.unselectAll();
          }
        }
      },

      requestPerRegionFocus() {
        self.perRegionFocusRequest = Date.now();
      },

      cancelPerRegionFocus() {
        self.perRegionFocusRequest = null;
      },

      setHighlight(val) {
        self._highlighted = val;
      },

      toggleHighlight() {
        self.setHighlight(!self._highlighted);
      },

      toggleFiltered(e) {
        self.filtered = !self.filtered;
        self.toggleHidden(e, true);
        e && e.stopPropagation();
      },

      toggleHidden(e, isFiltered = false) {
        if (!isFiltered) self.filtered = false;
        self.hidden = !self.hidden;
        e && e.stopPropagation();
      },

      updateOriginOnEdit() {
        if (self.origin === "prediction") {
          self.origin = "prediction-changed";
        }
      },

      notifyDrawingFinished({ destroy = false } = {}) {
        self.updateOriginOnEdit();

        // everything below is related to dynamic preannotations
        if (!self.shouldNotifyDrawingFinished) return;

        clearTimeout(self.drawingTimeout);

        if (self.isDrawing === false) {
          const timeout = getType(self).name.match(/brush/i) ? 1200 : 0;
          const env = getEnv(self);

          self.drawingTimeout = setTimeout(() => {
            const connectedRegions = self.getConnectedDynamicRegions(destroy);

            env.events.invoke("regionFinishedDrawing", self, connectedRegions);
          }, timeout);
        }
      },
    };
  });

export default types.compose(RegionsMixin, ReadOnlyRegionMixin, AnnotationMixin);
