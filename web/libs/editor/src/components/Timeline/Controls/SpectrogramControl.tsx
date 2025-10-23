import type React from "react";
import { type FC, useContext, useEffect, useMemo, useState } from "react";
import { Tooltip, Select } from "@humansignal/ui";
import { cn } from "../../../utils/bem";
import { Range } from "../../../common/Range/Range";
import { IconInfoConfig, IconWarningCircleFilled } from "@humansignal/icons";
import { TimelineContext } from "../Context";
import { Slider } from "./Slider";
import "./SpectrogramControl.scss";
import colormap from "colormap";

// Define Scale Options Type
type SpectrogramScale = "linear" | "log" | "mel";

// Default values
const DEFAULT_FFT_VALUE = 512;
const DEFAULT_MEL_VALUE = 64;
const DEFAULT_WINDOWING_FUNCTION = "blackman";
const DEFAULT_COLOR_SCHEME = "viridis";
const DEFAULT_MIN_DB = -80;
const DEFAULT_MAX_DB = -10;
const DEFAULT_SCALE: SpectrogramScale = "mel";

// FFT Samples Setup
const FFT_SAMPLE_VALUES = [64, 128, 256, 512, 1024, 2048];
const FFT_MARKS = FFT_SAMPLE_VALUES.reduce(
  (acc, val, index) => {
    acc[index] = val.toString();
    return acc;
  },
  {} as Record<number, string>,
);
const DEFAULT_FFT_INDEX = FFT_SAMPLE_VALUES.indexOf(DEFAULT_FFT_VALUE);

// Helper function
const findBestMelBandValue = (fftSize: number): number => {
  const maxAllowedMel = fftSize / 4 - 1;
  return Math.min(maxAllowedMel, DEFAULT_MEL_VALUE);
};

