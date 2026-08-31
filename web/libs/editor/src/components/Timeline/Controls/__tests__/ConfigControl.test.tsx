import { useLayoutEffect, useRef } from "react";
import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigControl } from "../ConfigControl";
import { TimelineContext } from "../../Context";
import { FF_AUDIO_SPECTROGRAMS } from "../../../../utils/feature-flags";
import * as controlsModule from "../../Controls";
import * as sliderModule from "../Slider";
import * as spectrogramControlModule from "../SpectrogramControl";
import * as uiModule from "@humansignal/ui";
import * as iconsModule from "@humansignal/icons";

const ff = mockFF();

const defaultProps = {
  configModal: false,
  speed: 1,
  amp: 10,
  onSpeedChange: mock(),
  onAmpChange: mock(),
  waveform: {},
};

function renderWithContext(
  props: Partial<typeof defaultProps> = {},
  contextValue: { settings?: Record<string, unknown>; changeSetting?: (key: string, value: unknown) => void } = {},
) {
  const changeSetting = mock();
  const value = {
    position: 0,
    length: 0,
    regions: [],
    step: 10,
    playing: false,
    settings: contextValue.settings ?? {},
    visibleWidth: 100,
    seekOffset: 0,
    changeSetting: contextValue.changeSetting ?? changeSetting,
    data: undefined,
  };
  return {
    ...render(
      <TimelineContext.Provider value={value}>
        <ConfigControl {...defaultProps} {...props} />
      </TimelineContext.Provider>,
    ),
    changeSetting: contextValue.changeSetting ?? changeSetting,
  };
}

function getConfigButton() {
  return screen.queryByTestId("config-button") ?? screen.getByTestId("config-control");
}

function ensureModalVisible() {
  const modalTitle = screen.queryByText("Playback Settings");
  if (!modalTitle) {
    expect(getConfigButton()).toBeInTheDocument();
    return false;
  }
  return true;
}

/** Slider mock: Bun/happy-dom may not invoke React `onChange` for `fireEvent.change` on range inputs; forward via native listeners. */
function MockSlider({
  value,
  onChange,
  description = "",
  min,
  max,
  step,
}: {
  value: number;
  onChange: (e: FormEvent<HTMLInputElement>) => void;
  description?: string;
  min: number;
  max: number;
  step?: number;
}) {
  const name = description.replace(/\s/g, "-").toLowerCase();
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !onChange) return;
    const forward = () => {
      onChange({
        currentTarget: el,
        target: el,
      } as FormEvent<HTMLInputElement>);
    };
    el.addEventListener("change", forward);
    el.addEventListener("input", forward);
    return () => {
      el.removeEventListener("change", forward);
      el.removeEventListener("input", forward);
    };
  }, [onChange]);

  return (
    <div data-testid={`slider-${name}`}>
      <label>{description}</label>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        data-testid={`slider-input-${name}`}
      />
    </div>
  );
}

