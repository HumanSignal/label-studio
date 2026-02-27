import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Controls, ControlButton } from "../Controls";
import { TimelineContext } from "../Context";

jest.mock("../Controls/ConfigControl", () => ({
  ConfigControl: ({
    onSetModal,
    configModal,
  }: {
    onSetModal: (e: React.MouseEvent<HTMLButtonElement>) => void;
    configModal: boolean;
  }) => (
    <button type="button" data-testid="config-control" onClick={onSetModal}>
      Config {configModal ? "open" : "closed"}
    </button>
  ),
}));

jest.mock("../Controls/AudioControl", () => ({
  AudioControl: ({
    onSetModal,
    audioModal,
  }: {
    onSetModal: (e: React.MouseEvent<HTMLButtonElement>) => void;
    audioModal: boolean;
  }) => (
    <button type="button" data-testid="audio-control" onClick={onSetModal}>
      Audio {audioModal ? "open" : "closed"}
    </button>
  ),
}));

jest.mock("../../TimeDurationControl/TimeDurationControl", () => ({
  TimeDurationControl: ({
    onChangeStartTime,
    currentTime,
  }: {
    onChangeStartTime?: (v: number) => void;
    currentTime?: number;
  }) => (
    <div data-testid="time-duration-control">
      <input
        type="number"
        data-testid="time-duration-input"
        defaultValue={currentTime}
        onChange={(e) => onChangeStartTime?.(Number(e.target.value))}
      />
    </div>
  ),
}));

jest.mock("../../../common/Hotkey/WithHotkey", () => ({
  WithHotkey: ({ children }: { children: React.ReactNode; binging?: string; hotkeyScope?: string }) => <>{children}</>,
}));

jest.mock("../SideControls", () => ({
  FramesControl: ({ onPositionChange }: { onPositionChange?: (p: number) => void }) => (
    <button type="button" data-testid="frames-control" onClick={() => onPositionChange?.(5)}>
      Frames
    </button>
  ),
  AudioVolumeControl: () => <div data-testid="audio-volume-control">Volume</div>,
}));

const defaultContextValue = {
  position: 1,
  length: 100,
  regions: [],
  step: 10,
  playing: false,
  visibleWidth: 100,
  seekOffset: 0,
  settings: {},
  data: undefined,
};

const defaultProps = {
  length: 100,
  position: 1,
  frameRate: 24,
  playing: false,
  collapsed: false,
  fullscreen: false,
  mediaType: "video" as const,
  onRewind: jest.fn(),
  onForward: jest.fn(),
  onPositionChange: jest.fn(),
  onToggleCollapsed: jest.fn(),
  onStepBackward: jest.fn(),
  onStepForward: jest.fn(),
  onFullScreenToggle: jest.fn(),
};

function renderControls(
  props: Partial<typeof defaultProps> = {},
  contextValue: Partial<typeof defaultContextValue> = {},
) {
  const value = { ...defaultContextValue, ...contextValue };
  return render(
    <TimelineContext.Provider value={value}>
      <Controls {...defaultProps} {...props} />
    </TimelineContext.Provider>,
  );
}

