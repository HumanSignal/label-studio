import { observe } from 'mobx';
import { getEnv, getRoot, getType, types } from 'mobx-state-tree';
import { customTypes } from '../../../core/CustomTypes';
import { guidGenerator } from '../../../core/Helpers.ts';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import IsReadyMixin from '../../../mixins/IsReadyMixin';
import ProcessAttrsMixin from '../../../mixins/ProcessAttrs';
import { SyncableMixin } from '../../../mixins/Syncable';
import { AudioRegionModel } from '../../../regions/AudioRegion';
import Utils from '../../../utils';
import { FF_LSDV_E_278, isFF } from '../../../utils/feature-flags';
import { isDefined } from '../../../utils/utilities';
import ObjectBase from '../Base';
import { WS_SPEED, WS_VOLUME, WS_ZOOM_X } from './constants';

/**
 * The Audio tag plays audio and shows its waveform. Use for audio annotation tasks where you want to label regions of audio, see the waveform, and manipulate audio during annotation.
 *
 * Use with the following data types: audio
 * @example
 * <!-- Play audio on the labeling interface -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 * </View>
 * @example
 * <!-- Play audio with multichannel support -->
 * <View>
 *   <Audio name="audio" value="$audio" splitchannels="true" />
 * </View>
 * @example
 * <!-- Audio classification -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <Choices name="ch" toName="audio">
 *     <Choice value="Positive" />
 *     <Choice value="Negative" />
 *   </Choices>
 * </View>
 * @example
 * <!-- Audio transcription -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <TextArea name="ta" toName="audio" />
 * </View>
 * @example
 * <!-- Labeling configuration to label regions of audio and rate the audio sample-->
 * <View>
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Rating name="rate-1" toName="audio-1" />
 *   <Audio name="audio-1" value="$audio" />
 * </View>
 * @example
 * <!-- Sync with video -->
 * <View>
 *   <Video name="video-1" value="$video" sync="audio-1" />
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Audio name="audio-1" value="$video" sync="video-1" />
 * </View>
 * @example
 * <!-- Sync with paragraphs -->
 * <View>
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Audio name="audio-1" value="$audio" sync="txt-1" />
 *   <Paragraphs audioUrl="$audio" sync="audio-1" name="txt-1" value="$text" layout="dialogue" showplayer="true" />
 * </View>
 * @regions AudioRegion
 * @meta_title Audio Tag for Audio Labeling
 * @meta_description Customize Label Studio with the Audio tag for advanced audio annotation tasks for machine learning and data science projects.
 * @name Audio
 * @param {string} name - Name of the element
 * @param {string} value - Data field containing path or a URL to the audio.
 * @param {string} [defaultspeed=1] - Default speed level (from 0.5 to 2).
 * @param {string} [defaultscale=1] - Audio pane default y-scale for waveform.
 * @param {string} [defaultzoom=1] - Default zoom level for waveform. (from 1 to 1500).
 * @param {string} [defaultvolume=1] - Default volume level (from 0 to 1).
 * @param {string} [hotkey] - Hotkey used to play or pause audio.
 * @param {string} [sync] Object name to sync with.
 * @param {string} [height=96] - Total height of the audio player.
 * @param {string} [waveheight=32] - Minimum height of a waveform when in `splitchannels` mode with multiple channels to display.
 * @param {boolean} [splitchannels=false] - Display multiple audio channels separately, if the audio file has more than one channel. (**NOTE: Requires more memory to operate.**)
 * @param {string} [decoder=webaudio] - Decoder type to use to decode audio data. (`"webaudio"` or `"ffmpeg"`)
 * @param {string} [player=html5] - Player type to use to play audio data. (`"html5"` or `"webaudio"`)
 */
