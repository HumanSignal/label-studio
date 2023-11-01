import { types } from 'mobx-state-tree';
import { AudioModel } from '../../tags/object/AudioNext';
import Utils from '../../utils';
import Constants from '../../core/Constants';

export const AudioUltraRegionModel = types
  .model('AudioUltraRegionModel', {
    type: 'audioregion',
    object: types.late(() => types.reference(AudioModel)),

    start: types.number,
    end: types.number,
    channel: types.optional(types.number, 0),

    selectedregionbg: types.optional(types.string, 'rgba(0, 0, 0, 0.5)'),
  })
  .volatile(() => ({
    hideable: true,
  }))
  .views(self => ({
    wsRegionOptions() {

      const reg = {
        id: self.id,
        start: self.start,
        end: self.end,
        color: self.getColor(),
        visible: !self.hidden,
        updateable: !self.readonly,
        deletable: !self.readonly,
        channel: self.channel ?? 0,
      };

      return reg;
    },
  }))
  .actions(self => {
    /**
     * @returns {AudioRegionResult}
     */
    const Super = {
      setProperty: self.setProperty,
      setLocked: self.setLocked,
    };

    return {
      serialize() {
        const res = {
          original_length: self.object._ws?.duration,
          value: {
            start: self.start,
            end: self.end,
            channel: self.channel,
          },
        };

        return res;
      },

      getColor(alpha = 1) {
        return Utils.Colors.convertToRGBA(self.getOneColor(), alpha);
      },

      updateColor(alpha = 1) {
        const color = self.getColor(alpha);

        self._ws_region?.updateColor(color);
      },

      updatePosition(start, end) {
        self._ws_region?.updatePosition(start ?? self.start, end ?? self.end);
      },

      /**
       * Select audio region
       */
      selectRegion() {
        if (!self._ws_region) return;
        self._ws_region.handleSelected(true);
        self._ws_region.bringToFront();
        self._ws_region.scrollToRegion();
      },

      deleteRegion() {
        self.annotation.deleteRegion(self);
      },

      /**
       * Unselect audio region
       */
      afterUnselectRegion() {
        if (!self._ws_region) return;
        self._ws_region.handleSelected(false);
      },

      setHighlight(val) {
        self._highlighted = val;

        if (!self._ws_region) return;
        self._ws_region.handleHighlighted(val);
      },

      beforeDestroy() {
        if (self._ws_region) self._ws_region.remove();
      },

      setLocked(locked) {
        Super.setLocked(locked);

        if(self._ws_region) self._ws_region.setLocked(self.locked);
      },

      onMouseOver() {
        if (self.annotation.relationMode) {
          self.setHighlight(true);
          self._ws_region.switchCursor(Constants.RELATION_MODE_CURSOR);
        }
      },

      onMouseLeave() {
        if (self.annotation.relationMode) {
          self.setHighlight(false);
          self._ws_region.switchCursor(Constants.MOVE_CURSOR);
        }
      },

      onUpdateEnd() {
        self.start = self._ws_region.start;
        self.end = self._ws_region.end;
        self.notifyDrawingFinished();
      },

      toggleHidden(e) {
        e?.stopPropagation();
        self.hidden = !self.hidden;

        if (!self._ws_region) return;
        self._ws_region.setVisibility(!self.hidden);
      },

      setProperty(propName, value) {
        Super.setProperty(propName, value);
        if (['start', 'end'].includes(propName)) {
          self.updatePosition();
        }
      },
    };
  });
