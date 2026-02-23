/**
 * Unit tests for TimeSeriesVisualizer (parity-81).
 * Covers render, mount with minimal props, updatePlayhead (null/out-of-domain), changeWidth, and axis branches.
 */
import React from "react";
import { render, act } from "@testing-library/react";
import TimeSeriesVisualizer from "../TimeSeriesVisualizer";

jest.mock("@humansignal/ui", () => ({
  getCurrentTheme: jest.fn(() => "Light"),
}));

const defaultChannels = [
  {
    columnName: "v",
    id: "ch1",
    units: "",
    margin: { top: 20, right: 20, bottom: 30, left: 50, min: 10, max: 10 },
    displayformat: ".1f",
    markersize: 0,
    markersymbol: "circle",
    markercolor: "#333",
    strokewidth: 1,
    strokecolor: "steelblue",
    showaxis: true,
    showyaxis: true,
  },
];

const defaultItem = {
  id: "item1",
  height: 200,
  margin: { left: 50, right: 20, top: 20, bottom: 30, min: 10, max: 10 },
  parent: {
    formatTime: (t) => String(t),
    formatDuration: (d) => String(d),
    dataSlices: null,
    isDate: false,
    slicesCount: 10,
    throttledRangeUpdate: () => () => {},
    fixedscale: false,
  },
  showaxis: true,
  showyaxis: true,
  legend: "Channel",
  isChannelHiddenMap: null,
  highlightedChannelId: null,
  timerange: null,
};

const defaultSeries = [
  { t: 0, v: 10 },
  { t: 1, v: 20 },
  { t: 2, v: 15 },
];

const defaultData = {
  t: [0, 1, 2],
  v: [10, 20, 15],
};

const defaultProps = {
  time: "t",
  channels: defaultChannels,
  item: defaultItem,
  data: defaultData,
  series: defaultSeries,
  range: [0, 2],
  ranges: [],
  cursorTime: null,
};

describe("TimeSeriesVisualizer", () => {
  let offsetWidthDescriptor;

  beforeAll(() => {
    // So componentDidMount sees a non-zero width (initializeComponent uses ref.current.offsetWidth)
    offsetWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
  });

  afterAll(() => {
    if (offsetWidthDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidthDescriptor);
    }
  });

  it("renders a container with class htx-timeseries-channel", () => {
    render(<TimeSeriesVisualizer {...defaultProps} />);
    const container = document.querySelector(".htx-timeseries-channel");
    expect(container).toBeInTheDocument();
  });

  it("mounts and initializes without throwing", () => {
    expect(() => render(<TimeSeriesVisualizer {...defaultProps} />)).not.toThrow();
  });

  it("handles cursorTime null then in-domain then null (updatePlayhead branches)", () => {
    const { rerender } = render(<TimeSeriesVisualizer {...defaultProps} cursorTime={null} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();

    rerender(<TimeSeriesVisualizer {...defaultProps} cursorTime={1} />);
    rerender(<TimeSeriesVisualizer {...defaultProps} cursorTime={null} />);
  });

  it("handles cursorTime outside domain (updatePlayhead hides playhead)", () => {
    const { rerender } = render(<TimeSeriesVisualizer {...defaultProps} cursorTime={null} />);
    rerender(<TimeSeriesVisualizer {...defaultProps} cursorTime={999} />);
    rerender(<TimeSeriesVisualizer {...defaultProps} cursorTime={-10} />);
  });

  it("handles cursorTime non-finite (updatePlayhead hides playhead)", () => {
    const { rerender } = render(<TimeSeriesVisualizer {...defaultProps} cursorTime={null} />);
    rerender(<TimeSeriesVisualizer {...defaultProps} cursorTime={Number.NaN} />);
    rerender(<TimeSeriesVisualizer {...defaultProps} cursorTime={Number.POSITIVE_INFINITY} />);
  });

  it("handles showaxis false (renderXAxis early return)", () => {
    const itemNoAxis = { ...defaultItem, showaxis: false };
    render(<TimeSeriesVisualizer {...defaultProps} item={itemNoAxis} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("handles showyaxis false (renderYAxis early return)", () => {
    const itemNoYAxis = { ...defaultItem, showyaxis: false };
    render(<TimeSeriesVisualizer {...defaultProps} item={itemNoYAxis} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("handles showaxis and showyaxis false", () => {
    const itemNoAxes = { ...defaultItem, showaxis: false, showyaxis: false };
    render(<TimeSeriesVisualizer {...defaultProps} item={itemNoAxes} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("handles resize (changeWidth) when offsetWidth is set", () => {
    render(<TimeSeriesVisualizer {...defaultProps} />);
    expect(() => {
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }).not.toThrow();
  });

  it("handles range update (setRangeWithScaling)", () => {
    const { rerender } = render(<TimeSeriesVisualizer {...defaultProps} range={[0, 2]} />);
    rerender(<TimeSeriesVisualizer {...defaultProps} range={[0.5, 1.5]} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("handles item with timerange (setRangeWithScaling)", () => {
    const itemWithTimerange = {
      ...defaultItem,
      timerange: "0,2",
    };
    render(<TimeSeriesVisualizer {...defaultProps} item={itemWithTimerange} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("handles single channel (legend in initializeComponent)", () => {
    render(<TimeSeriesVisualizer {...defaultProps} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("unmounts and removes resize listener", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<TimeSeriesVisualizer {...defaultProps} />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
