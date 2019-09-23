import React, { Fragment } from "react";

import { types, getRoot, getType } from "mobx-state-tree";
import { observer, inject } from "mobx-react";
import { Button, Icon, Slider, Row, Col } from "antd";

import { cloneNode } from "../../core/Helpers";
import Registry from "../../core/Registry";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import Waveform from "../../components/Waveform/Waveform";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

import Utils from "../../utils";

import { AudioRegionModel } from "./AudioRegion";
import AudioControls from "./Audio/Controls";
import styles from "./AudioPlus/AudioPlus.module.scss";

/**
 * AudioPlus tag plays audio and shows its wave
 * @example
 * <View>
 *  <Labels name="lbl-1" toName="audio-1"><Label value="Hello"></Label><Label value="World"></Label></Labels>
 *  <Rating name="rate-1" toName="audio-1"></Rating>
 *  <AudioPlus name="audio-1" value="$audio"></AudioPlus>
 * </View>
 * @name AudioPlus
 * @param {string} name of the element
 * @param {string} value of the element
 * @param {boolean} hasZoom speficy if audio has zoom functionality
 * @param {string} regionBG region color
 * @param {string} selectedRegionBG selected region background
 * @param {boolean} volume from 0 to 1
 * @param {boolean} speed from 0.5 to 3
 * @param {boolean} zoom
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  zoom: types.optional(types.boolean, true),
  volume: types.optional(types.boolean, true),
  speed: types.optional(types.boolean, true),
  regs: types.optional(types.boolean, true),
});

const Model = types
  .model("AudioPlusModel", {
    id: types.identifier,
    type: "audio",
    _value: types.optional(types.string, ""),
    playing: types.optional(types.boolean, false),
    regions: types.array(AudioRegionModel),
    height: types.optional(types.number, 128),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();
      return states && states.length > 0;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();
      return states
        ? states.filter(s => s.isSelected && (getType(s).name === "LabelsModel" || getType(s).name === "RatingModel"))
        : null;
    },
  }))
  .actions(self => ({
    toStateJSON() {
      return self.regions.map(r => r.toStateJSON());
    },

    /**
     * Find region of audio
     */
    findRegion(start, end) {
      let findedRegion = self.regions.find(r => r.start === start && r.end === end);
      return findedRegion;
    },

    fromStateJSON(obj, fromModel) {
      let r;
      let m;

      /**
       *
       */
      const tree = {
        pid: obj.id,
        start: obj.value.start,
        end: obj.value.end,
        normalization: obj.normalization,
      };

      const region = self.findRegion(obj.value.start, obj.value.end);

      if (obj.value.labels) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      if (fromModel) {
        m = restoreNewsnapshot(fromModel);

        m.fromStateJSON(obj);

        if (!region) {
          tree.states = [m];
          r = self.addRegion(tree);
        } else {
          region.states.push(m);
        }
      }

      if (self._ws) {
        self._ws.addRegion({
          start: r.start,
          end: r.end,
        });
      }

      return r;
    },

    setRangeValue(val) {
      self.rangeValue = val;
    },

    setPlaybackRate(val) {
      self.playBackRate = val;
    },

    addRegion(ws_region) {
      const states = self.activeStates();

      const clonedStates = states
        ? states.map(s => {
            return cloneNode(s);
          })
        : null;

      const find_r = self.findRegion(ws_region.start, ws_region.end);

      if (self.findRegion(ws_region.start, ws_region.end)) {
        find_r._ws_region = ws_region;
        return find_r;
      }

      const bgColor =
        states && states[0] ? Utils.Colors.convertToRGBA(states[0].getSelectedColor(), 0.3) : self.selectedregionbg;

      const r = AudioRegionModel.create({
        id: ws_region.id ? ws_region.id : guidGenerator(),
        pid: ws_region.pid ? ws_region.pid : guidGenerator(),
        start: ws_region.start,
        end: ws_region.end,
        regionbg: self.regionbg,
        selectedregionbg: bgColor,
        states: clonedStates,
      });

      r._ws_region = ws_region;

      self.regions.push(r);
      self.completion.addRegion(r);

      states && states.forEach(s => s.unselectAll());

      return r;
    },

    /**
     * Play and stop
     */
    handlePlay() {
      self.playing = !self.playing;
    },

    onLoad(ws) {
      self._ws = ws;

      self.regions.forEach(obj => {
        self._ws.addRegion({
          start: obj.start,
          end: obj.end,
        });
      });
    },

    wsCreated(ws) {
      self._ws = ws;
    },
  }));

const AudioPlusModel = types.compose(
  "AudioPlusModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

const HtxAudioView = observer(({ store, item }) => {
  if (!item._value) return null;

  return (
    <div>
      <Waveform
        src={item._value}
        selectRegion={item.selectRegion}
        handlePlay={item.handlePlay}
        onCreate={item.wsCreated}
        addRegion={item.addRegion}
        onLoad={item.onLoad}
        speed={item.speed}
        zoom={item.zoom}
        volume={item.volume}
        regions={item.regs}
        height={item.height}
      />

      <AudioControls item={item} />
    </div>
  );
});

const HtxAudioPlus = inject("store")(observer(HtxAudioView));

Registry.addTag("audioplus", AudioPlusModel, HtxAudioPlus);

export { AudioRegionModel, AudioPlusModel, HtxAudioPlus };
