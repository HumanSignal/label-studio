import { ff } from "@humansignal/core";
import { observer } from "mobx-react";
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { usePersistentJSONState } from "@humansignal/core/lib/hooks/usePersistentState";
import { TimelineContextProvider } from "../../../components/Timeline/Context";
import { ErrorMessage } from "../../../components/ErrorMessage/ErrorMessage";
import { Controls } from "../../../components/Timeline/Controls";
import type { TimelineSettings } from "../../../components/Timeline/Types";
import { Hotkey } from "../../../core/Hotkey";
import { useWaveform } from "../../../lib/AudioUltra/react";
import type { Region } from "../../../lib/AudioUltra/Regions/Region";
import type { Segment } from "../../../lib/AudioUltra/Regions/Segment";
import type { Regions } from "../../../lib/AudioUltra/Regions/Regions";
import { cn } from "../../../utils/bem";
import { useSpectrogramControls as useSpectrogramControlsHook } from "../../../lib/AudioUltra/hooks/useSpectrogramControls";
import { getCurrentTheme } from "@humansignal/ui";
import { FF_AUDIO_SPECTROGRAMS, isFF } from "../../../utils/feature-flags";

import "./view.scss";

// Define Defaults
const NORMALIZED_STEP = 0.1;

const isAudioSpectrograms = isFF(FF_AUDIO_SPECTROGRAMS);

const useSpectrogramControls = isAudioSpectrograms ? useSpectrogramControlsHook : () => {};

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

interface AudioProps {
  item: any;
  settings?: TimelineSettings;
  changeSetting?: (key: string, value: any) => void;
  children: ReactNode;
}

