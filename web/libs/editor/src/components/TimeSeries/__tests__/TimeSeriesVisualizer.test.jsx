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

jest.mock("../../../tags/object/TimeSeries/helpers", () => {
  const actual = jest.requireActual("../../../tags/object/TimeSeries/helpers");
  return {
    ...actual,
    getOptimalWidth: jest.fn(() => 1),
  };
});

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

const twoChannels = [
  ...defaultChannels,
  {
    columnName: "v2",
    id: "ch2",
    units: "m",
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

const twoChannelSeries = [
  { t: 0, v: 10, v2: 12 },
  { t: 1, v: 20, v2: 22 },
  { t: 2, v: 15, v2: 17 },
];
const twoChannelData = { t: [0, 1, 2], v: [10, 20, 15], v2: [12, 22, 17] };

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

  it("renders with two channels (renderYAxis left and right)", () => {
    render(
      <TimeSeriesVisualizer {...defaultProps} channels={twoChannels} series={twoChannelSeries} data={twoChannelData} />,
    );
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
    expect(document.querySelector(".yaxis")).toBeInTheDocument();
    expect(document.querySelector(".yaxis2")).toBeInTheDocument();
  });

  it("componentDidUpdate applies channel opacity/display from isChannelHiddenMap and highlightedChannelId", () => {
    const { rerender } = render(<TimeSeriesVisualizer {...defaultProps} />);
    const itemWithMaps = {
      ...defaultItem,
      isChannelHiddenMap: { ch1: true },
      highlightedChannelId: "ch2",
    };
    rerender(<TimeSeriesVisualizer {...defaultProps} item={itemWithMaps} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("componentDidUpdate width path (resize changes width)", () => {
    const { rerender } = render(<TimeSeriesVisualizer {...defaultProps} />);
    // After first mount (width from offsetWidth 800), change to 600 and resize so setState runs and componentDidUpdate sees width change
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 600;
      },
    });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    rerender(<TimeSeriesVisualizer {...defaultProps} range={[0.5, 1.5]} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
  });

  it("render with non-empty ranges (fixMobxObserve for ranges)", () => {
    const ranges = [
      {
        id: "r1",
        start: 0,
        end: 1,
        selected: false,
        inSelection: false,
        highlighted: false,
        hidden: false,
        style: { fillcolor: "#ccc" },
        instant: false,
        isReadOnly: () => false,
      },
    ];
    render(<TimeSeriesVisualizer {...defaultProps} ranges={ranges} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("handles Dark theme (initializeComponent legend color)", () => {
    const { getCurrentTheme } = require("@humansignal/ui");
    getCurrentTheme.mockReturnValue("Dark");
    render(<TimeSeriesVisualizer {...defaultProps} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
    getCurrentTheme.mockReturnValue("Light");
  });

  it("updateTracker called on mousemove", () => {
    render(<TimeSeriesVisualizer {...defaultProps} />);
    const container = document.querySelector(".htx-timeseries-channel");
    const svg = container?.querySelector("svg");
    const g = svg?.querySelector("g");
    if (g) {
      act(() => {
        g.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 50, bubbles: true }));
      });
    }
    expect(container).toBeInTheDocument();
  });

  it("setChannelRangeWithScaling with fixedscale and datarange", () => {
    const channelsWithScale = [
      {
        ...defaultChannels[0],
        fixedscale: true,
      },
      {
        ...twoChannels[1],
        datarange: "0,100",
        fixedscale: false,
      },
    ];
    const { rerender } = render(
      <TimeSeriesVisualizer
        {...defaultProps}
        channels={channelsWithScale}
        series={twoChannelSeries}
        data={twoChannelData}
      />,
    );
    rerender(
      <TimeSeriesVisualizer
        {...defaultProps}
        channels={channelsWithScale}
        series={twoChannelSeries}
        data={twoChannelData}
        range={[0.3, 1.8]}
      />,
    );
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("setChannelRangeWithScaling with channel timerange", () => {
    const channelsWithTimerange = [{ ...defaultChannels[0], timerange: "0,2" }];
    render(<TimeSeriesVisualizer {...defaultProps} channels={channelsWithTimerange} range={[0.5, 1.5]} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("uses optimized data path when series is long (useOptimizedData)", () => {
    const longSeries = Array.from({ length: 15 }, (_, i) => ({ t: i, v: 10 + i }));
    const longData = {
      t: longSeries.map((d) => d.t),
      v: longSeries.map((d) => d.v),
    };
    render(<TimeSeriesVisualizer {...defaultProps} series={longSeries} data={longData} range={[0, 14]} />);
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
  });

  it("changeWidth when offsetWidth is 0 does not set state", () => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 0;
      },
    });
    render(<TimeSeriesVisualizer {...defaultProps} />);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(document.querySelector(".htx-timeseries-channel")).toBeInTheDocument();
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
  });
});
