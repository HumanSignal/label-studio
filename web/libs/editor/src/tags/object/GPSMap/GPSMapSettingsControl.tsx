/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from "react";
import { type FC, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
// Remove clsx if no longer needed by other parts
// import clsx from "clsx";
import { Select, Toggle, Tooltip } from "@humansignal/ui";
import { IconConfig, IconInfoConfig } from "@humansignal/icons";
import { Block, Elem } from "../../../utils/bem";
// Restore direct context import
// import { TimelineContext } from "../../../components/Timeline/Context";
import { ControlButton } from "../../../components/Timeline/Controls";
import "./GPSMapSettingsControl.scss";
// Remove hook import
// import { useGpsMapControls } from "../../../hooks/useGpsMapControls";
import {
  MAP_PROVIDERS,
  DEFAULT_PROVIDER,
  getProvider,
  // formatProviderUrl, // We don't need formatProviderUrl here
} from "../../../components/GPSVisualization/mapProviders"; // Corrected relative path
import { Slider } from "../../../components/Timeline/Controls/Slider";
import { DualSlider } from "./DualSlider";
import colormap from "colormap";

// Full list of scheme names copied from SpectrogramControl.tsx
const SCHEME_NAMES = [
  "autumn",
  "bathymetry",
  "blackbody",
  "bluered",
  "bone",
  "cdom",
  "chlorophyll",
  "cool",
  "copper",
  "cubehelix",
  "density",
  "earth",
  "electric",
  "freesurface-blue",
  "freesurface-red",
  "greens",
  "greys",
  "hot",
  "hsv",
  "inferno",
  "jet",
  "magma",
  "oxygen",
  "par",
  "phase",
  "picnic",
  "plasma",
  "portland",
  "rainbow",
  "rainbow-soft",
  "RdBu",
  "salinity",
  "spring",
  "summer",
  "temperature",
  "turbidity",
  "velocity-blue",
  "velocity-green",
  "viridis",
  "warm",
  "winter",
  "YIGnBu",
  "YIOrRd",
];

// Colormap Helper functions
const getColorSchemeGradient = (name: any): string => {
  const colors = colormap({
    colormap: name,
    nshades: 16,
    format: "hex",
    alpha: 1,
  });
  return `linear-gradient(to right, ${colors.join(", ")})`;
};

// Restore the function to render label + small box
const renderColorSchemeOption = (label: string, gradient: string) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
    <span>{label}</span>
    <span
      style={{
        display: "inline-block",
        width: "50px",
        height: "10px",
        marginLeft: "10px",
        border: "1px solid var(--sand_300)",
        background: gradient,
      }}
    />
  </div>
);

// Build options array from scheme names
const colorSchemeOptions: any = SCHEME_NAMES.map((name) => {
  // Generate human-readable label
  const label = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    label: renderColorSchemeOption(label, getColorSchemeGradient(name)),
    value: name,
    key: name,
  };
}).sort((a: any, b: any) => a.value.localeCompare(b.value));

// Define Props interface
interface GPSMapSettingsControlProps {
  settings: {
    gpsColorScheme?: string;
    followPosition?: boolean;
    followBearing?: boolean;
    showSpeedWaveform?: boolean;
    showAltitudeWaveform?: boolean;
    showTechnicalInfo?: boolean;
    tileProvider?: string;
    tileLayerUrl?: string;
    tileLayerAttribution?: string;
    tileLayerMaxZoom?: number;
    showStationaryClusters?: boolean;
    showClustersOnMap?: boolean;
    showClustersOnWaveform?: boolean;
    showClustersOnGrid?: boolean;
    showStationaryClusterArc?: boolean;
    clusterMaxGap?: number;
    clusterMergeDistance?: number;
    clusterMinPoints?: number;
    stationarySpeedRange?: [number, number];
    followMapTransitionDuration?: number;
    speedUnit?: "m/s" | "km/h";
    [key: string]: any;
  };
  changeSetting: (key: string, value: any) => void;
}