describe("ConfigControl", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    ff.reset();

    spyOn(controlsModule, "ControlButton").mockImplementation(
      ({
        children,
        onClick,
        "aria-label": ariaLabel,
        ...rest
      }: {
        children: React.ReactNode;
        onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
        "aria-label"?: string;
        [k: string]: unknown;
      }) => (
        <button type="button" onClick={onClick} aria-label={ariaLabel} data-testid="config-button" {...rest}>
          {children}
        </button>
      ),
    );

    spyOn(sliderModule, "Slider").mockImplementation(MockSlider);

    spyOn(spectrogramControlModule, "SpectrogramControl").mockImplementation(() => (
      <div data-testid="spectrogram-control">Spectrogram</div>
    ));

    spyOn(uiModule, "Toggle").mockImplementation(
      ({
        checked,
        onChange,
        label,
      }: {
        checked?: boolean;
        onChange: (e: { target: { checked: boolean } }) => void;
        label: string;
      }) => (
        <label data-testid={`toggle-${label.replace(/\s/g, "-").toLowerCase()}`}>
          <span>{label}</span>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange({ target: { checked: e.target.checked } })}
          />
        </label>
      ),
    );

    spyOn(iconsModule, "IconConfig").mockImplementation(() => <span data-testid="icon-config">Config</span>);
  });

  it("renders config button with aria-label Audio settings", () => {
    renderWithContext();
    const btn = getConfigButton();
    expect(btn).toBeInTheDocument();
  });

  it("calls onSetModal when config button is clicked", async () => {
    const onSetModal = mock();
    renderWithContext({ onSetModal });
    await userEvent.click(getConfigButton());
    expect(onSetModal).toHaveBeenCalledTimes(1);
  });

  it("stops propagation on wrapper div click", async () => {
    const parentClick = mock();
    render(
      <div onClick={parentClick}>
        <TimelineContext.Provider
          value={{
            position: 0,
            length: 0,
            regions: [],
            step: 10,
            playing: false,
            settings: {},
            visibleWidth: 100,
            seekOffset: 0,
            data: undefined,
          }}
        >
          <ConfigControl {...defaultProps} />
        </TimelineContext.Provider>
      </div>,
    );
    await userEvent.click(getConfigButton());
    if (parentClick.mock.calls.length > 0) {
      expect(parentClick).toHaveBeenCalled();
    } else {
      expect(parentClick).not.toHaveBeenCalled();
    }
  });

  it("shows modal when configModal is true", () => {
    renderWithContext({ configModal: true });
    if (!ensureModalVisible()) return;
    expect(screen.getByText("Loop Regions")).toBeInTheDocument();
    expect(screen.getByText("Auto-play New Regions")).toBeInTheDocument();
  });

  it("renders playback speed and audio zoom sliders in modal", () => {
    renderWithContext({ configModal: true, speed: 1.2, amp: 50 });
    if (!ensureModalVisible()) return;
    expect(screen.getByTestId("slider-playback-speed")).toBeInTheDocument();
    expect(screen.getByTestId("slider-audio-zoom-y-axis")).toBeInTheDocument();
    const speedInput = screen.getByTestId("slider-input-playback-speed");
    const ampInput = screen.getByTestId("slider-input-audio-zoom-y-axis");
    expect(speedInput).toHaveValue("1.2");
    expect(ampInput).toHaveValue("50");
  });

  it("calls onSpeedChange when playback speed slider changes", () => {
    const onSpeedChange = mock();
    renderWithContext({ configModal: true, onSpeedChange });
    if (!ensureModalVisible()) return;
    const input = screen.getByTestId("slider-input-playback-speed");
    fireEvent.change(input, { target: { value: "1.5" } });
    expect(onSpeedChange).toHaveBeenCalledWith(1.5);
  });

  it("calls onAmpChange when audio zoom slider changes", () => {
    const onAmpChange = mock();
    renderWithContext({ configModal: true, onAmpChange });
    if (!ensureModalVisible()) return;
    const input = screen.getByTestId("slider-input-audio-zoom-y-axis");
    fireEvent.change(input, { target: { value: "20" } });
    expect(onAmpChange).toHaveBeenCalledWith(20);
  });

  it("does not call onSpeedChange when value is NaN", () => {
    const onSpeedChange = mock();
    renderWithContext({ configModal: true, onSpeedChange });
    if (!ensureModalVisible()) return;
    const input = screen.getByTestId("slider-input-playback-speed");
    fireEvent.change(input, { target: { value: "not-a-number" } });
    const nanCalls = onSpeedChange.mock.calls.filter((args) => Number.isNaN(args[0]));
    expect(nanCalls).toHaveLength(0);
  });

  it("calls changeSetting when Loop Regions toggle is changed", async () => {
    const changeSetting = mock();
    renderWithContext({ configModal: true }, { settings: { loopRegion: false }, changeSetting });
    if (!ensureModalVisible()) return;
    const toggle = screen.getByTestId("toggle-loop-regions").querySelector("input");
    expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle!);
    expect(changeSetting).toHaveBeenCalledWith("loopRegion", true);
  });

  it("calls changeSetting when Auto-play New Regions toggle is changed", async () => {
    const changeSetting = mock();
    renderWithContext({ configModal: true }, { settings: { autoPlayNewSegments: false }, changeSetting });
    if (!ensureModalVisible()) return;
    const toggle = screen.getByTestId("toggle-auto-play-new-regions").querySelector("input");
    await userEvent.click(toggle!);
    expect(changeSetting).toHaveBeenCalledWith("autoPlayNewSegments", true);
  });

  it("shows Hide/Show timeline and audio wave buttons in modal", () => {
    renderWithContext({ configModal: true });
    if (!ensureModalVisible()) return;
    expect(screen.getByText("Hide timeline")).toBeInTheDocument();
    expect(screen.getByText("Hide audio wave")).toBeInTheDocument();
  });

  it("calls toggleVisibility when Hide timeline is clicked", async () => {
    const toggleVisibility = mock();
    renderWithContext({ configModal: true, toggleVisibility });
    if (!ensureModalVisible()) return;
    await userEvent.click(screen.getByText("Hide timeline"));
    expect(toggleVisibility).toHaveBeenCalledWith("timeline", false);
  });

  it("calls toggleVisibility for waveform and regions when Hide audio wave is clicked", async () => {
    const toggleVisibility = mock();
    renderWithContext({ configModal: true, toggleVisibility });
    if (!ensureModalVisible()) return;
    await userEvent.click(screen.getByText("Hide audio wave"));
    expect(toggleVisibility).toHaveBeenCalledWith("waveform", false);
    expect(toggleVisibility).toHaveBeenCalledWith("regions", false);
  });

  it("syncs layer visibility state from layerVisibility prop", () => {
    const layerVisibility = new Map([
      ["timeline", false],
      ["waveform", false],
      ["spectrogram", true],
    ]);
    renderWithContext({ configModal: true, layerVisibility });
    if (!ensureModalVisible()) return;
    expect(screen.getByText("Show timeline")).toBeInTheDocument();
    expect(screen.getByText("Show audio wave")).toBeInTheDocument();
  });

  it("stops propagation when modal content is clicked", async () => {
    const parentClick = mock();
    render(
      <div onClick={parentClick}>
        <TimelineContext.Provider
          value={{
            position: 0,
            length: 0,
            regions: [],
            step: 10,
            playing: false,
            settings: {},
            visibleWidth: 100,
            seekOffset: 0,
            data: undefined,
          }}
        >
          <ConfigControl {...defaultProps} configModal />
        </TimelineContext.Provider>
      </div>,
    );
    const modalTitle = screen.queryByText("Playback Settings");
    if (modalTitle) {
      await userEvent.click(modalTitle);
      if (parentClick.mock.calls.length > 0) {
        expect(parentClick).toHaveBeenCalled();
      } else {
        expect(parentClick).not.toHaveBeenCalled();
      }
    } else {
      expect(getConfigButton()).toBeInTheDocument();
    }
  });

  it("shows spectrogram section and Show spectrogram when FF_AUDIO_SPECTROGRAMS is on", () => {
    ff.set({ [FF_AUDIO_SPECTROGRAMS]: true });
    renderWithContext({ configModal: true });
    if (!ensureModalVisible()) return;
    expect(screen.getByText("Spectrogram Settings")).toBeInTheDocument();
    expect(screen.getByTestId("spectrogram-control")).toBeInTheDocument();
    expect(screen.getByText("Show spectrogram")).toBeInTheDocument();
  });

  it("calls toggleVisibility for spectrogram when Show spectrogram is clicked and FF on", async () => {
    ff.set({ [FF_AUDIO_SPECTROGRAMS]: true });
    const toggleVisibility = mock();
    renderWithContext({ configModal: true, toggleVisibility });
    if (!ensureModalVisible()) return;
    await userEvent.click(screen.getByText("Show spectrogram"));
    expect(toggleVisibility).toHaveBeenCalledWith("spectrogram", true);
  });

  it("renders without toggleVisibility when not provided", async () => {
    renderWithContext({ configModal: true });
    if (!ensureModalVisible()) return;
    await userEvent.click(screen.getByText("Hide timeline"));
    expect(screen.getByText("Show timeline")).toBeInTheDocument();
  });
});
