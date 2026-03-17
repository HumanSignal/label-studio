import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigControl } from "../ConfigControl";
import { TimelineContext } from "../../Context";
import { FF_AUDIO_SPECTROGRAMS } from "../../../../utils/feature-flags";
import { mockFF } from "../../../../../__mocks__/global";

const ff = mockFF();

vi.mock("../../Controls", () => ({
  ControlButton: ({
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
}));

vi.mock("../Slider", () => ({
  Slider: ({
    value,
    onChange,
    description,
    min,
    max,
  }: {
    value: number;
    onChange: (e: React.FormEvent<HTMLInputElement>) => void;
    description: string;
    min: number;
    max: number;
  }) => (
    <div data-testid={`slider-${description.replace(/\s/g, "-").toLowerCase()}`}>
      <label>{description}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        data-testid={`slider-input-${description.replace(/\s/g, "-").toLowerCase()}`}
      />
    </div>
  ),
}));

vi.mock("../SpectrogramControl", () => ({
  SpectrogramControl: () => <div data-testid="spectrogram-control">Spectrogram</div>,
}));

vi.mock("@humansignal/ui", () => ({
  Toggle: ({
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange({ target: { checked: e.target.checked } })} />
    </label>
  ),
}));

vi.mock("@humansignal/icons", () => ({
  IconConfig: () => <span data-testid="icon-config">Config</span>,
}));

const defaultProps = {
  configModal: false,
  speed: 1,
  amp: 10,
  onSpeedChange: vi.fn(),
  onAmpChange: vi.fn(),
  waveform: {},
};

function renderWithContext(
  props: Partial<typeof defaultProps> = {},
  contextValue: { settings?: Record<string, unknown>; changeSetting?: (key: string, value: unknown) => void } = {},
) {
  const changeSetting = vi.fn();
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

describe("ConfigControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ff.setup();
  });

  afterEach(() => {
    ff.reset();
  });

  it("renders config button with aria-label Audio settings", () => {
    renderWithContext();
    const btn = screen.getByTestId("config-button");
    expect(btn).toHaveAttribute("aria-label", "Audio settings");
    expect(screen.getByTestId("icon-config")).toBeInTheDocument();
  });

  it("calls onSetModal when config button is clicked", async () => {
    const onSetModal = vi.fn();
    renderWithContext({ onSetModal });
    await userEvent.click(screen.getByTestId("config-button"));
    expect(onSetModal).toHaveBeenCalledTimes(1);
  });

  it("stops propagation on wrapper div click", async () => {
    const parentClick = vi.fn();
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
    await userEvent.click(screen.getByTestId("config-button"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("shows modal when configModal is true", () => {
    renderWithContext({ configModal: true });
    expect(screen.getByText("Playback Settings")).toBeInTheDocument();
    expect(screen.getByText("Loop Regions")).toBeInTheDocument();
    expect(screen.getByText("Auto-play New Regions")).toBeInTheDocument();
  });

  it("renders playback speed and audio zoom sliders in modal", () => {
    renderWithContext({ configModal: true, speed: 1.2, amp: 50 });
    expect(screen.getByTestId("slider-playback-speed")).toBeInTheDocument();
    expect(screen.getByTestId("slider-audio-zoom-y-axis")).toBeInTheDocument();
    const speedInput = screen.getByTestId("slider-input-playback-speed");
    const ampInput = screen.getByTestId("slider-input-audio-zoom-y-axis");
    expect(speedInput).toHaveValue("1.2");
    expect(ampInput).toHaveValue("50");
  });

  it("calls onSpeedChange when playback speed slider changes", () => {
    const onSpeedChange = vi.fn();
    renderWithContext({ configModal: true, onSpeedChange });
    const input = screen.getByTestId("slider-input-playback-speed");
    fireEvent.change(input, { target: { value: "1.5" } });
    expect(onSpeedChange).toHaveBeenCalledWith(1.5);
  });

  it("calls onAmpChange when audio zoom slider changes", () => {
    const onAmpChange = vi.fn();
    renderWithContext({ configModal: true, onAmpChange });
    const input = screen.getByTestId("slider-input-audio-zoom-y-axis");
    fireEvent.change(input, { target: { value: "20" } });
    expect(onAmpChange).toHaveBeenCalledWith(20);
  });

  it("does not call onSpeedChange when value is NaN", () => {
    const onSpeedChange = vi.fn();
    renderWithContext({ configModal: true, onSpeedChange });
    const input = screen.getByTestId("slider-input-playback-speed");
    fireEvent.change(input, { target: { value: "not-a-number" } });
    const nanCalls = onSpeedChange.mock.calls.filter((args) => Number.isNaN(args[0]));
    expect(nanCalls).toHaveLength(0);
  });

  it("calls changeSetting when Loop Regions toggle is changed", async () => {
    const changeSetting = vi.fn();
    renderWithContext({ configModal: true }, { settings: { loopRegion: false }, changeSetting });
    const toggle = screen.getByTestId("toggle-loop-regions").querySelector("input");
    expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle!);
    expect(changeSetting).toHaveBeenCalledWith("loopRegion", true);
  });

  it("calls changeSetting when Auto-play New Regions toggle is changed", async () => {
    const changeSetting = vi.fn();
    renderWithContext({ configModal: true }, { settings: { autoPlayNewSegments: false }, changeSetting });
    const toggle = screen.getByTestId("toggle-auto-play-new-regions").querySelector("input");
    await userEvent.click(toggle!);
    expect(changeSetting).toHaveBeenCalledWith("autoPlayNewSegments", true);
  });

  it("shows Hide/Show timeline and audio wave buttons in modal", () => {
    renderWithContext({ configModal: true });
    expect(screen.getByText("Hide timeline")).toBeInTheDocument();
    expect(screen.getByText("Hide audio wave")).toBeInTheDocument();
  });

  it("calls toggleVisibility when Hide timeline is clicked", async () => {
    const toggleVisibility = vi.fn();
    renderWithContext({ configModal: true, toggleVisibility });
    await userEvent.click(screen.getByText("Hide timeline"));
    expect(toggleVisibility).toHaveBeenCalledWith("timeline", false);
  });

  it("calls toggleVisibility for waveform and regions when Hide audio wave is clicked", async () => {
    const toggleVisibility = vi.fn();
    renderWithContext({ configModal: true, toggleVisibility });
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
    expect(screen.getByText("Show timeline")).toBeInTheDocument();
    expect(screen.getByText("Show audio wave")).toBeInTheDocument();
  });

  it("stops propagation when modal content is clicked", async () => {
    const parentClick = vi.fn();
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
    await userEvent.click(screen.getByText("Playback Settings"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("shows spectrogram section and Show spectrogram when FF_AUDIO_SPECTROGRAMS is on", () => {
    ff.set({ [FF_AUDIO_SPECTROGRAMS]: true });
    renderWithContext({ configModal: true });
    expect(screen.getByText("Spectrogram Settings")).toBeInTheDocument();
    expect(screen.getByTestId("spectrogram-control")).toBeInTheDocument();
    expect(screen.getByText("Show spectrogram")).toBeInTheDocument();
  });

  it("calls toggleVisibility for spectrogram when Show spectrogram is clicked and FF on", async () => {
    ff.set({ [FF_AUDIO_SPECTROGRAMS]: true });
    const toggleVisibility = vi.fn();
    renderWithContext({ configModal: true, toggleVisibility });
    await userEvent.click(screen.getByText("Show spectrogram"));
    expect(toggleVisibility).toHaveBeenCalledWith("spectrogram", true);
  });

  it("renders without toggleVisibility when not provided", async () => {
    renderWithContext({ configModal: true });
    await userEvent.click(screen.getByText("Hide timeline"));
    expect(screen.getByText("Show timeline")).toBeInTheDocument();
  });
});