describe("Controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("render", () => {
    it("renders with minimal props (video mode)", () => {
      renderControls();
      expect(screen.getByRole("button", { name: /step backward/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /step forward/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    });

    it("renders time display in video mode", () => {
      renderControls({ mediaType: "video", position: 25, length: 100, frameRate: 24 });
      const timeSections = document.querySelectorAll(".ls-timeline-controls__time-section");
      expect(timeSections.length).toBeGreaterThanOrEqual(2);
    });

    it("renders buffering indicator when buffering is true", () => {
      renderControls({ buffering: true });
      expect(screen.getByLabelText(/buffering media source/i)).toBeInTheDocument();
    });

    it("does not render buffering indicator when buffering is false", () => {
      renderControls({ buffering: false });
      expect(screen.queryByRole("status", { name: /buffering/i })).not.toBeInTheDocument();
    });

    it("renders ConfigControl and AudioControl when mediaType is audio", () => {
      renderControls({ mediaType: "audio" });
      expect(screen.getByTestId("config-control")).toBeInTheDocument();
      expect(screen.getByTestId("audio-control")).toBeInTheDocument();
    });

    it("renders TimeDurationControl when mediaType is audio", () => {
      renderControls({ mediaType: "audio", duration: 10 });
      expect(screen.getByTestId("time-duration-control")).toBeInTheDocument();
    });

    it("renders side controls from props.controls when mediaType is not audio", () => {
      renderControls({
        mediaType: "video",
        controls: { FramesControl: true },
      });
      expect(screen.getByTestId("frames-control")).toBeInTheDocument();
    });

    it("skips side control when enabled is false", () => {
      renderControls({
        mediaType: "video",
        controls: { FramesControl: false },
      });
      expect(screen.queryByTestId("frames-control")).not.toBeInTheDocument();
    });
  });

  describe("playback", () => {
    it("calls onPause when play button clicked and playing is true", async () => {
      const onPause = jest.fn();
      const onPlay = jest.fn();
      renderControls({ playing: true, onPause, onPlay });
      const playButton = screen.getByTestId("playback-button:pause");
      await userEvent.click(playButton);
      expect(onPause).toHaveBeenCalled();
      expect(onPlay).not.toHaveBeenCalled();
    });

    it("calls onPlay when play button clicked and playing is false", async () => {
      const onPause = jest.fn();
      const onPlay = jest.fn();
      renderControls({ playing: false, onPause, onPlay });
      const playButton = screen.getByTestId("playback-button:play");
      await userEvent.click(playButton);
      expect(onPlay).toHaveBeenCalled();
      expect(onPause).not.toHaveBeenCalled();
    });

    it("step backward button is disabled when position is 1", () => {
      renderControls({ position: 1, length: 100 });
      const stepBack = screen.getByRole("button", { name: /step backward/i });
      expect(stepBack).toBeDisabled();
    });

    it("step forward button is disabled when position equals length", () => {
      renderControls({ position: 100, length: 100 });
      const stepForward = screen.getByRole("button", { name: /step forward/i });
      expect(stepForward).toBeDisabled();
    });

    it("calls onStepBackward when step backward clicked", async () => {
      const onStepBackward = jest.fn();
      renderControls({ position: 50, onStepBackward });
      await userEvent.click(screen.getByRole("button", { name: /step backward/i }));
      expect(onStepBackward).toHaveBeenCalled();
    });

    it("calls onStepForward when step forward clicked", async () => {
      const onStepForward = jest.fn();
      renderControls({ position: 50, onStepForward });
      await userEvent.click(screen.getByRole("button", { name: /step forward/i }));
      expect(onStepForward).toHaveBeenCalled();
    });

    it("calls onPositionChange when TimeDurationControl changes (audio)", async () => {
      const onPositionChange = jest.fn();
      renderControls({ mediaType: "audio", onPositionChange });
      const input = screen.getByTestId("time-duration-input");
      fireEvent.change(input, { target: { value: "42" } });
      expect(onPositionChange).toHaveBeenCalledWith(42);
    });
  });

  describe("modals", () => {
    it("toggles audio modal and closes config when opening audio", async () => {
      renderControls({ mediaType: "audio" });
      const audioBtn = screen.getByTestId("audio-control");
      await userEvent.click(audioBtn);
      expect(screen.getByText("Audio open")).toBeInTheDocument();
      await userEvent.click(audioBtn);
      expect(screen.getByText("Audio closed")).toBeInTheDocument();
    });

    it("toggles config modal and closes audio when opening config", async () => {
      renderControls({ mediaType: "audio" });
      const configBtn = screen.getByTestId("config-control");
      await userEvent.click(configBtn);
      expect(screen.getByText("Config open")).toBeInTheDocument();
      await userEvent.click(configBtn);
      expect(screen.getByText("Config closed")).toBeInTheDocument();
    });

    it("closes both modals on document click", async () => {
      renderControls({ mediaType: "audio" });
      await userEvent.click(screen.getByTestId("audio-control"));
      expect(screen.getByText("Audio open")).toBeInTheDocument();
      fireEvent.click(document);
      expect(screen.getByText("Audio closed")).toBeInTheDocument();
    });
  });

  describe("alt controls (Shift)", () => {
    it("shows alt controls when Shift is pressed and stepSize is set", async () => {
      renderControls({ position: 50, length: 100, disableFrames: false }, { settings: { stepSize: () => 5 } });
      expect(screen.getByRole("button", { name: /step backward/i })).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Shift" });
      expect(screen.getByRole("button", { name: /skip to start/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /media rewind/i })).toBeInTheDocument();
      fireEvent.keyUp(document, { key: "Shift" });
      expect(screen.getByRole("button", { name: /step backward/i })).toBeInTheDocument();
    });

    it("calls onRewind when skip to start clicked", async () => {
      const onRewind = jest.fn();
      renderControls({ position: 50, onRewind, disableFrames: false }, { settings: { stepSize: () => 5 } });
      fireEvent.keyDown(document, { key: "Shift" });
      await userEvent.click(screen.getByRole("button", { name: /skip to start/i }));
      expect(onRewind).toHaveBeenCalled();
    });

    it("calls onRewind with altHopSize when media rewind clicked", async () => {
      const onRewind = jest.fn();
      renderControls(
        { position: 50, onRewind, altHopSize: 10, disableFrames: false },
        { settings: { stepSize: () => 5 } },
      );
      fireEvent.keyDown(document, { key: "Shift" });
      await userEvent.click(screen.getByRole("button", { name: /media rewind/i }));
      expect(onRewind).toHaveBeenCalledWith(10);
    });

    it("calls onForward with altHopSize when media fast forward clicked", async () => {
      const onForward = jest.fn();
      renderControls(
        { position: 50, onForward, altHopSize: 10, disableFrames: false },
        { settings: { stepSize: () => 5 } },
      );
      fireEvent.keyDown(document, { key: "Shift" });
      await userEvent.click(screen.getByRole("button", { name: /media fast forward/i }));
      expect(onForward).toHaveBeenCalledWith(10);
    });

    it("calls onForward when skip to end clicked", async () => {
      const onForward = jest.fn();
      renderControls({ position: 50, onForward, disableFrames: false }, { settings: { stepSize: () => 5 } });
      fireEvent.keyDown(document, { key: "Shift" });
      await userEvent.click(screen.getByRole("button", { name: /skip to end/i }));
      expect(onForward).toHaveBeenCalled();
    });
  });

  describe("collapse and fullscreen", () => {
    it("renders toggle timeline button when allowViewCollapse and not disableFrames", async () => {
      const onToggleCollapsed = jest.fn();
      const { container } = renderControls({
        allowViewCollapse: true,
        disableFrames: false,
        onToggleCollapsed,
      });
      const groupsWithButtons = [...container.querySelectorAll(".ls-timeline-controls__group")].filter(
        (g) => g.querySelectorAll("button").length >= 1 && g.querySelectorAll("button").length <= 2,
      );
      const collapseFullscreenGroup = groupsWithButtons[groupsWithButtons.length - 1];
      expect(collapseFullscreenGroup).toBeInTheDocument();
      const collapseBtn = collapseFullscreenGroup?.querySelector("button");
      expect(collapseBtn).toBeInTheDocument();
      await userEvent.click(collapseBtn!);
      expect(onToggleCollapsed).toHaveBeenCalledWith(true);
    });

    it("calls onToggleCollapsed with false when currently collapsed", async () => {
      const onToggleCollapsed = jest.fn();
      const { container } = renderControls({
        allowViewCollapse: true,
        disableFrames: false,
        collapsed: true,
        onToggleCollapsed,
      });
      const groupsWithButtons = [...container.querySelectorAll(".ls-timeline-controls__group")].filter(
        (g) => g.querySelectorAll("button").length >= 1 && g.querySelectorAll("button").length <= 2,
      );
      const collapseFullscreenGroup = groupsWithButtons[groupsWithButtons.length - 1];
      const collapseBtn = collapseFullscreenGroup?.querySelector("button");
      await userEvent.click(collapseBtn!);
      expect(onToggleCollapsed).toHaveBeenCalledWith(false);
    });

    it("renders fullscreen button when allowFullscreen", async () => {
      const onFullScreenToggle = jest.fn();
      const { container } = renderControls({ allowFullscreen: true, onFullScreenToggle });
      const groups = container.querySelectorAll(".ls-timeline-controls__group");
      const groupWithOneButton = [...groups].find((g) => g.querySelectorAll("button").length === 1);
      const fsBtn = groupWithOneButton?.querySelector("button");
      expect(fsBtn).toBeInTheDocument();
      await userEvent.click(fsBtn!);
      expect(onFullScreenToggle).toHaveBeenCalledWith(false);
    });
  });

  describe("customControls", () => {
    it("renders custom control component at left position", () => {
      renderControls({
        mediaType: "video",
        customControls: [{ position: "left", component: <span data-testid="custom-left">Left</span> }],
      });
      expect(screen.getByTestId("custom-left")).toBeInTheDocument();
      expect(screen.getByText("Left")).toBeInTheDocument();
    });

    it("renders custom control from function at right position", () => {
      renderControls({
        mediaType: "video",
        customControls: [{ position: "right", component: () => <span data-testid="custom-right">Right</span> }],
      });
      expect(screen.getByTestId("custom-right")).toBeInTheDocument();
    });

    it("renders custom controls at leftCenter and rightCenter", () => {
      renderControls({
        mediaType: "video",
        customControls: [
          { position: "leftCenter", component: <span data-testid="lc">LC</span> },
          { position: "rightCenter", component: <span data-testid="rc">RC</span> },
        ],
      });
      expect(screen.getByTestId("lc")).toBeInTheDocument();
      expect(screen.getByTestId("rc")).toBeInTheDocument();
    });
  });

  describe("extraControls", () => {
    it("renders extraControls when provided", () => {
      renderControls({
        extraControls: <span data-testid="extra">Extra</span>,
      });
      expect(screen.getByTestId("extra")).toBeInTheDocument();
    });
  });

  describe("step with stepSize (hop)", () => {
    it("calls onStepBackward with stepSize when hop backward clicked", async () => {
      const onStepBackward = jest.fn();
      const stepSize = jest.fn(() => 3);
      renderControls({ position: 50, onStepBackward, disableFrames: false }, { settings: { stepSize } });
      const hopBack = screen.getByRole("button", { name: /hop backward/i });
      await userEvent.click(hopBack);
      expect(onStepBackward).toHaveBeenCalledWith(expect.any(Object), stepSize);
    });

    it("calls onStepForward with stepSize when hop forward clicked", async () => {
      const onStepForward = jest.fn();
      const stepSize = jest.fn(() => 3);
      renderControls({ position: 50, onStepForward, disableFrames: false }, { settings: { stepSize } });
      const hopForward = screen.getByRole("button", { name: /hop forward/i });
      await userEvent.click(hopForward);
      expect(onStepForward).toHaveBeenCalledWith(expect.any(Object), stepSize);
    });
  });
});

describe("ControlButton", () => {
  it("renders children and passes props to button", () => {
    render(
      <ControlButton onClick={jest.fn()} aria-label="Test">
        Click me
      </ControlButton>,
    );
    const btn = screen.getByRole("button", { name: /test/i });
    expect(btn).toHaveTextContent("Click me");
  });

  it("accepts hotkey prop without crashing", () => {
    render(
      <ControlButton hotkey="Space" aria-label="Test">
        Ok
      </ControlButton>,
    );
    expect(screen.getByRole("button", { name: /test/i })).toBeInTheDocument();
  });
});