// Windowing Options
const WINDOWING_OPTIONS = [
  { value: "hann", label: "Hann" },
  { value: "hamming", label: "Hamming" },
  { value: "blackman", label: "Blackman" },
  { value: "sine", label: "Sine" },
  { value: "rectangular", label: "Rectangular" },
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

// Generate COLOR_SCHEME_OPTIONS with label + box
const COLOR_SCHEME_OPTIONS: { label: React.ReactNode; value: string; key: string }[] = [
  { label: renderColorSchemeOption("Autumn", getColorSchemeGradient("autumn")), value: "autumn", key: "autumn" },
  {
    label: renderColorSchemeOption("Bathymetry", getColorSchemeGradient("bathymetry")),
    value: "bathymetry",
    key: "bathymetry",
  },
  {
    label: renderColorSchemeOption("Blackbody", getColorSchemeGradient("blackbody")),
    value: "blackbody",
    key: "blackbody",
  },
  { label: renderColorSchemeOption("BlueRed", getColorSchemeGradient("bluered")), value: "bluered", key: "bluered" },
  { label: renderColorSchemeOption("Bone", getColorSchemeGradient("bone")), value: "bone", key: "bone" },
  { label: renderColorSchemeOption("CDOM", getColorSchemeGradient("cdom")), value: "cdom", key: "cdom" },
  {
    label: renderColorSchemeOption("Chlorophyll", getColorSchemeGradient("chlorophyll")),
    value: "chlorophyll",
    key: "chlorophyll",
  },
  { label: renderColorSchemeOption("Cool", getColorSchemeGradient("cool")), value: "cool", key: "cool" },
  { label: renderColorSchemeOption("Copper", getColorSchemeGradient("copper")), value: "copper", key: "copper" },
  {
    label: renderColorSchemeOption("Cubehelix", getColorSchemeGradient("cubehelix")),
    value: "cubehelix",
    key: "cubehelix",
  },
  { label: renderColorSchemeOption("Density", getColorSchemeGradient("density")), value: "density", key: "density" },
  { label: renderColorSchemeOption("Earth", getColorSchemeGradient("earth")), value: "earth", key: "earth" },
  {
    label: renderColorSchemeOption("Electric", getColorSchemeGradient("electric")),
    value: "electric",
    key: "electric",
  },
  {
    label: renderColorSchemeOption("Freesurface Blue", getColorSchemeGradient("freesurface-blue")),
    value: "freesurface-blue",
    key: "freesurface-blue",
  },
  {
    label: renderColorSchemeOption("Freesurface Red", getColorSchemeGradient("freesurface-red")),
    value: "freesurface-red",
    key: "freesurface-red",
  },
  { label: renderColorSchemeOption("Greens", getColorSchemeGradient("greens")), value: "greens", key: "greens" },
  { label: renderColorSchemeOption("Greys", getColorSchemeGradient("greys")), value: "greys", key: "greys" },
  { label: renderColorSchemeOption("Hot", getColorSchemeGradient("hot")), value: "hot", key: "hot" },
  { label: renderColorSchemeOption("HSV", getColorSchemeGradient("hsv")), value: "hsv", key: "hsv" },
  { label: renderColorSchemeOption("Inferno", getColorSchemeGradient("inferno")), value: "inferno", key: "inferno" },
  { label: renderColorSchemeOption("Jet", getColorSchemeGradient("jet")), value: "jet", key: "jet" },
  { label: renderColorSchemeOption("Magma", getColorSchemeGradient("magma")), value: "magma", key: "magma" },
  { label: renderColorSchemeOption("Oxygen", getColorSchemeGradient("oxygen")), value: "oxygen", key: "oxygen" },
  { label: renderColorSchemeOption("PAR", getColorSchemeGradient("par")), value: "par", key: "par" },
  { label: renderColorSchemeOption("Phase", getColorSchemeGradient("phase")), value: "phase", key: "phase" },
  { label: renderColorSchemeOption("Picnic", getColorSchemeGradient("picnic")), value: "picnic", key: "picnic" },
  { label: renderColorSchemeOption("Plasma", getColorSchemeGradient("plasma")), value: "plasma", key: "plasma" },
  {
    label: renderColorSchemeOption("Portland", getColorSchemeGradient("portland")),
    value: "portland",
    key: "portland",
  },
  { label: renderColorSchemeOption("Rainbow", getColorSchemeGradient("rainbow")), value: "rainbow", key: "rainbow" },
  {
    label: renderColorSchemeOption("Rainbow Soft", getColorSchemeGradient("rainbow-soft")),
    value: "rainbow-soft",
    key: "rainbow-soft",
  },
  { label: renderColorSchemeOption("RdBu", getColorSchemeGradient("RdBu")), value: "RdBu", key: "RdBu" },
  {
    label: renderColorSchemeOption("Salinity", getColorSchemeGradient("salinity")),
    value: "salinity",
    key: "salinity",
  },
  { label: renderColorSchemeOption("Spring", getColorSchemeGradient("spring")), value: "spring", key: "spring" },
  { label: renderColorSchemeOption("Summer", getColorSchemeGradient("summer")), value: "summer", key: "summer" },
  {
    label: renderColorSchemeOption("Temperature", getColorSchemeGradient("temperature")),
    value: "temperature",
    key: "temperature",
  },
  {
    label: renderColorSchemeOption("Turbidity", getColorSchemeGradient("turbidity")),
    value: "turbidity",
    key: "turbidity",
  },
  {
    label: renderColorSchemeOption("Velocity Blue", getColorSchemeGradient("velocity-blue")),
    value: "velocity-blue",
    key: "velocity-blue",
  },
  {
    label: renderColorSchemeOption("Velocity Green", getColorSchemeGradient("velocity-green")),
    value: "velocity-green",
    key: "velocity-green",
  },
  { label: renderColorSchemeOption("Viridis", getColorSchemeGradient("viridis")), value: "viridis", key: "viridis" },
  { label: renderColorSchemeOption("Warm", getColorSchemeGradient("warm")), value: "warm", key: "warm" },
  { label: renderColorSchemeOption("Winter", getColorSchemeGradient("winter")), value: "winter", key: "winter" },
  { label: renderColorSchemeOption("YIGnBu", getColorSchemeGradient("YIGnBu")), value: "YIGnBu", key: "YIGnBu" },
  { label: renderColorSchemeOption("YIOrRd", getColorSchemeGradient("YIOrRd")), value: "YIOrRd", key: "YIOrRd" },
].sort((a, b) => a.value.localeCompare(b.value));

// Scale Options
const SCALE_OPTIONS: { label: string; value: SpectrogramScale }[] = [
  { value: "linear", label: "Linear Frequency" },
  { value: "log", label: "Logarithmic Frequency" },
  { value: "mel", label: "Mel Scale" },
];

export interface SpectrogramControlProps {
  waveform: Waveform;
}

type Waveform = {};

export const SpectrogramControl: FC<SpectrogramControlProps> = ({ waveform }) => {
  const { settings, changeSetting } = useContext(TimelineContext);
  const [fftInputText, setFftInputText] = useState<string>(DEFAULT_FFT_VALUE.toString());
  const [fftInputError, setFftInputError] = useState<boolean>(false);

  // Calculate initial index based on current value from settings
  const currentFftValue = useMemo(
    () => settings?.spectrogramFftSamples ?? DEFAULT_FFT_VALUE,
    [settings?.spectrogramFftSamples],
  );
  const initialFftIndex = useMemo(() => {
    const index = FFT_SAMPLE_VALUES.indexOf(currentFftValue);
    return index !== -1 ? index : DEFAULT_FFT_INDEX !== -1 ? DEFAULT_FFT_INDEX : 3;
  }, [currentFftValue]);

  // State for the slider's current index
  const [fftSliderIndex, setFftSliderIndex] = useState(initialFftIndex);

  // Initialize displayColorScheme from settings
  const [displayColorScheme, setDisplayColorScheme] = useState(
    settings?.spectrogramColorScheme ?? DEFAULT_COLOR_SCHEME,
  );

  // Initialize displayDbRange from settings
  const [displayMinDb, setDisplayMinDb] = useState(settings?.spectrogramMinDb ?? DEFAULT_MIN_DB);
  const [displayMaxDb, setDisplayMaxDb] = useState(settings?.spectrogramMaxDb ?? DEFAULT_MAX_DB);

  // Add state for the scale
  const [displayScale, setDisplayScale] = useState<SpectrogramScale>(settings?.spectrogramScale ?? DEFAULT_SCALE);

  useEffect(() => {
    setFftInputText(currentFftValue.toString());
    setFftInputError(false);
  }, [currentFftValue]);

  // Update local state when settings change
  useEffect(() => {
    const newColorScheme = settings?.spectrogramColorScheme;
    if (newColorScheme && newColorScheme !== displayColorScheme) {
      setDisplayColorScheme(newColorScheme);
    }
  }, [settings?.spectrogramColorScheme]);

  useEffect(() => {
    const newMinDb = settings?.spectrogramMinDb;
    const newMaxDb = settings?.spectrogramMaxDb;
    if (newMinDb !== undefined && newMinDb !== displayMinDb) {
      setDisplayMinDb(newMinDb);
    }
    if (newMaxDb !== undefined && newMaxDb !== displayMaxDb) {
      setDisplayMaxDb(newMaxDb);
    }
  }, [settings?.spectrogramMinDb, settings?.spectrogramMaxDb]);

  // Update local scale state when settings change
  useEffect(() => {
    const newScale = settings?.spectrogramScale;
    if (newScale && newScale !== displayScale) {
      setDisplayScale(newScale);
    }
  }, [settings?.spectrogramScale]);

  // Effect to sync local slider state with external changes
  useEffect(() => {
    setFftSliderIndex(initialFftIndex);
    setFftInputText(FFT_SAMPLE_VALUES[initialFftIndex]?.toString() ?? DEFAULT_FFT_VALUE.toString());
    setFftInputError(false);
  }, [initialFftIndex]);

  const handleChangeFftSamples = (e: React.FormEvent<HTMLInputElement> | number) => {
    const sliderIndex =
      typeof e === "number" ? e : Number.parseInt((e as React.FormEvent<HTMLInputElement>).currentTarget.value);
    if (!isNaN(sliderIndex)) {
      const clampedIndex = Math.max(0, Math.min(sliderIndex, FFT_SAMPLE_VALUES.length - 1));
      const actualFftValue = FFT_SAMPLE_VALUES[clampedIndex];

      if (actualFftValue !== undefined) {
        changeSetting?.("spectrogramFftSamples", actualFftValue);

        const targetMelValue = findBestMelBandValue(actualFftValue);
        const currentMelValueFromState = settings?.numberOfMelBands ?? DEFAULT_MEL_VALUE;
        if (targetMelValue !== currentMelValueFromState) {
          changeSetting?.("numberOfMelBands", targetMelValue);
        }
      }
    }
  };

  const handleChangeNumberOfMelBands = (e: React.FormEvent<HTMLInputElement> | number) => {
    const actualMelValue =
      typeof e === "number" ? e : Number.parseInt((e as React.FormEvent<HTMLInputElement>).currentTarget.value);
    if (!isNaN(actualMelValue)) {
      changeSetting?.("numberOfMelBands", actualMelValue);
    }
  };

  const handleChangeWindowingFunction = (value: string) => {
    changeSetting?.("spectrogramWindowingFunction", value);
  };

  const handleChangeColorScheme = (value: string) => {
    setDisplayColorScheme(value);
    changeSetting?.("spectrogramColorScheme", value);
  };

  const handleChangeScale = (value: SpectrogramScale) => {
    setDisplayScale(value);
    changeSetting?.("spectrogramScale", value);
  };

  const handleFftInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    setFftInputText(inputText);

    const parsedValue = Number.parseInt(inputText);

    if (!isNaN(parsedValue) && FFT_SAMPLE_VALUES.includes(parsedValue)) {
      setFftInputError(false);
      const index = FFT_SAMPLE_VALUES.indexOf(parsedValue);
      handleChangeFftSamples(index);
    } else {
      setFftInputError(true);
    }
  };

  const handleChangeFftSamplesSlider = (e: React.FormEvent<HTMLInputElement> | number) => {
    const sliderIndex =
      typeof e === "number" ? e : Number.parseInt((e as React.FormEvent<HTMLInputElement>).currentTarget.value);
    if (!isNaN(sliderIndex)) {
      const clampedIndex = Math.max(0, Math.min(sliderIndex, FFT_SAMPLE_VALUES.length - 1));
      const actualFftValue = FFT_SAMPLE_VALUES[clampedIndex];

      if (actualFftValue !== undefined) {
        changeSetting?.("spectrogramFftSamples", actualFftValue);

        // Update local slider index state
        setFftSliderIndex(clampedIndex);
        setFftInputText(actualFftValue.toString());
        setFftInputError(false);

        const targetMelValue = findBestMelBandValue(actualFftValue);
        const currentMelValueFromState = settings?.numberOfMelBands ?? DEFAULT_MEL_VALUE;
        if (targetMelValue !== currentMelValueFromState) {
          changeSetting?.("numberOfMelBands", targetMelValue);
        }
      }
    }
  };

  const [lastUpdate, setLastUpdate] = useState<{ min: number; max: number; time: number } | null>(null);

  const handleDbRangeChange = (values: number[]) => {
    if (!Array.isArray(values) || values.length !== 2) {
      return;
    }

    const [newMinDb, newMaxDb] = values;

    // Basic validation
    if (isNaN(newMinDb) || isNaN(newMaxDb) || newMinDb >= newMaxDb) {
      return;
    }

    // Prevent rapid updates with unstable values
    const currentTime = Date.now();
    if (lastUpdate && currentTime - lastUpdate.time < 100) {
      // If we're getting a quick update that would change max when we're moving min
      if (lastUpdate.min === newMinDb && lastUpdate.max !== newMaxDb && newMaxDb !== displayMaxDb) {
        return;
      }
      // If we're getting a quick update that would change min when we're moving max
      if (lastUpdate.max === newMaxDb && lastUpdate.min !== newMinDb && newMinDb !== displayMinDb) {
        return;
      }
    }

    // Update last update time
    setLastUpdate({ min: newMinDb, max: newMaxDb, time: currentTime });

    // Update local state
    setDisplayMinDb(newMinDb);
    setDisplayMaxDb(newMaxDb);

    // Update context settings
    changeSetting?.("spectrogramMinDb", newMinDb);
    changeSetting?.("spectrogramMaxDb", newMaxDb);
  };

  const handleRangeChange = (value: string | number | number[]) => {
    // Convert string or single number to array if needed
    const valueArray = Array.isArray(value) ? value : [Number(value)];

    if (!Array.isArray(valueArray) || valueArray.length !== 2) return;

    let [newMin, newMax] = valueArray.map(Math.round);

    // Determine which handle is moving
    const isMinMoving = newMin !== displayMinDb;
    const isMaxMoving = newMax !== displayMaxDb;

    // If only min is moving, preserve current max
    if (isMinMoving && !isMaxMoving) {
      newMax = displayMaxDb;
    }
    // If only max is moving, preserve current min
    else if (isMaxMoving && !isMinMoving) {
      newMin = displayMinDb;
    }

    // Ensure values stay within bounds
    newMin = Math.max(-120, Math.min(0, newMin));
    newMax = Math.max(-120, Math.min(0, newMax));

    // Ensure min is always less than max
    if (newMin >= newMax) {
      if (isMinMoving) {
        newMin = Math.min(newMin, newMax - 1);
      } else {
        newMax = Math.max(newMax, newMin + 1);
      }
    }
    handleDbRangeChange([newMin, newMax]);
  };

  const showWarning =
    Number(fftInputText) > 1024 || (displayScale === "mel" && (settings?.numberOfMelBands ?? DEFAULT_MEL_VALUE) > 140);

  const fftInfoText = "Higher values provide more frequency resolution but increase computation.";
  const displayMelBands = settings?.numberOfMelBands ?? DEFAULT_MEL_VALUE;
  const displayWindowFunc = settings?.spectrogramWindowingFunction ?? DEFAULT_WINDOWING_FUNCTION;
  const isMelScaleSelected = displayScale === "mel";

  return (
    <div className={cn("spectrogram-controls").toClassName()}>
      {showWarning && (
        <Tooltip title="High FFT or mel band values may cause performance issues or artifacts.">
          <IconWarningCircleFilled
            style={{
              color: "var(--color-warning-icon, #faad14)",
              position: "absolute",
              top: 1,
              right: 15,
              width: 22,
              zIndex: 10,
              cursor: "pointer",
              filter: "drop-shadow(0 2px 6px var(--color-warning-shadow, rgba(0,0,0,0.25)))",
              transition: "color 0.2s",
            }}
          />
        </Tooltip>
      )}
      <div className={cn("spectrogram-controls").elem("slider-container").toClassName()}>
        <Slider
          min={0}
          max={FFT_SAMPLE_VALUES.length - 1}
          step={1}
          value={fftSliderIndex}
          showInput={false}
          onChange={handleChangeFftSamplesSlider}
        />
        <div className={cn("spectrogram-controls").elem("control").toClassName()}>
          <div className={cn("spectrogram-controls").elem("info").toClassName()}>
            FFT Samples
            <Tooltip title={fftInfoText}>
              <IconInfoConfig />
            </Tooltip>
          </div>
          <input
            className={cn("spectrogram-controls").elem("input").mod({ error: fftInputError }).toClassName()}
            type="text"
            value={fftInputText}
            onChange={handleFftInputChange}
          />
        </div>
      </div>
      <div className={cn("spectrogram-controls").elem("spectrogram-controls").toClassName()}>
        <div className={cn("spectrogram-controls").elem("info").toClassName()}>
          Scale
          <Tooltip title="Determines the frequency scale mapping: Linear, Logarithmic, or Mel (perceptual).">
            <IconInfoConfig />
          </Tooltip>
        </div>
        <Select value={displayScale} onChange={handleChangeScale} options={SCALE_OPTIONS} style={{ width: "100%" }} />
      </div>
      {isMelScaleSelected && (
        <div className={cn("spectrogram-controls").elem("spectrogram-controls").toClassName()}>
          <Slider
            min={20}
            max={220}
            step={1}
            value={displayMelBands}
            description={"Number of Mel Bands"}
            info={"Specifies the number of frequency bands using the Mel scale. "}
            onChange={handleChangeNumberOfMelBands}
          />
        </div>
      )}
      <div className={cn("spectrogram-controls").elem("spectrogram-controls").toClassName()}>
        <Range
          multi
          continuous
          min={-120}
          max={0}
          step={1}
          value={[displayMinDb, displayMaxDb]}
          resetValue={[DEFAULT_MIN_DB, DEFAULT_MAX_DB]}
          onChange={handleRangeChange}
          size={200}
        />
        <div className={cn("spectrogram-controls").elem("control").toClassName()}>
          <div className={cn("spectrogram-controls").elem("info").toClassName()}>
            Spectogram dB
            <Tooltip title="Controls the range of decibel values shown in the spectrogram. Lower values show quieter sounds.">
              <IconInfoConfig />
            </Tooltip>
          </div>
          <div className={cn("spectrogram-controls").elem("input-group").toClassName()}>
            <input
              className={cn("spectrogram-controls").elem("input").toClassName()}
              type="number"
              value={displayMinDb}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = Number(e.target.value);
                if (!isNaN(value) && value <= displayMaxDb - 10) {
                  handleDbRangeChange([value, displayMaxDb]);
                }
              }}
              min={-120}
              max={displayMaxDb - 10}
            />
            <span className={cn("spectrogram-controls").elem("separator").toClassName()}>to</span>
            <input
              className={cn("spectrogram-controls").elem("input").toClassName()}
              type="number"
              value={displayMaxDb}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = Number(e.target.value);
                if (!isNaN(value) && value >= displayMinDb + 10) {
                  handleDbRangeChange([displayMinDb, value]);
                }
              }}
              min={displayMinDb + 10}
              max={0}
            />
          </div>
        </div>
      </div>
      <div className={cn("spectrogram-controls").elem("spectrogram-controls").toClassName()}>
        <div className={cn("spectrogram-controls").elem("label").toClassName()}>Windowing Function</div>
        <Select
          value={displayWindowFunc}
          onChange={handleChangeWindowingFunction}
          options={WINDOWING_OPTIONS}
          style={{ width: "100%" }}
        />
      </div>
      <div className={cn("spectrogram-controls").elem("spectrogram-controls").toClassName()}>
        <div className={cn("spectrogram-controls").elem("label").toClassName()}>Color Scheme</div>
        <Select
          value={displayColorScheme}
          onChange={handleChangeColorScheme}
          style={{
            width: "100%",
          }}
          options={COLOR_SCHEME_OPTIONS}
          listHeight={320}
          className="color-scheme-select"
        />
      </div>
    </div>
  );
};