export const GPSMapSettingsControl: FC<GPSMapSettingsControlProps> = ({ settings, changeSetting }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialize displayColorScheme from settings, defaulting to 'jet'
  const [displayColorScheme, setDisplayColorScheme] = useState(() => (settings as any)?.["gpsColorScheme"] ?? "jet");

  // --- State for derived provider info ---
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>(settings?.tileProvider ?? DEFAULT_PROVIDER);
  const [selectedProviderDetails, setSelectedProviderDetails] = useState(getProvider(selectedProviderKey));

  // Sync local state when props.settings changes, defaulting to JET
  useEffect(() => {
    const propScheme = (settings as any)?.["gpsColorScheme"] ?? "jet";
    if (propScheme !== displayColorScheme) {
      setDisplayColorScheme(propScheme);
    }
    const propProvider = settings?.tileProvider ?? DEFAULT_PROVIDER;
    if (propProvider !== selectedProviderKey) {
      setSelectedProviderKey(propProvider);
      setSelectedProviderDetails(getProvider(propProvider));
    }
  }, [settings]);

  useEffect(() => {
    if (isModalOpen && modalRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const modal = modalRef.current;
      modal.style.opacity = "0";
      modal.style.position = "fixed";
      modal.style.top = "-9999px";
      modal.style.left = "-9999px";

      const calculatePosition = () => {
        if (!modalRef.current || !buttonRef.current) return;
        const modalRect = modal.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const margin = 10;

        let top = buttonRect.bottom + 5;
        let left = buttonRect.left;

        if (top + modalRect.height > viewportHeight - margin) {
          const topAbove = buttonRect.top - modalRect.height - 5;
          if (topAbove > margin) {
            top = topAbove;
          } else {
            top = viewportHeight - modalRect.height - margin;
          }
        }

        if (top < margin) {
          top = margin;
        }

        if (left + modalRect.width > viewportWidth - margin) {
          left = viewportWidth - modalRect.width - margin;
        }

        if (left < margin) {
          left = margin;
        }

        modal.style.top = `${top}px`;
        modal.style.left = `${left}px`;
        modal.style.opacity = "1";
      };

      requestAnimationFrame(calculatePosition);
    } else if (modalRef.current) {
      modalRef.current.style.opacity = "0";
    }
  }, [isModalOpen]);

  const toggleModal = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    setIsModalOpen((prev) => !prev);
  }, []);

  // Click outside effect remains
  useEffect(() => {
    if (!isModalOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Ignore clicks within the select dropdown popover
      if ((target as HTMLElement)?.closest('[data-testid="select-popup"]')) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(target)) {
        setIsModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isModalOpen]);

  const handleColorSchemeChange = (newValue: string) => {
    setDisplayColorScheme(newValue);
    changeSetting?.("gpsColorScheme", newValue);
  };

  // --- Handlers ---

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderKey = e.target.value;
    const providerDetails = getProvider(newProviderKey);

    changeSetting?.("tileProvider", newProviderKey);

    if (providerDetails && newProviderKey !== "Custom") {
      changeSetting?.("tileLayerUrl", providerDetails.url);
      changeSetting?.("tileLayerAttribution", providerDetails.options.attribution);
      changeSetting?.("tileLayerMaxZoom", providerDetails.options.maxZoom);
    } else {
      // Optionally clear fields when switching to Custom, or leave them as is
      // changeSetting?.('tileLayerUrl', '');
      // changeSetting?.('tileLayerAttribution', '');
    }
  };

  // --- Modified handlers for URL, Attrib, Zoom to set provider to Custom ---
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    changeSetting?.("tileLayerUrl", newValue);
    // If a preset was selected, switch to Custom
    if (selectedProviderKey !== "Custom") {
      changeSetting?.("tileProvider", "Custom");
    }
  };

  const handleAttribChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    changeSetting?.("tileLayerAttribution", newValue);
    // If a preset was selected, switch to Custom
    if (selectedProviderKey !== "Custom") {
      changeSetting?.("tileProvider", "Custom");
    }
  };

  const handleZoomChange = (e: React.FormEvent<HTMLInputElement>) => {
    let newValue = Number.parseInt(e.currentTarget.value, 10) || 19; // Default to 19 if parsing fails

    // Apply provider-specific max zoom limit first (if not custom)
    if (selectedProviderKey !== "Custom" && selectedProviderDetails) {
      const maxProviderZoom = selectedProviderDetails.options.maxZoom || 19;
      newValue = Math.min(newValue, maxProviderZoom);
    }

    // Apply the absolute maximum limit of 22
    newValue = Math.min(newValue, 22);

    changeSetting?.("tileLayerMaxZoom", newValue);

    // If a preset was selected, switch to Custom
    if (selectedProviderKey !== "Custom") {
      changeSetting?.("tileProvider", "Custom");
    }
  };

  const handleFollowPositionChange = (isFollowPositionEnabled: boolean) => {
    changeSetting?.("followPosition", isFollowPositionEnabled);
    // If Follow Position is turned off, Follow Bearing must also be turned off.
    if (!isFollowPositionEnabled) {
      changeSetting?.("followBearing", false);
    }
  };

  const handleFollowBearingChange = (isFollowBearingEnabled: boolean) => {
    changeSetting?.("followBearing", isFollowBearingEnabled);
    // If Follow Bearing is turned on, Follow Position must also be turned on.
    if (isFollowBearingEnabled) {
      changeSetting?.("followPosition", true);
    }
  };

  const renderLayerToggles = () => {
    const isSpeedWaveformVisible = settings?.showSpeedWaveform ?? true;
    const isAltitudeWaveformVisible = settings?.showAltitudeWaveform ?? true;
    const areWaveformClustersVisible = settings?.showClustersOnWaveform ?? true;

    return (
      <Elem name="buttons">
        <Elem name="menu-button" onClick={() => changeSetting?.("showSpeedWaveform", !isSpeedWaveformVisible)}>
          {isSpeedWaveformVisible ? "Hide" : "Show"} Speed
        </Elem>
        <Elem name="menu-button" onClick={() => changeSetting?.("showAltitudeWaveform", !isAltitudeWaveformVisible)}>
          {isAltitudeWaveformVisible ? "Hide" : "Show"} Altitude
        </Elem>
        <Elem name="menu-button" onClick={() => changeSetting?.("showClustersOnWaveform", !areWaveformClustersVisible)}>
          {areWaveformClustersVisible ? "Hide" : "Show"} Clusters
        </Elem>
      </Elem>
    );
  };

  const renderModal = () => {
    if (!settings) return null;

    const currentFollowPosition = settings?.followPosition ?? false;
    const currentFollowBearing = settings?.followBearing ?? false;

    const displayTileUrl = settings?.tileLayerUrl ?? "";
    const displayTileAttr = settings?.tileLayerAttribution ?? "";
    const displayTileZoom = settings?.tileLayerMaxZoom ?? 19;

    const apiKeyRequiredCount = Object.values(MAP_PROVIDERS).filter(
      (provider) => provider.options.apiKeyRequired,
    ).length;

    const sortedProviders = Object.entries(MAP_PROVIDERS).sort((a, b) => {
      const aRequiresKey = a[1].options.apiKeyRequired;
      const bRequiresKey = b[1].options.apiKeyRequired;

      if (aRequiresKey === bRequiresKey) {
        return a[1].name.localeCompare(b[1].name);
      }
      return aRequiresKey ? 1 : -1;
    });

    const modal = (
      <Elem
        name="modal"
        ref={modalRef}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{ opacity: 0, position: "fixed" }}
      >
        <Elem name="scroll-content">
          <Elem name="section-header">Display Settings</Elem>
          <Elem name="setting-item">
            <label htmlFor="gps-speed-unit">Speed Unit</label>
            <select
              id="gps-speed-unit"
              className="gpsmap-settings-control__select"
              value={settings?.speedUnit ?? "m/s"}
              onChange={(e) => changeSetting("speedUnit", e.target.value)}
            >
              <option value="m/s">m/s</option>
              <option value="km/h">km/h</option>
            </select>
          </Elem>
          <Elem name="setting-item" style={{ display: "block" }}>
            <label htmlFor="gps-color-scheme">Arrow Color Scheme</label>
            <Select
              value={displayColorScheme}
              onChange={handleColorSchemeChange as any}
              style={{
                width: "100%",
              }}
              options={colorSchemeOptions as any}
              className="color-scheme-select"
            />
          </Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, the map will stay centered on the current playhead location (position).">
              <Toggle
                checked={currentFollowPosition}
                onChange={(e) => handleFollowPositionChange(e.target.checked)}
                label="Follow Map Position"
              />
            </Tooltip>
          </Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, the map will orient itself based on the current direction of travel (bearing). Also enables Follow Map Position.">
              <Toggle
                checked={currentFollowBearing}
                disabled={!currentFollowPosition}
                onChange={(e) => handleFollowBearingChange(e.target.checked)}
                label="Follow Map Orientation"
              />
            </Tooltip>
          </Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, shows a technical information overlay with detailed GPS data including coordinates, altitude, speed, course, and accuracy.">
              <Toggle
                checked={settings?.showTechnicalInfo ?? false}
                onChange={(e) => changeSetting?.("showTechnicalInfo", e.target.checked)}
                label="Show Technical Info"
              />
            </Tooltip>
          </Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, shows cluster circles on the GPS map visualization.">
              <Toggle
                checked={settings?.showClustersOnMap ?? true}
                onChange={(e) => changeSetting?.("showClustersOnMap", e.target.checked)}
                label="Show Map Clusters"
              />
            </Tooltip>
          </Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, shows cluster overlay visualization behind the waveform grid.">
              <Toggle
                checked={settings?.showClustersOnGrid ?? true}
                onChange={(e) => changeSetting?.("showClustersOnGrid", e.target.checked)}
                label="Show Grid Clusters"
              />
            </Tooltip>
          </Elem>

          <Elem name="section-header">Camera Settings</Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, the camera automatically zooms out when moving fast and zooms in when moving slowly, providing better context based on movement speed.">
              <Toggle
                checked={settings?.speedBasedZoom ?? true}
                onChange={(e) => changeSetting?.("speedBasedZoom", e.target.checked)}
                label="Speed-Based Zoom"
              />
            </Tooltip>
          </Elem>
          {(settings?.speedBasedZoom ?? true) && (
            <>
              <Slider
                min={0.1}
                max={2.0}
                step={0.1}
                value={settings?.speedZoomIntensity ?? 0.8}
                description={"Zoom Intensity"}
                info={
                  "Controls how much the camera zooms out at high speeds. Higher values = more dramatic zoom changes."
                }
                onChange={(e) => changeSetting?.("speedZoomIntensity", Number.parseFloat(e.currentTarget.value))}
              />
              <Slider
                min={10}
                max={100}
                step={5}
                value={settings?.speedZoomMaxSpeed ?? 50}
                description={"Max Speed Reference (km/h)"}
                info={"Speed at which maximum zoom out is reached. Speeds above this value won't zoom out further."}
                onChange={(e) => changeSetting?.("speedZoomMaxSpeed", Number.parseInt(e.currentTarget.value, 10))}
              />
              <Slider
                min={0.1}
                max={1.0}
                step={0.1}
                value={settings?.speedZoomSmoothness ?? 0.3}
                description={"Zoom Smoothness"}
                info={"Controls how quickly the zoom responds to speed changes. Lower values = smoother transitions."}
                onChange={(e) => changeSetting?.("speedZoomSmoothness", Number.parseFloat(e.currentTarget.value))}
              />
            </>
          )}

          <Elem name="section-header">Cluster Settings</Elem>
          <Elem name="toggle">
            <Tooltip title="When enabled, shows an arc indicating the direction of the last moving point entering the cluster.">
              <Toggle
                checked={settings?.showStationaryClusterArc ?? false}
                disabled={!settings?.showStationaryClusters}
                onChange={(e) => changeSetting?.("showStationaryClusterArc", e.target.checked)}
                label="Show Stationary Cluster Arc"
              />
            </Tooltip>
          </Elem>
          <Slider
            min={0.01}
            max={50}
            step={0.01}
            value={settings?.clusterMaxGap ?? 1}
            description={"Cluster Search Radius (m)"}
            info={"Maximum search radius (in meters) around a point to find other points for clustering."}
            onChange={(e) => changeSetting?.("clusterMaxGap", Number.parseFloat(e.currentTarget.value))}
          />
          <Slider
            min={0}
            max={100}
            step={0.01}
            value={settings?.clusterMergeDistance ?? 5}
            description={"Cluster Merge Distance (m)"}
            info={"Maximum distance (in meters) between two stationary clusters to merge them into one."}
            onChange={(e) => changeSetting?.("clusterMergeDistance", Number.parseFloat(e.currentTarget.value))}
          />
          <Slider
            min={2}
            max={20}
            step={1}
            value={settings?.clusterMinPoints ?? 3}
            description={"Min Cluster Points"}
            info={"Minimum number of points required to form a stationary cluster."}
            onChange={(e) => changeSetting?.("clusterMinPoints", Number.parseInt(e.currentTarget.value, 10))}
          />
          <Block name="audio-slider" style={{ width: "100%" }}>
            <DualSlider
              min={0}
              max={100} // Increased max speed for more flexibility
              step={0.01} // 0.01 km/h steps for 2 decimal place precision
              value={[
                (settings?.stationarySpeedRange?.[0] ?? 0) * 3.6,
                (settings?.stationarySpeedRange?.[1] ?? 1) * 3.6,
              ]}
              onChange={(value: [number, number]) => {
                console.log("DualSlider onChange called with:", value);
                // Convert from km/h to m/s for storage
                const mpsValues: [number, number] = [value[0] / 3.6, value[1] / 3.6];
                console.log("Converting to m/s:", mpsValues);
                changeSetting?.("stationarySpeedRange", mpsValues);
              }}
            />
            <Elem name="control">
              <Elem name="info">
                Speed Range (km/h)
                <Tooltip title="Minimum and maximum speed (in km/h) for a point to be considered stationary. Points with speeds within this range will be clustered together.">
                  <IconInfoConfig />
                </Tooltip>
              </Elem>
              <Elem name="input-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Elem
                  name="input"
                  tag="input"
                  type="number"
                  value={((settings?.stationarySpeedRange?.[0] ?? 0) * 3.6).toFixed(2)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const valueKmh = Number(e.target.value);
                    const valueMps = valueKmh / 3.6;
                    const currentRange = settings?.stationarySpeedRange ?? [0, 1];
                    if (!isNaN(valueMps) && valueMps <= currentRange[1] - 0.01 / 3.6) {
                      changeSetting?.("stationarySpeedRange", [valueMps, currentRange[1]]);
                    }
                  }}
                  min={0}
                  max={(settings?.stationarySpeedRange?.[1] ?? 1) * 3.6 - 0.01}
                  step={0.01}
                  style={{ width: "70px" }}
                />
                <Elem
                  tag="span"
                  name="separator"
                  style={{ margin: "0 4px", color: "var(--color-neutral-content-subtlest)" }}
                >
                  to
                </Elem>
                <Elem
                  name="input"
                  tag="input"
                  type="number"
                  value={((settings?.stationarySpeedRange?.[1] ?? 1) * 3.6).toFixed(2)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const valueKmh = Number(e.target.value);
                    const valueMps = valueKmh / 3.6;
                    const currentRange = settings?.stationarySpeedRange ?? [0, 1];
                    if (!isNaN(valueMps) && valueMps >= currentRange[0] + 0.01 / 3.6) {
                      changeSetting?.("stationarySpeedRange", [currentRange[0], valueMps]);
                    }
                  }}
                  min={(settings?.stationarySpeedRange?.[0] ?? 0) * 3.6 + 0.01}
                  max={100}
                  step={0.01}
                  style={{ width: "70px" }}
                />
              </Elem>
            </Elem>
          </Block>

          <Elem name="section-header">Map Provider Settings</Elem>
          <Elem name="setting-item">
            <label htmlFor="gps-tile-provider">
              <Tooltip title="Select a map provider. Some providers require an API key.">
                <span>Tile Provider</span>
              </Tooltip>
            </label>
            <select
              id="gps-tile-provider"
              className="gpsmap-settings-control__select"
              value={selectedProviderKey}
              onChange={handleProviderChange}
            >
              <option key="Custom" value="Custom">
                Custom (max zoom: {settings?.tileLayerMaxZoom ?? 19})
              </option>
              {sortedProviders
                .filter(([key]) => key !== "Custom")
                .map(([key, provider]: [string, { name: string; url: string; options: any }]) => (
                  <option key={key} value={key}>
                    {provider.name} (max zoom: {provider.options.maxZoom}){provider.options.apiKeyRequired ? " *" : ""}
                  </option>
                ))}
            </select>
            {apiKeyRequiredCount > 0 && <Elem name="api-note">* API key required - edit file to set your key</Elem>}
          </Elem>
          <Elem name="setting-item">
            <label htmlFor="gps-tile-url">Tile Layer URL</label>
            <input
              type="text"
              id="gps-tile-url"
              className="gpsmap-settings-control__input"
              value={displayTileUrl}
              placeholder="https://.../{z}/{x}/{y}.png"
              onChange={handleUrlChange}
            />
          </Elem>
          <Elem name="setting-item">
            <label htmlFor="gps-tile-attr">Tile Layer Attribution</label>
            <textarea
              id="gps-tile-attr"
              className="gpsmap-settings-control__textarea"
              value={displayTileAttr}
              placeholder="&copy; Contributors ..."
              rows={3}
              onChange={handleAttribChange}
            />
          </Elem>
          <Slider
            min={1}
            max={22}
            step={1}
            value={displayTileZoom}
            description={"Tile Layer Max Zoom"}
            info={"Maximum zoom level for the map tiles."}
            onChange={handleZoomChange}
          />
        </Elem>
        {renderLayerToggles()}
      </Elem>
    );
    return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
  };

  return (
    <Block name="gpsmap-settings-control" ref={buttonRef} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      <ControlButton look={isModalOpen ? "active" : undefined} onClick={toggleModal}>
        <span>
          <IconConfig />
        </span>
      </ControlButton>
      {isModalOpen && renderModal()}
    </Block>
  );
};
