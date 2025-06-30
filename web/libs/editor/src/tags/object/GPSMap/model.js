import { getEnv, getRoot, getType, types, isAlive } from "mobx-state-tree";
import { errorBuilder } from "../../../core/DataValidator/ConfigValidator";
import { calculateDistance } from "../../../components/GPSVisualization/Common/Utils";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import IsReadyMixin from "../../../mixins/IsReadyMixin";
import { SyncableMixin } from "../../../mixins/Syncable";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";
import { parseValue } from "../../../utils/data";
import ObjectBase from "../Base";
import { isDefined } from "../../../utils/utilities";
import { GPSRegionModel } from "../../../regions/GPSRegion";
import Utils from "../../../utils";
import { guidGenerator } from "../../../utils/unique";
import { observe } from "mobx";
import { calculateAveragePosition, calculateRadius, detectStationaryClustersInternal } from "./clusters";

const GPSPointType = types.model("GPSPoint", {
  timestamp: types.number,
  altitude: types.number,
  speed: types.number,
  latitude: types.number,
  longitude: types.number,
  course: types.optional(types.number, 0),
  haccuracy: types.optional(types.number, 0),
  vaccuracy: types.optional(types.number, 0),
});

// Define the expected XML tag attributes for GPSMap
const TagAttrs = types.model({
  value: types.maybeNull(types.string), // Field name in task data containing GPS points
  valuetype: types.optional(types.enumeration(["infer", "url", "json"]), "infer"), // Renamed to lowercase t
  sync: types.optional(types.string, ""), // RE-ADD sync attribute definition
  // timeline: types.maybeNull(types.string), // Removed: Timeline is now embedded
});

const PLAYBACK_INTERVAL_MS = 100; // Legacy timer fallback interval
const SMOOTH_PLAYBACK_FPS = 60; // Target FPS for smooth playback animation

// External animation frame tracking (outside MST state)
const animationFrameTrackers = new WeakMap();

const _detectStationaryClustersInternal = (
  points,
  maxGap = 5, // Maximum time gap in seconds between points to be considered part of same cluster
  mergeDistance = 50, // Maximum distance in meters to merge nearby clusters
  minPoints = 3, // Minimum number of points to form a cluster
  speedRange = [0, 1.0], // [minSpeed, maxSpeed] range in m/s for stationary points
) => {
  if (!points || points.length < minPoints) return [];

  const [minSpeed, maxSpeed] = speedRange;
  const clusters = [];
  let currentCluster = [];
  let lastPoint = null;

  // First pass: group points into potential clusters based on speed and time gaps
  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (!lastPoint) {
      currentCluster.push(point);
      lastPoint = point;
      continue;
    }

    const timeGap = point.timestamp - lastPoint.timestamp;
    const distance = calculateDistance(lastPoint, point);

    // Use stored speed from GPS data if available, otherwise calculate from distance/time
    let speed;
    if (typeof point.speed === "number" && !isNaN(point.speed)) {
      speed = point.speed; // Use stored speed (already corrected during data loading)
    } else {
      speed = timeGap > 0 ? distance / timeGap : 0; // Calculate speed from distance and time
    }

    if (speed >= minSpeed && speed <= maxSpeed && timeGap <= maxGap) {
      // Point is stationary and within time gap, add to current cluster
      currentCluster.push(point);
    } else {
      // Point is moving or gap is too large, finalize current cluster if it meets criteria
      if (currentCluster.length >= minPoints) {
        const center = calculateAveragePosition(currentCluster);
        clusters.push({
          ...center,
          count: currentCluster.length,
          radius: calculateRadius(currentCluster, center),
          points: [...currentCluster],
          timestamp: currentCluster[0].timestamp,
          duration: currentCluster[currentCluster.length - 1].timestamp - currentCluster[0].timestamp,
        });
      }
      // Start new cluster with current point
      currentCluster = [point];
    }
    lastPoint = point;
  }

  // Handle last cluster
  if (currentCluster.length >= minPoints) {
    const center = calculateAveragePosition(currentCluster);
    clusters.push({
      ...center,
      count: currentCluster.length,
      radius: calculateRadius(currentCluster, center),
      points: [...currentCluster],
      timestamp: currentCluster[0].timestamp,
      duration: currentCluster[currentCluster.length - 1].timestamp - currentCluster[0].timestamp,
    });
  }

  // Second pass: merge nearby clusters
  const mergedClusters = [];
  let i = 0;

  while (i < clusters.length) {
    let current = clusters[i];
    let j = i + 1;

    while (j < clusters.length) {
      const next = clusters[j];
      const distance = calculateDistance(current, next);

      if (distance <= mergeDistance) {
        // Merge clusters
        const allPoints = [...current.points, ...next.points];
        const center = calculateAveragePosition(allPoints);
        current = {
          ...center,
          count: allPoints.length,
          radius: calculateRadius(allPoints, center),
          points: allPoints,
          timestamp: current.timestamp, // Keep timestamp of first cluster
          duration: allPoints[allPoints.length - 1].timestamp - allPoints[0].timestamp,
        };
        j++;
      } else {
        break;
      }
    }

    mergedClusters.push(current);
    i = j;
  }

  return mergedClusters;
};

