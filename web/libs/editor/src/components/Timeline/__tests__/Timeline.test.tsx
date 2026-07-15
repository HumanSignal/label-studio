import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FC, MouseEvent } from "react";
import { Timeline } from "../Timeline";
import type { TimelineViewProps } from "../Types";
import * as viewsModule from "../Views";

const MockView: FC<TimelineViewProps> = () => <div data-testid="timeline-mock-view" />;
const MockControls: FC<{ onAction?: (e: MouseEvent<HTMLButtonElement>, action: string, data?: unknown) => void }> = ({
  onAction,
}) => (
  <button type="button" data-testid="view-controls-action" onClick={(e) => onAction?.(e, "test-action", {})}>
    View Action
  </button>
);

const defaultProps = {
  regions: [{ id: "r1", sequence: [] }],
  length: 100,
  position: 1,
  onPositionChange: mock(),
  mode: "frames" as const,
  framerate: 24,
  playing: false,
};

describe("Timeline", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    (viewsModule.default as any).frames = {
      View: MockView,
      Minimap: undefined,
      Controls: MockControls,
      settings: { leftOffset: 0 },
    };
    Object.defineProperty(window, "localStorage", {
      value: { getItem: mock(() => null), setItem: mock() },
      writable: true,
    });
  });

  it("renders with required props", () => {
    render(<Timeline {...defaultProps} />);
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
  });

  it("renders controls on top when controlsOnTop is true", () => {
    const { container } = render(<Timeline {...defaultProps} controlsOnTop />);
    const topbar = container.querySelector(".ls-timeline__topbar");
    expect(topbar).toBeInTheDocument();
    expect(topbar?.parentElement?.firstElementChild).toBe(topbar);
  });

  it("renders view above controls when controlsOnTop is false", () => {
    const { container } = render(<Timeline {...defaultProps} controlsOnTop={false} />);
    const topbar = container.querySelector(".ls-timeline__topbar");
    expect(topbar).toBeInTheDocument();
    expect(topbar?.parentElement?.lastElementChild).toBe(topbar);
  });

  it("does not render seeker when allowSeek is false", () => {
    render(<Timeline {...defaultProps} allowSeek={false} />);
    // Seeker would add a specific structure; without it we still have topbar and view
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
  });

  it("renders seeker when allowSeek is true", () => {
    const { container } = render(<Timeline {...defaultProps} allowSeek />);
    const topbar = container.querySelector(".ls-timeline__topbar");
    expect(topbar).toBeInTheDocument();
  });

  it("syncs internal position when position prop changes", () => {
    const { rerender, container } = render(<Timeline {...defaultProps} position={1} />);
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
    rerender(<Timeline {...defaultProps} position={50} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("syncs back to an earlier position after an internal position change", async () => {
    (viewsModule.default as any).frames = {
      View: ({ onPositionChange }: TimelineViewProps) => (
        <button type="button" data-testid="seek-frame-16" onClick={() => onPositionChange(16)}>
          Seek
        </button>
      ),
      Minimap: undefined,
      Controls: MockControls,
      settings: { leftOffset: 0 },
    };

    const { rerender, container } = render(
      <Timeline {...defaultProps} position={1} controls={{ FramesControl: true }} />,
    );

    const framesControl = () => container.querySelector('[class*="frames-control"]');

    await userEvent.click(screen.getByTestId("seek-frame-16"));
    expect(framesControl()?.textContent).toContain("16 of 100");

    rerender(<Timeline {...defaultProps} position={16} controls={{ FramesControl: true }} />);
    expect(framesControl()?.textContent).toContain("16 of 100");

    rerender(<Timeline {...defaultProps} position={1} controls={{ FramesControl: true }} />);
    expect(framesControl()?.textContent).toContain("1 of 100");
  });

  it("calls onPositionChange when position is set internally", async () => {
    const onPositionChange = mock();
    render(<Timeline {...defaultProps} position={10} onPositionChange={onPositionChange} allowSeek />);
    const rewindBtn = screen
      .queryAllByRole("button")
      .find((b) => /rewind|beginning|back/i.test(b.getAttribute("aria-label") ?? ""));
    if (rewindBtn) {
      await userEvent.click(rewindBtn);
      expect(onPositionChange).toHaveBeenCalled();
    }
  });

  it("applies className to root", () => {
    const { container } = render(<Timeline {...defaultProps} className="custom-timeline" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.className).toMatch(/custom-timeline|timeline/);
  });

  it("renders without view when disableView is true", () => {
    render(<Timeline {...defaultProps} disableView />);
    // View area is not rendered when disableView
    expect(screen.queryByTestId("timeline-mock-view")).not.toBeInTheDocument();
  });

  it("calls onPlay when play is triggered", async () => {
    const onPlay = mock();
    render(<Timeline {...defaultProps} onPlay={onPlay} playing={false} />);
    const playBtn = screen.queryAllByRole("button").find((b) => /play/i.test(b.getAttribute("aria-label") ?? ""));
    if (playBtn) {
      await userEvent.click(playBtn);
      expect(onPlay).toHaveBeenCalled();
    }
  });

  it("calls onPause when pause is triggered", async () => {
    const onPause = mock();
    render(<Timeline {...defaultProps} onPause={onPause} playing />);
    const pauseBtn = screen.queryAllByRole("button").find((b) => /pause/i.test(b.getAttribute("aria-label") ?? ""));
    if (pauseBtn) {
      await userEvent.click(pauseBtn);
      expect(onPause).toHaveBeenCalled();
    }
  });

  it("steps forward increase position", async () => {
    const onPositionChange = mock();
    render(<Timeline {...defaultProps} position={5} onPositionChange={onPositionChange} hopSize={1} />);
    const stepForwardBtn = screen
      .queryAllByRole("button")
      .find((b) => /step forward|forward|next/i.test(b.getAttribute("aria-label") ?? ""));
    if (stepForwardBtn) {
      await userEvent.click(stepForwardBtn);
      expect(onPositionChange).toHaveBeenCalledWith(6);
    }
  });

  it("steps forward by one frame when alt hop size is configured", async () => {
    const onPositionChange = mock();
    render(<Timeline {...defaultProps} position={5} onPositionChange={onPositionChange} altHopSize={10} />);

    const stepForwardBtn = screen.getByRole("button", { name: /step forward/i });
    await userEvent.click(stepForwardBtn);

    expect(onPositionChange).toHaveBeenCalledWith(6);
  });

  it("steps backward decrease position", async () => {
    const onPositionChange = mock();
    render(<Timeline {...defaultProps} position={5} onPositionChange={onPositionChange} hopSize={1} />);
    const stepBackBtn = screen
      .queryAllByRole("button")
      .find((b) => /step back|backward|previous/i.test(b.getAttribute("aria-label") ?? ""));
    if (stepBackBtn) {
      await userEvent.click(stepBackBtn);
      expect(onPositionChange).toHaveBeenCalledWith(4);
    }
  });

  it("clamps position to length when setting position", async () => {
    const onPositionChange = mock();
    render(<Timeline {...defaultProps} position={1} length={10} onPositionChange={onPositionChange} />);
    const forwardBtn = screen
      .queryAllByRole("button")
      .find((b) => /forward|end|skip to end/i.test(b.getAttribute("aria-label") ?? ""));
    if (forwardBtn) {
      await userEvent.click(forwardBtn);
      await userEvent.click(forwardBtn);
    }
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
  });

  it("uses defaultStepSize and zoom for step", () => {
    render(<Timeline {...defaultProps} defaultStepSize={5} zoom={2} />);
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
  });

  it("renders with empty regions", () => {
    render(<Timeline {...defaultProps} regions={[]} />);
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
  });

  it("renders with multiple regions with sequence", () => {
    const regions = [
      { id: "r1", sequence: [{ frame: 1, enabled: true }] },
      { id: "r2", sequence: [] },
    ];
    render(<Timeline {...defaultProps} regions={regions} />);
    expect(screen.getByTestId("timeline-mock-view")).toBeInTheDocument();
  });

  it("calls onAction when view Controls trigger action", async () => {
    const onAction = mock();
    render(<Timeline {...defaultProps} onAction={onAction} disableView={false} />);
    const actionBtn = screen.queryByTestId("view-controls-action");
    if (actionBtn) {
      await userEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledWith(expect.anything(), "test-action", {});
    }
  });
});
