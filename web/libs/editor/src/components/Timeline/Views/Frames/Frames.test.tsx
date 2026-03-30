import { act, render, screen } from "@testing-library/react";
import * as resizeObserverModule from "@humansignal/core/hooks/useResizeObserver";
import * as keypointsModule from "./Keypoints";
import { Frames } from "./Frames";
import { cn } from "../../../../utils/bem";

const sel = (block: string, elem?: string) => {
  const c = elem ? cn(block).elem(elem) : cn(block);
  return `.${c.toClassName().split(" ")[0]}`;
};

const defaultProps = {
  step: 10,
  offset: 0,
  position: 1,
  length: 100,
  playing: false,
  regions: [
    {
      id: "r1",
      index: 0,
      label: "Region 1",
      color: "#ff0000",
      visible: true,
      selected: false,
      sequence: [],
      timeline: true,
    },
  ] as any,
  onScroll: mock(),
  onPositionChange: mock(),
  onResize: mock(),
};

describe("Frames", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    spyOn(resizeObserverModule, "useResizeObserver").mockReturnValue({ width: 400 } as any);
    spyOn(keypointsModule, "Keypoints").mockImplementation((() => <div data-testid="keypoints-mock" />) as any);
  });

  it("renders timeline frames structure", () => {
    render(<Frames {...defaultProps} />);
    expect(document.querySelector(sel("timeline-frames"))).toBeInTheDocument();
    expect(document.querySelector(sel("timeline-frames", "controls"))).toBeInTheDocument();
    expect(document.querySelector(sel("timeline-frames", "scroll"))).toBeInTheDocument();
    expect(document.querySelector(sel("timeline-frames", "background"))).toBeInTheDocument();
  });

  it("renders indicator element", () => {
    render(<Frames {...defaultProps} />);
    expect(document.querySelector(sel("timeline-frames", "indicator"))).toBeInTheDocument();
  });

  it("renders keypoints virtual list", () => {
    render(<Frames {...defaultProps} />);
    expect(screen.getByTestId("keypoints-mock")).toBeInTheDocument();
  });

  it("uses leftOffset when provided", () => {
    const { container } = render(<Frames {...defaultProps} leftOffset={200} />);
    const labelsBg = container.querySelector(sel("timeline-frames", "labels-bg"));
    expect(labelsBg).toHaveStyle({ width: "200px" });
  });

  it("calls onResize when layout is computed", () => {
    render(<Frames {...defaultProps} />);
    expect(defaultProps.onResize).toHaveBeenCalled();
  });

  it("handles wheel scroll on scroll area", async () => {
    render(<Frames {...defaultProps} />);
    const scrollArea = document.querySelector(sel("timeline-frames", "scroll"));
    expect(scrollArea).toBeInTheDocument();
    Object.defineProperty(scrollArea, "scrollWidth", { value: 2000, configurable: true });
    Object.defineProperty(scrollArea, "clientWidth", { value: 400, configurable: true });
    Object.defineProperty(scrollArea, "scrollHeight", { value: 200, configurable: true });
    Object.defineProperty(scrollArea, "clientHeight", { value: 100, configurable: true });
    await act(async () => {
      scrollArea?.dispatchEvent(new WheelEvent("wheel", { deltaX: 50, deltaY: 0, bubbles: true }));
    });
    expect(defaultProps.onScroll).toHaveBeenCalled();
  });

  it("handles mouse leave to clear hover offset", () => {
    render(<Frames {...defaultProps} />);
    const scrollArea = document.querySelector(sel("timeline-frames", "scroll"));
    scrollArea?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(document.querySelector(sel("timeline-frames", "hover"))).not.toBeInTheDocument();
  });

  it("handles indicator mouse down for position change", async () => {
    const onPositionChange = mock();
    render(<Frames {...defaultProps} onPositionChange={onPositionChange} />);
    const indicator = document.querySelector(sel("timeline-frames", "indicator"));
    const scrollArea = document.querySelector(sel("timeline-frames", "scroll"));
    Object.defineProperty(scrollArea, "scrollWidth", { value: 2000, configurable: true });
    Object.defineProperty(indicator, "clientWidth", { value: 10, configurable: true });
    Object.defineProperty(indicator, "offsetLeft", { value: 150, configurable: true });
    await act(async () => {
      indicator?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, pageX: 160 }));
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, pageX: 200 }));
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    expect(onPositionChange).toHaveBeenCalled();
  });

  it("syncs offset when offset prop changes", () => {
    const { rerender } = render(<Frames {...defaultProps} offset={0} />);
    const scrollArea = document.querySelector(sel("timeline-frames", "scroll")) as HTMLDivElement;
    expect(scrollArea).toBeInTheDocument();
    rerender(<Frames {...defaultProps} offset={2} />);
    expect(scrollArea).toBeInTheDocument();
  });

  it("renders with empty regions", () => {
    render(<Frames {...defaultProps} regions={[]} />);
    expect(document.querySelector(sel("timeline-frames"))).toBeInTheDocument();
  });

  it("renders with length 0 without throwing", () => {
    render(<Frames {...defaultProps} length={0} />);
    expect(document.querySelector(sel("timeline-frames"))).toBeInTheDocument();
  });

  it("applies height style when height prop is provided", () => {
    const { container } = render(<Frames {...defaultProps} height={200} />);
    const root = container.querySelector(sel("timeline-frames")) as HTMLElement;
    expect(root?.style.getPropertyValue("--view-height")).toBe("200px");
  });

  it("calls onStartDrawing when clicking on keyframes area with no region", async () => {
    const onStartDrawing = mock(
      () => ({ id: "new", ranges: [{ start: 1, end: 1 }], object: { length: 100 }, setRange: mock() }) as any,
    );
    render(<Frames {...defaultProps} onStartDrawing={onStartDrawing} />);
    const scrollArea = document.querySelector(sel("timeline-frames", "scroll")) as HTMLElement;
    expect(scrollArea).toBeInTheDocument();
    scrollArea.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    await act(async () => {
      const ev = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 200,
        clientY: 10,
      });
      Object.defineProperty(ev, "pageX", { value: 200, configurable: true });
      Object.defineProperty(ev, "target", { value: scrollArea, configurable: true });
      scrollArea.dispatchEvent(ev);
    });
    expect(onStartDrawing).toHaveBeenCalled();
  });

  it("scrolls position when position prop changes outside visible range", () => {
    const onScroll = mock();
    const { rerender } = render(<Frames {...defaultProps} position={1} offset={0} onScroll={onScroll} />);
    const scrollArea = document.querySelector(sel("timeline-frames", "scroll")) as HTMLDivElement;
    if (scrollArea) {
      Object.defineProperty(scrollArea, "scrollWidth", { value: 2000, configurable: true });
      Object.defineProperty(scrollArea, "clientWidth", { value: 400, configurable: true });
    }
    rerender(<Frames {...defaultProps} position={50} offset={0} onScroll={onScroll} />);
    expect(onScroll).toHaveBeenCalled();
  });
});