// Define the specific model properties, views, and actions for GPSMap
const Model = types
  .model("GPSMapModelBase", {
    type: "gpsmap",
    currentTime: types.optional(types.number, 0),
    playing: types.optional(types.boolean, false),
    regions: types.array(GPSRegionModel),
  })
  .volatile(() => ({
    _rawData: null,
    viewInitialized: false,
    _valueLoaded: false,
    _clusterSettings: {
      clusterMaxGap: 1,
      clusterMergeDistance: 5,
      clusterMinPoints: 3,
      stationarySpeedRange: [0, 1], // [min, max] speed range in m/s for stationary points
    },
    _timerInterval: null,
    updateTimeout: null,
    _ws: null,
    regionbg: "#787878",
    selectedregionbg: "#787878",
    // Observable properties for waveform state to trigger relation updates
    _waveformZoom: 1,
    _waveformVisibleTimeStart: 0,
    _showSpeedWaveform: true,
    _showAltitudeWaveform: true,
  }))
  .views((self) => ({
    get store() {
      return getRoot(self);
    },

    // New view to process the raw data from self._rawData
    get processedGpsData() {
      if (!self._valueLoaded || !self._rawData) {
        return [];
      }
      // Assuming _rawData is already sorted and is an array of valid points (or empty)
      return self._rawData;
    },

    get trackDuration() {
      const data = self.processedGpsData; // Use processed data
      if (data && data.length > 0) {
        return data[data.length - 1].timestamp;
      }
      return 0;
    },

    get totalPoints() {
      return self.processedGpsData.length;
    },

    get currentPointIndex() {
      const data = self.processedGpsData;
      const time = self.currentTime;
      if (!data || data.length === 0) return 1; // Default to 1 if no data

      // Find the index of the last point whose timestamp is less than or equal to current time
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].timestamp <= time) {
          return i + 1; // Return 1-based index
        }
      }
      return 1;
    },

    get isReady() {
      return self.viewInitialized;
    },

    get stationaryClusters() {
      if (!self.processedGpsData || self.processedGpsData.length === 0) {
        return [];
      }
      return detectStationaryClustersInternal(
        self.processedGpsData,
        self._clusterSettings.clusterMaxGap,
        self._clusterSettings.clusterMergeDistance,
        self._clusterSettings.clusterMinPoints,
        self._clusterSettings.stationarySpeedRange,
      );
    },

    get activeStationarySegment() {
      if (!self.stationaryClusters || self.stationaryClusters.length < 2 || !isFinite(self.currentTime)) {
        return null;
      }
      const clusters = self.stationaryClusters;
      const time = self.currentTime;

      for (let i = 0; i < clusters.length - 1; i++) {
        const clusterA = clusters[i];
        const clusterB = clusters[i + 1];
        // Check if current time is between the start of clusterA and the start of clusterB
        // A segment is active if the time is >= start of clusterA and < start of clusterB.
        if (time >= clusterA.timestamp && time < clusterB.timestamp) {
          return { startCluster: clusterA, endCluster: clusterB };
        }
      }
      // Special case: if currentTime is exactly the timestamp of the last cluster,
      // consider the segment leading *to* it as active.
      if (clusters.length > 0 && time === clusters[clusters.length - 1].timestamp && clusters.length >= 2) {
        return { startCluster: clusters[clusters.length - 2], endCluster: clusters[clusters.length - 1] };
      }
      return null;
    },

    states() {
      return self.annotation?.toNames.get(self.name) || [];
    },

    activeStates() {
      const states = self.states();

      return states && states.filter((s) => getType(s).name === "LabelsModel" && s.isSelected);
    },

    get activeState() {
      const states = self.states();

      return states && states.filter((s) => getType(s).name === "LabelsModel" && s.isSelected)[0];
    },

    get activeLabel() {
      const state = self.activeState;

      return state?.selectedValues()?.[0];
    },

    get shouldShowRelations() {
      // Relations should only be visible if at least one waveform is showing
      return self._showSpeedWaveform || self._showAltitudeWaveform;
    },
  }))
  ////// Sync actions
  .actions((self) => ({
    ////// Outgoing
    triggerSync(event, data) {
      if (!self.sync) return;
      self.syncSend(
        {
          playing: self.playing,
          time: self.currentTime,
          ...data,
        },
        event,
      );
    },

    triggerSyncPlay() {
      self.triggerSync("play", { playing: true });
    },
    triggerSyncPause() {
      self.triggerSync("pause", { playing: false });
    },
    triggerSyncSeek(time) {
      self.triggerSync("seek", { time });
    },

    ////// Incoming
    registerSyncHandlers() {
      self.syncHandlers.set("seek", self._handleSeek);
      self.syncHandlers.set("play", self._handlePlay);
      self.syncHandlers.set("pause", self._handlePause);
    },

    handleSyncPlay() {
      if (self.playing) return;
      self.playing = true;
      self._startTimer();
      self.triggerSync("play", { playing: true, time: self.currentTime });
    },

    handleSyncPause() {
      if (!self.playing) return;
      self.playing = false;
      self._stopTimer();
      self.triggerSync("pause", { playing: false, time: self.currentTime });
    },

    handleSyncSeek({ time }) {
      if (time < 0 || time > self.trackDuration) return;
      const duration = self.trackDuration;
      const newTime = Math.max(0, Math.min(time, duration)); // Clamp time within bounds
      self._setCurrentTime(newTime);
    },

    _handleSeek(data) {
      if (!self.isReady) return;
      if (data && typeof data.time === "number") {
        self.seek(data.time, true); // Indicate this is from sync, so don't re-broadcast
      }
    },

    _handlePlay() {
      if (!self.isReady) return;
      self.play();
    },

    _handlePause() {
      if (!self.isReady) return;
      self.pause();
    },
  }))
  .actions((self) => {
    let dispose = null;

    return {
      // Lifecycle and Data Loading
      afterCreate() {
        dispose = observe(
          self,
          "activeLabel",
          () => {
            const selectedRegions = self._ws?.regions?.selected;

            if (!selectedRegions || selectedRegions.length === 0) return;

            const activeState = self.activeState;
            const selectedColor = activeState?.selectedColor;
            const labels = activeState?.selectedValues();

            selectedRegions.forEach((r) => {
              r.update({ color: selectedColor, labels: labels ?? [] });

              const region = r.isRegion ? self.updateRegion(r) : self.addRegion(r);

              self.annotation.selectArea(region);
            });

            if (selectedRegions.length) {
              self.requestWSUpdate();
            }
          },
          false,
        );
      },

      _setData(data) {
        if (!isAlive(self)) {
          console.warn("GPSMapModel: Attempted to update destroyed model in _setData. Skipping.");
          return;
        }
        if (Array.isArray(data)) {
          // Basic validation for the array items (can be kept light if upstream guarantees structure)
          if (
            data.length > 0 &&
            !(
              typeof data[0]?.latitude === "number" &&
              typeof data[0]?.longitude === "number" &&
              typeof data[0]?.relative_timestamp === "number"
            )
          ) {
            // This case means it's an array, but not of valid GPS points (if not empty)
            // console.error("GPSMapModel: Attempted to set array with invalid GPS point objects.", data);

            self.store.annotationStore.addErrors([
              errorBuilder.generalError(
                `GPSMap (${self.name}): Data array contains invalid GPS point objects or is malformed.`,
              ),
            ]);
            self._rawData = [];
            self._valueLoaded = false;
            self.setReady(false);
            return;
          }

          // TODO: Fix data and remove this
          // Convert relative_timestamp to timestamp
          self._rawData = data.map((point) => {
            let correctedSpeed = point.speed || 0; // Use original speed, default to 0 if missing

            // Only clamp negative speeds to 0, preserve positive speeds
            if (correctedSpeed < 0) {
              correctedSpeed = 0;
            }

            return {
              ...point,
              timestamp: point.relative_timestamp,
              speed: correctedSpeed,
            };
          });

          self._valueLoaded = true;
          self.setReady(true);
        } else {
          // console.error("GPSMapModel: Attempted to set non-array data.", data);
          self.store.annotationStore.addErrors([
            errorBuilder.generalError(
              `GPSMap (${self.name}): Final data is not a valid JSON array. Received: ${typeof data}`,
            ),
          ]);
          self._rawData = [];
          self._valueLoaded = false;
          self.setReady(false);
        }
      },

      async preloadValue(store) {
        if (!isAlive(self)) return;
        const dataObj = store.task.dataObj;
        let sourceData = null;
        let determinedValueType = self.valuetype; // Use new name: valuetype
        let data; // Declare data variable here

        // 1. Extract the source data using the 'value' key
        if (self.value) {
          sourceData = parseValue(self.value, dataObj);
        }

        // Check if data was found. If not, default to empty array silently.
        if (!isDefined(sourceData)) {
          self._setData([]); // Set data to empty array
          return; // Stop further processing
        }

        // 2. Determine actual value type if not explicitly set
        if (determinedValueType === "infer") {
          if (typeof sourceData === "string") {
            if (sourceData.trim().startsWith("[")) {
              determinedValueType = "json";
            } else {
              determinedValueType = "url";
            }
          } else {
            determinedValueType = "json";
          }
        }

        if (determinedValueType === "json") {
          let jsonData = sourceData;

          if (typeof sourceData === "string") {
            try {
              jsonData = JSON.parse(sourceData);
            } catch (e) {
              self._setData([]); // Set empty on parse failure
              return;
            }
          }

          if (Array.isArray(jsonData)) {
            self._setData(jsonData);
          } else if (typeof jsonData === "object" && jsonData !== null) {
            const arrayValue = Object.values(jsonData).find(Array.isArray);
            if (arrayValue) {
              self._setData(arrayValue);
            } else if (isAlive(self)) {
              store.annotationStore.addErrors([
                errorBuilder.generalError(
                  "GPSMap: Data for valuetype=\"json\" is an object but contains no array of points."
                ),
              ]);
              self._setData([]); // Set empty if object has no array
            }
          } else if (isAlive(self)) {
            store.annotationStore.addErrors([
              errorBuilder.generalError(
                `GPSMap: Invalid data format for valuetype=\"json\". Expected array or object, got ${typeof jsonData}.`
              ),
            ]);
            self._setData([]); // Set empty for invalid final type
          }
          return;
        }

        // 4. Handle valueType="url"
        const url = sourceData; // sourceData must be the URL string here

        const isLikelyUrl =
          typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"));

        if (!isLikelyUrl) {
          self._setData([]); // Set empty array
          return; // Stop processing
        }

        if (!url || typeof url !== "string") {
          if (isAlive(self)) {
            store.annotationStore.addErrors([
              errorBuilder.generalError(
                `GPSMap: Invalid URL derived from value. Got: ${url}`
              ),
            ]);
          }
          return;
        }

        let text = "";
        let cors = false;
        let res;

        try {
          res = await fetch(url);
          if (!isAlive(self)) return;
          if (!res.ok) {
            if (res.status === 400 && isAlive(self)) {
              store.annotationStore.addErrors([
                errorBuilder.loadingError(
                  `${res.status} ${res.statusText}`,
                  url,
                  self.value,
                  getEnv(store).messages.ERR_LOADING_S3,
                ),
              ]);
              return;
            }
            throw new Error(`${res.status} ${res.statusText}`);
          }
          text = await res.text();
          if (!isAlive(self)) return;
        } catch (e) {
          let error = e;
          if (!res) {
            try {
              res = await fetch(url, { mode: "no-cors" });
              if (!res.ok && res.status === 0) cors = true;
            } catch (fetchError) {
              error = fetchError; // Use the fetch error if no-cors also fails
            }
          }
          if (isAlive(self)) {
            store.annotationStore.addErrors([
              errorBuilder.loadingError(
                error,
                url,
                self.value,
                cors ? getEnv(store).messages.ERR_LOADING_CORS : undefined,
              ),
            ]);
          }
          return;
        }

        try {
          data = JSON.parse(text); // Use standard JSON.parse which accepts arrays
          if (!Array.isArray(data)) {
            throw new Error("Fetched data parsed correctly, but is not a JSON array.");
          }
          if (!isAlive(self)) return;
          self._setData(data);
        } catch (e) {
          if (isAlive(self)) {
            const message = `Problems with parsing JSON from URL for GPSMap: ${e?.message || e}<br>URL: ${url}`;
            store.annotationStore.addErrors([errorBuilder.generalError(message)]);
          }
        }
      },

      async updateValue(store) {
        if (!isAlive(self)) return;
        try {
          const effectiveStore = store ?? self.store;
          if (!self._valueLoaded) {
            await self.preloadValue(effectiveStore);
          }
        } catch (e) {
          if (isAlive(self)) {
            store.annotationStore.addErrors([errorBuilder.generalError(e.message)]);
          }
        }
      },

      beforeDestroy() {
        if (typeof dispose === "function") {
          dispose();
        }
        self._stopTimer();
        if (self.updateTimeout) {
          clearTimeout(self.updateTimeout);
        }
        if (isDefined(self._ws)) {
          self._ws.destroy();
          self._ws = null;
        }
      },

      // Ready State
      setReady(value) {
        // This is a safeguard against a specific race condition. The GPSMap model handles
        // its own asynchronous data loading within `preloadValue`. It is possible for an
        // external process (e.g., the Annotation view re-rendering) to call `setReady(false)`
        // on all media objects *after* this component has already finished loading its data.
        // This check prevents the UI from being incorrectly hidden in that scenario by
        // ignoring external `setReady(false)` calls once data is successfully loaded.
        if (value === false) {
          if (self._valueLoaded && self._rawData && self._rawData.length > 0) {
            return;
          }
        }
        self.viewInitialized = value;
        self._isReady = value;
      },

      _onReady() {
        self.setReady(true);
      },

      onReady() {
        this._onReady();
      },

      // Update Flow
      needsUpdate() {
        self.handleNewRegions();
        self.requestWSUpdate();
      },

      handleNewRegions() {
        if (!self._ws) return;
        self.regs.map((reg) => {
          if (reg._ws_region) {
            self.updateWsRegion(reg);
          } else {
            self.createWsRegion(reg);
          }
        });
      },

      requestWSUpdate() {
        if (!self._ws) return;
        if (self.updateTimeout) {
          clearTimeout(self.updateTimeout);
        }

        self.updateTimeout = setTimeout(() => {
          if (self._ws && self._ws.regions) {
            // Add null check for self._ws and self._ws.regions
            self._ws.regions.redraw();
          }
        }, 33);
      },

      // Region Management
      getRegionColor() {
        // Now self.activeState should be populated by the view above
        return self.activeState?.selectedColor ?? null;
      },

      createRegion(wsRegion, states) {
        let bgColor = self.selectedregionbg;
        const st = states.find((s) => s.type === "labels");

        if (st) bgColor = Utils.Colors.convertToRGBA(st.getSelectedColor(), 0.3);

        const r = GPSRegionModel.create({
          id: wsRegion.id ? wsRegion.id : guidGenerator(),
          pid: wsRegion.pid ? wsRegion.pid : guidGenerator(),
          parentID: wsRegion.parent_id === null ? "" : wsRegion.parent_id,
          start: wsRegion.start,
          end: wsRegion.end,
          score: wsRegion.score,
          readonly: wsRegion.readonly,
          regionbg: self.regionbg,
          selectedregionbg: bgColor,
          states,
        });

        r.setWSRegion(wsRegion);

        self.regions.push(r);
        self.annotation.addRegion(r);

        return r;
      },

      addRegion(wsRegion) {
        // area id is assigned to WS region during deserealization
        const find_r = self.annotation.areas.get(wsRegion.id);

        if (find_r) {
          find_r.setWSRegion(wsRegion);
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

        r.setWSRegion(updatedRegion);
        r.updateColor();
        return r;
      },

      updateRegion(wsRegion) {
        const r = self.findRegionByWsRegion(wsRegion);
        if (!r) return;
        r.onUpdateEnd();
        return r;
      },

      findRegionByWsRegion(wsRegion) {
        return self.regs.find((r) => r._ws_region?.id === wsRegion?.id);
      },

      createWsRegion(region) {
        if (!self._ws) return;

        const options = region.wsRegionOptions();
        options.labels = region.labels?.length ? region.labels : undefined;

        const r = self._ws.addRegion(options, false);
        region.setWSRegion(r);
      },

      updateWsRegion(region) {
        if (!self._ws) return;

        const options = region.wsRegionOptions();
        options.labels = region.labels?.length ? region.labels : undefined;

        self._ws.updateRegion(options, false);
      },

      clearRegionMappings() {
        self.regs.forEach((r) => {
          r.setWSRegion(null);
        });
      },

      onRegionCreated(region) {
        self.addRegion(region);
      },

      onRegionUpdatedEnd(region) {
        const r = self.findRegionByWsRegion(region);
        if (!r) return;
        r.onUpdateEnd();
        return r;
      },

      // Playback Control
      _startTimer() {
        self._stopTimer();
        if (self.trackDuration <= 0) return;

        // Store animation start state
        const playbackStartTime = performance.now();
        const playbackStartPosition = self.currentTime;

        const animationLoop = () => {
          if (!self.playing) {
            return; // Animation frame will be cleaned up by _stopTimer
          }

          const currentTime = performance.now();
          const elapsedSeconds = (currentTime - playbackStartTime) / 1000;
          const newTime = playbackStartPosition + elapsedSeconds;
          const duration = self.trackDuration;

          if (newTime >= duration) {
            self._setCurrentTime(duration);
            self.pause(); // This will call _stopTimer and clean up the animation frame
          } else {
            self._setCurrentTime(newTime);
            // Continue animation loop - store frame ID externally
            const frameId = requestAnimationFrame(animationLoop);
            animationFrameTrackers.set(self, frameId);
          }
        };

        // Start the animation loop
        const frameId = requestAnimationFrame(animationLoop);
        animationFrameTrackers.set(self, frameId);
      },

      _stopTimer() {
        if (self._timerInterval) {
          clearInterval(self._timerInterval);
          self._timerInterval = null;
        }

        // Cancel animation frame using external tracker
        const frameId = animationFrameTrackers.get(self);
        if (frameId) {
          cancelAnimationFrame(frameId);
          animationFrameTrackers.delete(self);
        }
      },

      _setCurrentTime(time) {
        const duration = self.trackDuration;
        const newTime = Math.max(0, Math.min(time ?? 0, duration));
        if (isDefined(newTime) && !isNaN(newTime)) {
          self.currentTime = newTime;
        }
      },

      play() {
        if (self.playing) return;
        self.playing = true;
        self._startTimer();
        self.triggerSync("play", { playing: true, time: self.currentTime }); // Notify external
      },

      pause() {
        if (!self.playing && !self._timerInterval) return; // Don't do anything if already paused
        self.playing = false;
        self._stopTimer();
        self.triggerSync("pause", { playing: false, time: self.currentTime }); // Notify external
      },

      seek(time, fromSync = false) {
        self._setCurrentTime(time);

        // If currently playing, restart the playback timer from the new time
        if (self.playing) {
          self._startTimer(); // This will restart the animation loop from current time
        }

        if (!fromSync) {
          self.triggerSyncSeek(time); // Only notify external if this is a local seek
        }
      },

      // Other Model-Specific Actions
      setExternalClusterSettings(newSettings) {
        if (newSettings) {
          self._clusterSettings = {
            clusterMaxGap: newSettings.clusterMaxGap ?? self._clusterSettings.clusterMaxGap,
            clusterMergeDistance: newSettings.clusterMergeDistance ?? self._clusterSettings.clusterMergeDistance,
            clusterMinPoints: newSettings.clusterMinPoints ?? self._clusterSettings.clusterMinPoints,
            stationarySpeedRange: newSettings.stationarySpeedRange ?? self._clusterSettings.stationarySpeedRange,
          };
        }
      },

      // Actions to update waveform state for relation updates
      updateWaveformZoom(zoomLevel) {
        self._waveformZoom = zoomLevel;
      },

      updateWaveformVisibleTimeStart(visibleTimeStart) {
        self._waveformVisibleTimeStart = visibleTimeStart;
      },

      updateWaveformSettings(settings) {
        if (settings.showSpeedWaveform !== undefined) {
          self._showSpeedWaveform = settings.showSpeedWaveform;
        }
        if (settings.showAltitudeWaveform !== undefined) {
          self._showAltitudeWaveform = settings.showAltitudeWaveform;
        }
      },

      onLoad(ws) {
        self.clearRegionMappings();
        self._ws = ws;

        // Listen for zoom and pan events to update observable properties
        // This ensures that relations update when the waveform view changes
        ws.on("zoom", (zoomLevel, visibleTimeRange) => {
          self.updateWaveformZoom(zoomLevel);
          self.updateWaveformVisibleTimeStart(visibleTimeRange.start);
        });

        ws.on("pan", (visibleTimeRange) => {
          self.updateWaveformVisibleTimeStart(visibleTimeRange.start);
        });

        self.onReady();
        self.needsUpdate();
      },
    };
  });

export const GPSMapModel = types.compose(
  "GPSMapModel",
  SyncableMixin,
  TagAttrs,
  ProcessAttrsMixin,
  ObjectBase,
  AnnotationMixin,
  IsReadyMixin,
  Model,
);
