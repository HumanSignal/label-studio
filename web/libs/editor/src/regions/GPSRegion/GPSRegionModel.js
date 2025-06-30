import { types } from "mobx-state-tree";
import Utils from "../../utils";
import Constants from "../../core/Constants";
import { clamp } from "../../utils/utilities";
import { FF_TIMESERIES_SYNC, isFF } from "../../utils/feature-flags";

export const GPSRegionModel = types
  .model("GPSRegionModel", {
    type: "gpsregion",
    object: types.late(() => {
      const { GPSMapModel } = require("../../tags/object/GPSMap/model");
      return types.reference(GPSMapModel);
    }),
    start: types.number,
    end: types.number,
    channel: types.optional(types.number, 0), // Keeping channel for symmetry

    selectedregionbg: types.optional(types.string, "rgba(0, 0, 0, 0.5)"),
  })
  .volatile(() => ({
    hideable: true,
    _ws_region: null,
  }))
  .views((self) => ({
    get bboxTriggers() {
      return [
        self.start,
        self.end,
        self._ws_region,
        self.object?._ws,
        self.object?._ws?.container,
        self.object?._waveformVisibleTimeStart, // Observable property
        self.object?._waveformZoom, // Observable property
        self.object?.shouldShowRelations, // Hide relations when no waveforms are visible
      ];
    },

    get bboxCoordsCanvas() {
      if (!self.bboxTriggers) {
        return null;
      }

      // Hide relations if no waveforms are showing
      if (!self.object?.shouldShowRelations) {
        return null;
      }

      const { _ws_region } = self;
      if (!_ws_region) return null;
      if (!_ws_region.inViewport) return null;

      const { xStart, xEnd, yStart, yEnd } = _ws_region;
      const waveform = self.object?._ws;
      if (!waveform) return null;

      return {
        left: clamp(xStart, 0, waveform.width),
        top: yStart,
        right: clamp(xEnd, 0, waveform.width),
        bottom: yEnd,
      };
    },

    getRegionElement() {
      return self.wsRegionElement(self._ws_region);
    },

    wsRegionElement(wsRegion) {
      if (!wsRegion) return null;

      // For canvas-based GPS regions, create a fake DOM element
      // that represents the screen position of the segment
      const bbox = self.bboxCoordsCanvas;
      if (!bbox) return null;

      // Create a fake element that mimics getBoundingClientRect()
      const fakeElement = {
        getBoundingClientRect() {
          const waveform = self.object?._ws;
          if (!waveform?.container) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };

          const containerRect = waveform.container.getBoundingClientRect();

          return {
            left: containerRect.left + bbox.left,
            top: containerRect.top + bbox.top,
            right: containerRect.left + bbox.right,
            bottom: containerRect.top + bbox.bottom,
            width: bbox.right - bbox.left,
            height: bbox.bottom - bbox.top,
            x: containerRect.left + bbox.left,
            y: containerRect.top + bbox.top,
          };
        },
      };

      return fakeElement;
    },

    wsRegionOptions() {
      const reg = {
        id: self.id,
        start: self.start,
        end: self.end,
        color: self.getColor(),
        visible: !self.hidden,
        updateable: !self.isReadOnly(),
        deletable: !self.isReadOnly(),
        channel: self.channel ?? 0,
      };

      return reg;
    },
  }))
  .actions((self) => {
    const Super = {
      setProperty: self.setProperty,
      setLocked: self.setLocked,
    };

    return {
      /**
       * @returns {GPSRegionResult} // Changed return type comment for clarity
       */
      serialize() {
        // Adjusting serialization to be symmetric with Audio model's output structure.
        // GPS doesn't have original_length.
        const res = {
          // original_length: self.object._ws?.duration, // Not applicable for GPS
          value: {
            start: self.start,
            end: self.end,
            channel: self.channel,
          },
        };

        return res;
      },

      getColor(alpha = 1) {
        // Assuming getOneColor is a method from a mixin that provides the base color
        return Utils.Colors.convertToRGBA(self.getOneColor(), alpha);
      },

      updateColor(alpha = 1) {
        const color = self.getColor(alpha);
        self._ws_region?.updateColor(color); // Assumes _ws_region has updateColor
      },

      updatePosition(start, end) {
        // Assumes _ws_region has updatePosition
        self._ws_region?.updatePosition(start ?? self.start, end ?? self.end);
      },

      /**
       * Select GPS region
       */
      selectRegion() {
        if (!self._ws_region) return;
        // Assumes _ws_region has these methods, mirroring AudioUltra
        self._ws_region.handleSelected(true);
        self._ws_region.bringToFront();
        // When region is selected from sidebar, also seek to the region's start time
        self.onSelectInOutliner();

        // Emit sync event to update all synced components (TimeSeries, Audio, etc.)
        if (isFF(FF_TIMESERIES_SYNC) && self.object.sync) {
          const regionStartTime = self.start;
          // GPS time is already in seconds, so just use it directly
          self.object.syncSend({ time: regionStartTime, playing: false }, "seek");
        }
      },

      deleteRegion() {
        // Mirroring AudioUltra
        self.annotation.deleteRegion(self);
      },

      /**
       * Unselect GPS region
       */
      afterUnselectRegion() {
        if (!self._ws_region) return;
        // Assumes _ws_region has handleSelected
        self._ws_region.handleSelected(false);
      },

      /**
       * Called when region is selected from the sidebar/outliner
       * This will jump the playhead to the region start time
       */
      onSelectInOutliner() {
        if (!self._ws_region) return;
        // Jump to region start when selected from sidebar
        self._ws_region.scrollToRegion();
        // Also set the current time to the region start
        self.object.seek(self.start);
      },

      setHighlight(val) {
        self._highlighted = val;
        if (!self._ws_region) return;
        // Assumes _ws_region has handleHighlighted
        self._ws_region.handleHighlighted(val);
      },

      beforeDestroy() {
        if (self._ws_region) self._ws_region.remove();
      },

      setLocked(locked) {
        Super.setLocked(locked); // Call mixin's setLocked

        if (self._ws_region) {
          // Assumes _ws_region has setLocked
          self._ws_region.setLocked(self.locked);
        }
      },

      onMouseOver() {
        if (self.annotation.isLinkingMode) {
          self.setHighlight(true);
          // Assumes _ws_region has switchCursor
          self._ws_region?.switchCursor(Constants.LINKING_MODE_CURSOR);
        }
      },

      onMouseLeave() {
        if (self.annotation.isLinkingMode) {
          self.setHighlight(false);
          // Assumes _ws_region has switchCursor
          self._ws_region?.switchCursor(Constants.MOVE_CURSOR);
        }
      },

      onUpdateEnd() {
        if (!self._ws_region) return;
        self.start = self._ws_region.start;
        self.end = self._ws_region.end;
        // self.channel = self._ws_region.channelIdx ?? 0; // Assuming channelIdx exists on ws_region if needed
        // notifyDrawingFinished is typically called by AreaMixin or similar
        self.notifyDrawingFinished();
      },

      toggleHidden(e) {
        e?.stopPropagation();
        self.hidden = !self.hidden;

        if (!self._ws_region) return;
        // Assumes _ws_region has setVisibility
        self._ws_region.setVisibility(!self.hidden);
      },

      setProperty(propName, value) {
        Super.setProperty(propName, value); // Call mixin's setProperty
        if (["start", "end"].includes(propName)) {
          self.updatePosition();
        }
      },

      setWSRegion(wsRegion) {
        self._ws_region = wsRegion;
        if (wsRegion) {
          wsRegion.on("mouseOver", self.onMouseOver);
          wsRegion.on("mouseLeave", self.onMouseLeave);
          // onClick is handled by the waveform instance if needed
        }
      },
      // Removed notifyDrawingFinished and onClickRegion as separate actions here
      // notifyDrawingFinished is called from onUpdateEnd or by AreaMixin
      // onClickRegion is usually part of AreaMixin or handled by the view/waveform interactions
    };
  });
