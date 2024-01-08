import { getRoot, types } from 'mobx-state-tree';
import { AudioModel } from '../../tags/object/AudioNext';
import Utils from '../../utils';
import Constants from '../../core/Constants';

export const AudioRegionModel = types
  .model('AudioRegionModel', {
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
    getRegionElement() {
      return self.wsRegionElement(self._ws_region);
    },

    wsRegionElement(wsRegion) {
      if (!wsRegion) return null;

      const elID = wsRegion.id;
      const el = document.querySelector(`[data-id="${elID}"]`);

      return el;
    },

    get wsRegionOptions() {
      const reg = {
        id: self.id,
        start: self.start,
        end: self.end,
        channel: self.channel,
        color: 'orange',
      };

      if (self.readonly) {
        reg.drag = false;
        reg.resize = false;
      }
      return reg;
    },
  }))
  .actions(self => ({
    /**
     * @returns {AudioRegionResult}
     */
    serialize() {
      const res = {
        original_length: self.object._ws?.getDuration(),
        value: {
          start: self.start,
          end: self.end,
          channel: self.channel,
        },
      };

      return res;
    },

    updateColor(alpha = 1) {
      const color = Utils.Colors.convertToRGBA(self.getOneColor(), alpha);
      // eslint-disable-next-line no-unused-expressions

      try {
        self._ws_region?.update({ color });
      } catch {
        /**
         * Sometimes this method is called too soon in the new UI so it fails.
         * Will be good on the next execution
         * */
      }
    },

    updateAppearenceFromState() {
      if (self._ws_region?.update) {
        self._ws_region.start = self.start;
        self._ws_region.end = self.end;
        self.applyCSSClass(self._ws_region);
      }
    },

    applyCSSClass(wsRegion) {
      self.updateColor(0.3);

      const settings = getRoot(self).settings;
      const el = self.wsRegionElement(wsRegion);

      if (!el) return;

      const lastClassList = el.className.split(' ');

      for (const obj in lastClassList) {
        if (lastClassList[obj].indexOf('htx-label') >= 0) {
          lastClassList.splice(obj, 1);
        }
      }

      const classes = [...new Set([...lastClassList, 'htx-highlight', 'htx-highlight-last'])];

      if (!self.parent.showlabels && !settings.showLabels) {
        classes.push('htx-no-label');
      } else {
        const cssCls = Utils.HTML.labelWithCSS(el, {
          labels: self.labeling?.mainValue,
          score: self.score,
        });

        classes.push(cssCls);
      }

      el.className = classes.filter(Boolean).join(' ');
    },

    /**
     * Select audio region
     */
    selectRegion() {
      self.updateColor(0.8);

      const el = self.wsRegionElement(self._ws_region);

      if (el) {
        // scroll object tag but don't scroll the document
        const container = window.document.scrollingElement;
        const top = container.scrollTop;
        const left = container.scrollLeft;

        el.scrollIntoViewIfNeeded ? el.scrollIntoViewIfNeeded() : el.scrollIntoView();
        window.document.scrollingElement.scrollTo(left, top);
      }
    },

    /**
     * Unselect audio region
     */
    afterUnselectRegion() {
      self.updateColor(0.3);
    },

    setHighlight(val) {
      self._highlighted = val;

      if (!self._ws_region) return;

      if (val) {
        self.updateColor(0.8);
        self._ws_region.element.style.border = Constants.HIGHLIGHTED_CSS_BORDER;
      } else {
        self.updateColor(0.3);
        self._ws_region.element.style.border = 'none';
      }
    },

    beforeDestroy() {
      if (self._ws_region) self._ws_region.remove();
    },

    setLocked(locked) {
      if (locked instanceof Function) {
        self.locked = locked(self.locked);
      } else {
        self.locked = locked;
      }

      if (self._ws_region) {
        self._ws_region.drag = !self.locked;
        self._ws_region.resize = !self.locked;
      }
    },

    onClick(wavesurfer, ev) {
      // if (! self.editable) return;

      if (!self.annotation.relationMode) {
        // Object.values(wavesurfer.regions.list).forEach(r => {
        //   // r.update({ color: self.selectedregionbg });
        // });

        self._ws_region.update({ color: Utils.Colors.rgbaChangeAlpha(self.selectedregionbg, 0.8) });
      }

      self.onClickRegion(ev);
    },

    onMouseOver() {
      if (self.annotation.relationMode) {
        self.setHighlight(true);
        self._ws_region.element.style.cursor = Constants.RELATION_MODE_CURSOR;
      }
    },

    onMouseLeave() {
      if (self.annotation.relationMode) {
        self.setHighlight(false);
        self._ws_region.element.style.cursor = Constants.MOVE_CURSOR;
      }
    },

    onUpdateEnd() {
      self.start = self._ws_region.start;
      self.end = self._ws_region.end;
      self.channel = self._ws_region.channelIdx ?? 0;
      self.updateColor(self.selected ? 0.8 : 0.3);
      self.notifyDrawingFinished();
    },

    toggleHidden(e) {
      self.hidden = !self.hidden;
      self._ws_region.element.style.display = self.hidden ? 'none' : 'block';
      e?.stopPropagation();
    },
  }));