const TagAttrs = types.model({
  name: types.identifier,
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
  height: types.optional(types.string, '96'),
  waveheight: types.optional(types.string, '32'),
  cursorwidth: types.optional(types.string, '2'),
  cursorcolor: types.optional(customTypes.color, '#333'),
  defaultscale: types.optional(types.string, '1'),
  autocenter: types.optional(types.boolean, true),
  scrollparent: types.optional(types.boolean, true),
  decoder: types.optional(types.enumeration(['ffmpeg', 'webaudio']), 'webaudio'),
  player: types.optional(types.enumeration(['html5', 'webaudio']), 'html5'),
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
        return self.annotation?.toNames.get(self.name) || [];
      },

      activeStates() {
        const states = self.states();

        return states && states.filter(s => getType(s).name === 'LabelsModel' && s.isSelected);
      },

      get activeState() {
        const states = self.states();

        return states && states.filter(s => getType(s).name === 'LabelsModel' && s.isSelected)[0];
      },

      get activeLabel() {
        const state = self.activeState;

        return state?.selectedValues()?.[0];
      },
    }))
    ////// Sync actions
    .actions(self => ({
      ////// Outgoing

      triggerSync(event, data) {
        if (!self._ws) return;

        self.syncSend({
          playing: self._ws.playing,
          time: self._ws.currentTime,
          speed: self._ws.rate,
          ...data,
        }, event);
      },

      triggerSyncSpeed(speed) {
        self.triggerSync('speed', { speed });
      },

      triggerSyncPlay() {
        // @todo should not be handled like this
        self.handleSyncPlay();
        // trigger play only after it actually started to play
        self.triggerSync('play', { playing: true });
      },

      triggerSyncPause() {
        // @todo should not be handled like this
        self.handleSyncPause();
        self.triggerSync('pause', { playing: false });
      },

      triggerSyncSeek(time) {
        self.triggerSync('seek', { time });
      },

      ////// Incoming

      registerSyncHandlers() {
        ['play', 'pause', 'seek'].forEach(event => {
          self.syncHandlers.set(event, self.handleSync);
        });
        self.syncHandlers.set('speed', self.handleSyncSpeed);
      },

      handleSync(data) {
        if (!self._ws?.loaded) return;

        self.handleSyncSeek(data);
        if (data.playing) {
          if (!self._ws.playing) self._ws?.play();
        } else {
          if (self._ws.playing) self._ws?.pause();
        }
      },

      // @todo remove both of these methods
      handleSyncPlay() {
        if (self._ws?.playing) return;

        self._ws?.play();
      },

      handleSyncPause() {
        if (!self._ws?.playing) return;

        self._ws?.pause();
      },

      handleSyncSeek({ time }) {
        if (!self._ws?.loaded || !isDefined(time)) return;

        try {
          self._ws.setCurrentTime(time, true);
          self._ws.syncCursor(); // sync cursor with current time
        } catch (err) {
          console.log(err);
        }
      },

      handleSyncSpeed({ speed }) {
        if (!self._ws) return;
        self._ws.rate = speed;
      },

      syncMuted(muted) {
        if (!self._ws) return;
        self._ws.muted = muted;
      },
    }))
    .actions(self => {
      let dispose;
      let updateTimeout = null;

      return {
        afterCreate() {
          dispose = observe(self, 'activeLabel', () => {
            const selectedRegions = self._ws?.regions?.selected;

            if (!selectedRegions || selectedRegions.length === 0) return;

            const activeState = self.activeState;
            const selectedColor = activeState?.selectedColor;
            const labels = activeState?.selectedValues();

            selectedRegions.forEach(r => {
              r.update({ color: selectedColor, labels: labels ?? [] });

              const region = r.isRegion ? self.updateRegion(r) : self.addRegion(r);

              self.annotation.selectArea(region);
            });

            if (selectedRegions.length) {
              self.requestWSUpdate();
            }
          }, false);
        },

        needsUpdate() {
          self.handleNewRegions();
          self.requestWSUpdate();
        },

        requestWSUpdate() {
          if (!self._ws) return;
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }

          updateTimeout = setTimeout(() => {
            self._ws.regions.redraw();
          }, 33);
        },

        onReady() {
          self.setReady(true);
        },

        onRateChange(rate) {
          self.triggerSyncSpeed(rate);
        },

        /**
         * Load any synced paragraph text segments which contain start and end values
         * as Audio segments for visualization of the excerpts within the audio track
         **/
        loadSyncedParagraphs() {
          if (!self.syncManager) return;

          // find synced paragraphs if any
          // and add their regions to the audio
          const syncedParagraphs = Array.from(self.syncManager.syncTargets, ([,value]) => value).filter(target => target.type === 'paragraphs' && target.contextscroll);

          syncedParagraphs.forEach(paragraph => {
            const segments = Object.values(paragraph.regionsStartEnd).map(({ start, end }) => ({ start, end, showInTimeline: true, external: true, locked: true }));

            self._ws.addRegions(segments);
          });
        },

        handleNewRegions() {
          if (!self._ws) return;

          self.regs.map(reg => {
            if (reg._ws_region) {
              self.updateWsRegion(reg);
            } else {
              self.createWsRegion(reg);
            }
          });
        },

        findRegionByWsRegion(wsRegion) {
          return self.regs.find(r => r._ws_region?.id === wsRegion?.id);
        },

        getRegionColor() {
          const control = self.activeState;

          if (control) {
            return control.selectedColor;
          }

          return null;
        },

        onHotKey(e) {
          e && e.preventDefault();
          self._ws.togglePlay();
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

        addRegion(wsRegion) {
          // area id is assigned to WS region during deserealization
          const find_r = self.annotation.areas.get(wsRegion.id);


          if (find_r) {
            find_r._ws_region = wsRegion;
            find_r.updateColor();
            return find_r;
          }

          const states = self.getAvailableStates();

          if (states.length === 0) {
            // wsRegion.on("update-end", ev=> self.selectRange(ev, wsRegion));
            if (wsRegion.isRegion) {
              wsRegion.convertToSegment().handleSelected();
            }

            return;
          }

          const control = self.activeState;
          const labels = { [control.valueType]: control.selectedValues() };
          const r = self.annotation.createResult(wsRegion, labels, control, self);
          const updatedRegion = wsRegion.convertToRegion(labels.labels);

          r._ws_region = updatedRegion;
          r.updateColor();
          return r;
        },

        updateRegion(wsRegion) {
          const r = self.findRegionByWsRegion(wsRegion);

          if (!r) return;

          r.onUpdateEnd();
          return r;
        },

        createWsRegion(region) {
          if (!self._ws) return;

          const options = region.wsRegionOptions();

          options.labels = region.labels?.length ? region.labels : undefined;

          const r = self._ws.addRegion(options, false);

          region._ws_region = r;
        },

        updateWsRegion(region) {
          if (!self._ws) return;

          const options = region.wsRegionOptions();

          options.labels = region.labels?.length ? region.labels : undefined;

          self._ws.updateRegion(options, false);
        },

        clearRegionMappings() {
          self.regs.forEach(r => {
            r._ws_region = null;
          });
        },

        onLoad(ws) {
          self.clearRegionMappings();
          self._ws = ws;

          self.onReady();
          self.needsUpdate();
          if (isFF(FF_LSDV_E_278)) {
            self.loadSyncedParagraphs();
          }
        },

        onSeek(time) {
          self.triggerSyncSeek(time);
        },

        onPlaying(playing) {
          if (playing) {
            // @todo self.play();
            self.triggerSyncPlay();
          } else {
            // @todo self.pause();
            self.triggerSyncPause();
          }
        },

        onError(error) {
          let messageHandler;

          if (error.name === 'HTTPError') {
            messageHandler = 'ERR_LOADING_HTTP';
          } else {
            messageHandler = 'ERR_LOADING_AUDIO';
          }

          const message = getEnv(self.store).messages[messageHandler]({ attr: self.value, url: self._value, error: error.message });

          self.errors = [message];
        },

        beforeDestroy() {
          try {
            if (updateTimeout) clearTimeout(updateTimeout);
            if (dispose) dispose();
            if (isDefined(self._ws)) {
              self._ws.destroy();
              self._ws = null;
            }
          } catch (err) {
            self._ws = null;
            console.warn('Already destroyed');
          }
        },
      };
    }),
);
