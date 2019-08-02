import React, { Fragment } from "react";

import { types, getRoot } from "mobx-state-tree";
import { observer, inject } from "mobx-react";
import { Button, Icon } from "antd";

import { cloneNode } from "../../core/Helpers";
import Registry from "../../core/Registry";
import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

// import { AudioEditorMode } from './AudioEditor';
import Waveform from "../../components/Waveform/Waveform";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

import { AudioRegionModel } from "./AudioRegion";

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
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  haszoom: types.optional(types.string, "true"),
  regionbg: types.optional(types.string, "rgba(0,0,0, 0.1)"),
  selectedregionbg: types.optional(types.string, "rgba(255,0,0,0.5)"),
  _value: types.optional(types.string, ""),
});

const Model = types
  .model({
    id: types.identifier,
    type: "audio",
    playing: types.optional(types.boolean, false),
    regions: types.array(AudioRegionModel),
    rangeValue: types.optional(types.string, "20"),
  })
  .views(self => ({
    get completion() {
      return getRoot(self).completionStore.selected;
    },

    states() {
      return self.completion.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();
      return states ? states.filter(s => s.isSelected) : null;
    },
  }))
  .actions(self => ({
    toStateJSON() {
      return self.regions.map(r => r.toStateJSON());
    },

    findRegion(start, end) {
      return self.regions.find(r => r.start === start && r.end === end);
    },

    fromStateJSON(obj, fromModel) {
      self.findRegion(obj.value.start, obj.value.end);
      restoreNewsnapshot(fromModel);

      self._ws.addRegion({
        start: obj.value.start,
        end: obj.value.end,
      });
    },

    setRangeValue(val) {
      self.rangeValue = val;
    },

    addRegion(ws_region) {
      const find_r = self.findRegion(ws_region.start, ws_region.end);
      if (self.findRegion(ws_region.start, ws_region.end)) {
        find_r._ws_region = ws_region;
        return find_r;
      }

      const states = self.activeStates();

      const clonedStates = states ? states.map(s => cloneNode(s)) : null;

      // const bgColor = states ? states[0].getSelectedColor() : self.selectedregionbg;

      const r = AudioRegionModel.create({
        id: guidGenerator(),
        start: ws_region.start,
        end: ws_region.end,
        regionbg: self.regionbg,
        selectedregionbg: self.selectedregionbg,
        states: clonedStates,
      });

      r._ws_region = ws_region;

      self.regions.push(r);
      self.completion.addRegion(r);

      // r.selectRegion();
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
  return (
    <div>
      <Waveform
        src={item._value}
        selectRegion={item.selectRegion}
        handlePlay={item.handlePlay}
        onCreate={item.wsCreated}
        addRegion={item.addRegion}
        onLoad={item.onLoad}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1em" }}>
        <Button
          type="primary"
          onClick={ev => {
            item._ws.playPause();
          }}
        >
          {item.playing && (
            <Fragment>
              <Icon type="pause-circle" /> Pause
            </Fragment>
          )}
          {!item.playing && (
            <Fragment>
              <Icon type="play-circle" /> Play
            </Fragment>
          )}
        </Button>

        {item.haszoom === "true" && (
          <input
            type="range"
            min="20"
            max="200"
            id="slider"
            value={item.rangeValue}
            onChange={ev => {
              item.setRangeValue(ev.target.value);
            }}
          />
        )}
      </div>
    </div>
  );
});

const HtxAudioPlus = inject("store")(observer(HtxAudioView));

Registry.addTag("audioplus", AudioPlusModel, HtxAudioPlus);

export { AudioPlusModel, AudioRegionModel, HtxAudioPlus };