const AudioView: FC<AudioProps> = observer(
  ({ item, children, settings = {}, changeSetting = () => {} }: AudioUltraProps) => {
    const rootRef = useRef<HTMLElement | null>();
    const isDarkMode = getCurrentTheme() === "Dark";

    const { waveform, ...controls } = useWaveform(rootRef, {
      src: item._value,
      autoLoad: false,
      waveColor: isDarkMode ? "rgba(150,150,150,0.8)" : "rgba(150,150,150,0.8)",
      gridColor: isDarkMode ? "rgba(150,150,150,0.8)" : "rgba(150,150,150,0.9)",
      gridWidth: 1,
      backgroundColor: isDarkMode ? "rgba(150,150,150,0.8)" : "rgba(255,255,255,0.8)",
      autoCenter: true,
      zoomToCursor: true,
      height: item.height && !isNaN(Number(item.height)) ? Number(item.height) : 96,
      waveHeight: item.waveheight && !isNaN(Number(item.waveheight)) ? Number(item.waveheight) : 32,
      splitChannels: item.splitchannels,
      decoderType: item.decoder,
      playerType: item.player,
      volume: item.defaultvolume ? Number(item.defaultvolume) : 1,
      amp: item.defaultscale ? Number(item.defaultscale) : 1,
      zoom: item.defaultzoom ? Number(item.defaultzoom) : 1,

      showLabels: item.annotationStore.store.settings.showLabels,
      rate: item.defaultspeed ? Number(item.defaultspeed) : 1,
      muted: item.muted === "true",
      buffering: item.isBuffering,
      onBuffering: item.handleBuffering,
      onLoad: (wf) => {
        if (isAudioSpectrograms) {
          const spectrogramLayer = wf.getLayer("spectrogram");
          if (spectrogramLayer) {
            spectrogramLayer.setVisibility(item.spectrogram);
          }
        }
        item.onLoad(wf);
      },
      onPlaying: item.onPlaying,
      onSeek: item.onSeek,
      onRateChange: item.onRateChange,
      onError: item.onError,
      regions: {
        createable: !item.readonly,
      },
      timeline: {
        backgroundColor: isDarkMode ? "rgb(38, 37, 34)" : "rgba(255,255,255,0.8)",
      },
      experimental: {
        backgroundCompute: true,
        denoize: true,
      },
      onFrameChanged: (frameState) => {
        item.setWFFrame(frameState);
      },
    });

    useSpectrogramControls(waveform);

    useEffect(() => {
      const hotkeys = Hotkey("Audio", "Audio Segmentation");

      waveform.current?.load();

      const updateBeforeRegionDraw = (regions: Regions) => {
        const regionColor = item.getRegionColor();
        const regionLabels = item.activeState?.selectedValues();

        if (regionColor && regionLabels) {
          regions.regionDrawableTarget();
          regions.setDrawingColor(regionColor);
          regions.setLabels(regionLabels);
        }
      };

      const updateAfterRegionDraw = (regions: Regions) => {
        regions.resetDrawableTarget();
        regions.resetDrawingColor();
        regions.resetLabels();
      };

      const createRegion = (region: Region | Segment) => {
        item.addRegion(region);
      };

      const selectRegion = (region: Region | Segment, event: MouseEvent) => {
        const annotation = item.annotation;

        const growSelection = event.metaKey || event.ctrlKey;

        if (!growSelection || (!region.selected && !region.isRegion)) item.annotation.regionStore.unselectAll();

        // to select or unselect region
        const itemRegion = item.regs.find((obj: any) => obj.id === region.id);
        // to select or unselect unlabeled segments
        const targetInWave = item._ws.regions.findRegion(region.id);

        if (annotation.isLinkingMode && itemRegion) {
          annotation.addLinkedRegion(itemRegion);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
          region.handleSelected(false);
          return;
        }

        itemRegion && item.annotation.regionStore.toggleSelection(itemRegion, region.selected);

        if (targetInWave) {
          targetInWave.handleSelected(region.selected);
        }

        // deselect all other segments if not changing multi-selection
        if (!growSelection) {
          item._ws.regions.regions.forEach((obj: any) => {
            if (obj.id !== region.id) {
              obj.handleSelected(false);
            }
          });
        }
      };

      const updateRegion = (region: Region | Segment) => {
        item.updateRegion(region);
      };

      waveform.current?.on("beforeRegionsDraw", updateBeforeRegionDraw);
      waveform.current?.on("afterRegionsDraw", updateAfterRegionDraw);
      waveform.current?.on("regionSelected", selectRegion);
      waveform.current?.on("regionCreated", createRegion);
      waveform.current?.on("regionUpdatedEnd", updateRegion);

      hotkeys.addNamed("region:delete", () => {
        waveform.current?.regions.clearSegments(false);
      });

      hotkeys.addNamed("segment:delete", () => {
        waveform.current?.regions.clearSegments(false);
      });

      hotkeys.addNamed("region:delete-all", () => {
        waveform.current?.regions.clearSegments();
      });

      return () => {
        hotkeys.unbindAll();
      };
    }, []);

    return (
      <div className={cn("audio-tag").toClassName()}>
        {children}
        <div
          ref={(el) => {
            rootRef.current = el;
            item.stageRef.current = el;
          }}
        />
        <Controls
          position={controls.currentTime}
          playing={isSyncedBuffering && item.isBuffering ? item.wasPlayingBeforeBuffering : controls.playing}
          buffering={item.isBuffering}
          volume={controls.volume}
          speed={controls.rate}
          zoom={controls.zoom}
          duration={controls.duration}
          onPlay={() => {
            if (isSyncedBuffering && item.isBuffering) {
              item.triggerSyncPlay(true);
            } else {
              controls.setPlaying(true);
            }
          }}
          onPause={() => {
            if (isSyncedBuffering && item.isBuffering) {
              item.triggerSyncPause(true);
            } else {
              controls.setPlaying(false);
            }
          }}
          allowFullscreen={false}
          onVolumeChange={(vol) => controls.setVolume(vol)}
          onStepBackward={() => {
            waveform.current?.seekBackward(NORMALIZED_STEP);
            waveform.current?.syncCursor();
          }}
          onStepForward={() => {
            waveform.current?.seekForward(NORMALIZED_STEP);
            waveform.current?.syncCursor();
          }}
          onPositionChange={(pos) => {
            waveform.current?.seek(pos);
            waveform.current?.syncCursor();
          }}
          onSpeedChange={(speed) => controls.setRate(speed)}
          onZoom={(zoom) => controls.setZoom(zoom)}
          amp={controls.amp}
          onAmpChange={(amp) => controls.setAmp(amp)}
          mediaType="audio"
          toggleVisibility={(layerName: string, isVisible: boolean) => {
            if (waveform.current) {
              const layer = waveform.current?.getLayer(layerName);

              if (layer) {
                layer.setVisibility(isVisible);
              }
            }
          }}
          layerVisibility={controls.layerVisibility}
        />
      </div>
    );
  },
);

const AudioWithSettings: FC<AudioProps> = ({ item }) => {
  const [settings, setSettings] = usePersistentJSONState<TimelineSettings>("ls:audio-tag:settings", {
    // @todo this hotkey should be moved from these settings for a more appropriate place;
    // @todo we are planning to have a central hotkeys management, that would be a better option.
    playpauseHotkey: "audio:playpause",
    stepBackHotkey: "audio:step-backward",
    stepForwardHotkey: "audio:step-forward",
    loopRegion: false,
    autoPlayNewSegments: true,
  });
  const changeSetting = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // @todo seems like this context is not used at all; and its values are static; better to check and remove
  const contextValue = useMemo(() => {
    return {
      position: 0,
      length: 0,
      regions: [],
      step: 10,
      playing: false,
      visibleWidth: 0,
      seekOffset: 0,
      data: undefined,
      settings,
      changeSetting,
    };
  }, [settings]);

  return (
    <TimelineContextProvider value={contextValue}>
      <AudioView item={item}>
        {item.errors?.map((error: any, i: number) => (
          <ErrorMessage key={`err-${i}`} error={error} />
        ))}
      </AudioView>
    </TimelineContextProvider>
  );
};

export const Audio = observer(AudioWithSettings);
