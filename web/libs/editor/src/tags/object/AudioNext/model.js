import { getRoot, getType, types } from 'mobx-state-tree';
import { customTypes } from '../../../core/CustomTypes';
import { guidGenerator } from '../../../core/Helpers.ts';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import IsReadyMixin from '../../../mixins/IsReadyMixin';
import ProcessAttrsMixin from '../../../mixins/ProcessAttrs';
import { SyncableMixin } from '../../../mixins/Syncable';
import { AudioRegionModel } from '../../../regions/AudioRegion';
import Utils from '../../../utils';
import { isDefined } from '../../../utils/utilities';
import ObjectBase from '../Base';
import { WS_SPEED, WS_VOLUME, WS_ZOOM_X } from './constants';


/**
 * The Audio tag plays audio and shows its waveform. Use for audio annotation tasks where you want to label regions of audio, see the waveform, and manipulate audio during annotation.
 *
 * Use with the following data types: audio
 * @example
 * <!--Labeling configuration to label regions of audio and rate the audio sample-->
 * <View>
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Rating name="rate-1" toName="audio-1" />
 *   <Audio name="audio-1" value="$audio" />
 * </View>
 * @meta_title Audio Tag for Audio Labeling
 * @meta_description Customize Label Studio with the Audio tag for advanced audio annotation tasks for machine learning and data science projects.
 * @param {string} name - Name of the element
 * @param {string} value - Data field containing path or a URL to the audio
 * @param {boolean=} [volume=false] - Whether to show a volume slider (from 0 to 1)
 * @param {string} [defaultvolume=1] - Default volume level (from 0 to 1)
 * @param {boolean} [speed=false] - Whether to show a speed slider (from 0.5 to 3)
 * @param {string} [defaultspeed=1] - Default speed level (from 0.5 to 2)
 * @param {boolean} [zoom=true] - Whether to show the zoom slider
 * @param {string} [defaultzoom=1] - Default zoom level (from 1 to 1500)
 * @param {string} [hotkey] - Hotkey used to play or pause audio
 * @param {string} [sync] object name to sync with
 * @param {string} [cursorwidth=1] - Audio pane cursor width. it's Measured in pixels.
 * @param {string} [cursorcolor=#333] - Audio pane cursor color. Color should be specify in hex decimal string
 * @param {string} [defaultscale=1] - Audio pane default y-scale for waveform
 * @param {boolean} [autocenter=true] – Always place cursor in the middle of the view
 * @param {boolean} [scrollparent=true] – Wave scroll smoothly follows the cursor
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  muted: types.optional(types.boolean, false),
  zoom: types.optional(types.boolean, true),
  defaultzoom: types.optional(types.string, WS_ZOOM_X.default.toString()),
  volume: types.optional(types.boolean, true),
  defaultvolume: types.optional(types.string, WS_VOLUME.default.toString()),
  speed: types.optional(types.boolean, true),
  defaultspeed: types.optional(types.string, WS_SPEED.default.toString()),
  hotkey: types.maybeNull(types.string),
  showlabels: types.optional(types.boolean, false),
  showscores: types.optional(types.boolean, false),
  height: types.optional(types.string, '88'),
  cursorwidth: types.optional(types.string, '2'),
  cursorcolor: types.optional(customTypes.color, '#333'),
  defaultscale: types.optional(types.string, '1'),
  autocenter: types.optional(types.boolean, true),
  scrollparent: types.optional(types.boolean, true),
});

export const AudioModel = types.compose(
  'AudioModel',
  TagAttrs,
  SyncableMixin,
  ProcessAttrsMixin,
  ObjectBase,
  AnnotationMixin,
  IsReadyMixin,
  types.model('AudioModel', {
    type: 'audio',
    _value: types.optional(types.string, ''),

    playing: types.optional(types.boolean, false),
    regions: types.array(AudioRegionModel),
  })
    .volatile(() => ({
      errors: [],
    }))
    .views(self => ({
      get hasStates() {
        const states = self.states();

        return states && states.length > 0;
      },

      get store() {
        return getRoot(self);
      },

      states() {
        return self.annotation.toNames.get(self.name);
      },

      activeStates() {
        const states = self.states();

        return states && states.filter(s => getType(s).name === 'LabelsModel' && s.isSelected);
      },
    }))
    ////// Sync actions
    .actions(self => ({
      ////// Outgoing
      triggerSync(event, data) {
        if (!self._ws) return;

        self.syncSend({
          playing: self._ws.isPlaying(),
          time: self._ws.getCurrentTime(),
          speed: self._ws.rate ?? 1,
          ...data,
        }, event);
      },

      triggerSyncPlay() {
        self.triggerSync('play');
      },

      triggerSyncPause() {
        self.triggerSync('pause');
      },

      ////// Incoming
      handleSyncPlay(data) {
        if (!self._ws) return;
        self.handleSyncSeek(data);
        if (self._ws.isPlaying()) return;

        self._ws?.play();
      },

      handleSyncPause(data) {
        if (!self._ws) return;
        self.handleSyncSeek(data);
        if (!self._ws.isPlaying()) return;

        self._ws?.pause();
      },

      handleSyncSpeed() {},

      handleSyncSeek({ time }) {
        try {
          if (self._ws && time !== self._ws.getCurrentTime()) {
            self._ws.setCurrentTime(time);
          }
        } catch (err) {
          console.log(err);
        }
      },

      registerSyncHandlers() {
        self.syncHandlers.set('play', self.handleSyncPlay);
        self.syncHandlers.set('pause', self.handleSyncPause);
        self.syncHandlers.set('seek', self.handleSyncSeek);
        self.syncHandlers.set('speed', self.handleSyncSpeed);
      },
    }))
    .actions(self => ({
      needsUpdate() {
        self.handleNewRegions();
      },

      onReady() {
        self.setReady(true);
      },

      handleNewRegions() {
        if (!self._ws?.isReady) return;
        self.regs.map(reg => {
          if (reg._ws_region) return;
          self.createWsRegion(reg);
        });
      },

      onHotKey(e) {
        e && e.preventDefault();
        self._ws.playPause();
        return false;
      },

      setRangeValue(val) {
        self.rangeValue = val;
      },

      setPlaybackRate(val) {
        self.playBackRate = val;
      },

      createRegion(wsRegion, states) {
        let bgColor = self.selectedregionbg;
        const st = states.find(s => s.type === 'labels');

        if (st) bgColor = Utils.Colors.convertToRGBA(st.getSelectedColor(), 0.3);

        const r = AudioRegionModel.create({
          id: wsRegion.id ? wsRegion.id : guidGenerator(),
          pid: wsRegion.pid ? wsRegion.pid : guidGenerator(),
          parentID: wsRegion.parent_id === null ? '' : wsRegion.parent_id,
          start: wsRegion.start,
          end: wsRegion.end,
          score: wsRegion.score,
          readonly: wsRegion.readonly,
          regionbg: self.regionbg,
          selectedregionbg: bgColor,
          normalization: wsRegion.normalization,
          states,
        });

        r._ws_region = wsRegion;

        self.regions.push(r);
        self.annotation.addRegion(r);

        return r;
      },

      selectRange(ev, ws_region) {
        const selectedRegions = self.regs.filter(r => r.start >= ws_region.start && r.end <= ws_region.end);

        ws_region.remove && ws_region.remove();
        if (!selectedRegions.length) return;
        // @todo: needs preventing drawing with ctrl pressed
        // if (ev.ctrlKey || ev.metaKey) {
        //   self.annotation.extendSelectionWith(selectedRegions);
        //   return;
        // }
        self.annotation.selectAreas(selectedRegions);
      },

      addRegion(wsRegion) {
        // area id is assigned to WS region during deserealization
        const find_r = self.annotation.areas.get(wsRegion.id);

        if (find_r) {
          find_r.applyCSSClass(wsRegion);

          find_r._ws_region = wsRegion;
          return find_r;
        }

        const states = self.getAvailableStates();

        if (states.length === 0) {
          wsRegion.on('update-end', ev => self.selectRange(ev,wsRegion));
          return;
        }

        const control = self.activeStates()[0];
        const labels = { [control.valueType]: control.selectedValues() };
        const r = self.annotation.createResult(wsRegion, labels, control, self);

        r._ws_region = wsRegion;
        r.updateAppearenceFromState();
        return r;
      },

      /**
       * Play and stop
       */
      handlePlay() {
        if (self._ws) {
          self.playing = !self.playing;
          self._ws.isPlaying() ? self.triggerSync('play') : self.triggerSync('pause');
        }
      },

      handleSeek() {
        self.triggerSync('seek');
      },

      handleSpeed(speed) {
        self.triggerSync('speed', { speed });
      },

      createWsRegion(region) {
        const _regionOptions = region.wsRegionOptions;

        if (region.annotation.isReadOnly()) {
          _regionOptions.drag = false;
          _regionOptions.resize = false;
        }

        const r = self._ws.addRegion(region.wsRegionOptions);

        region._ws_region = r;
        region.updateAppearenceFromState();
      },

      onLoad(ws) {
        self._ws = ws;
        const history = self.annotation.history;

        self.regs.forEach(reg => {
          self.createWsRegion(reg);
        });


        // In cases where we do skipNextUndoState on region creation, we need to make sure
        // that we don't skip the next undo state after it is resolved entirely.
        setTimeout(() => history.setSkipNextUndoState(false), 0);
      },

      onError(error) {
        self.errors = [error];
      },

      wsCreated(ws) {
        self._ws = ws;
      },

      beforeDestroy() {
        try {
          if (isDefined(self._ws)) {
            self._ws.destroy();
            self._ws = null;
          }
        } catch (err) {
          self._ws = null;
          console.warn('Already destroyed');
        }
      },
    })),
);
