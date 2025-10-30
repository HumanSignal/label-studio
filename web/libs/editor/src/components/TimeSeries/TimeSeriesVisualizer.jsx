import { getRoot } from "mobx-state-tree";
import React, {} from "react";
import { observer } from "mobx-react";
import * as d3 from "d3";
import { errorBuilder } from "../../core/DataValidator/ConfigValidator";
import { checkD3EventLoop, getOptimalWidth, getRegionColor, sparseValues } from "../../tags/object/TimeSeries/helpers";
import { markerSymbol } from "../../tags/object/TimeSeries/symbols";
import {} from "../../utils/feature-flags";
import { fixMobxObserve } from "../../utils/utilities";
import { getCurrentTheme } from "@humansignal/ui";

/**
 * TimeSeriesVisualizer component for rendering time series data
 * Supports both single channel and multiple channels visualization
 */
class TimeSeriesVisualizerD3 extends React.Component {
  ref = React.createRef();
  gCreator; // brush creator container
  brushCreator; // itself
  gBrushes;

  tracker;
  trackerX = 0;
  trackerPoints;
  trackerTime;
  trackerValue;

  extent = [0, 0];

  // if there is a huge data — use sliced data to optimize render
  useOptimizedData = false;
  // optimized data and count of slices come from parent
  optimizedSeries = null;
  // optimized data is enough to render zoomed data up to this level
  // and it is equal to the count of slices
  zoomStep = 10;

  // d3 lines to render full line
  line;
  // and just a part of data on the screen
  lineSlice;

  height = +this.props.item.height;

  state = {
    width: 840,
  };

  changeWidth = () => {
    const offsetWidth = this.ref.current.offsetWidth;
    const { margin } = this.props.item;

    if (offsetWidth) {
      const width = offsetWidth - margin.left - margin.right;

      this.setState({ width });
    }
  };

  getRegion = (selection, isInstant) => {
    const [start, end] = selection.map((n) => +this.stick(n).time);

    return { start, end: isInstant ? start : end };
  };

  createBrushMovedHandler = (id) => () => {
    if (checkD3EventLoop("end") || !d3.event.selection) return;
    const { ranges } = this.props;
    const { parent } = this.props.item;
    const i = ranges.findIndex((range) => range.id === id);

    if (i < 0) {
      console.error(`REGION ${id} was not found`);
      return;
    }
    const r = ranges[i];
    const moved = this.getRegion(d3.event.selection, r.instant);
    // click simulation - if selection didn't move
    const isJustClick = moved.start === r.start && moved.end === r.end;

    if (isJustClick) {
      parent?.annotation.unselectAreas();
      r.onClickRegion(d3.event.sourceEvent);
    } else {
      parent?.regionChanged(moved, i);
    }
  };

  newRegion;
  newRegionTimer;

  newBrushHandler = () => {
    const {
      ranges,
      item: { parent },
    } = this.props;

    const activeStates = parent?.activeStates();
    const statesSelected = activeStates?.length;
    const readonly = parent?.annotation?.isReadOnly();

    // skip if event fired by .move() - prevent recursion and bugs

    if (checkD3EventLoop("end")) return;
    // just a click - create insant region or select region
    if (!d3.event.selection) {
      const x = d3.mouse(d3.event.sourceEvent.target)[0];
      const newRegion = this.newRegion;

      // double click handler to create instant region
      // when 2nd click happens during 300ms after 1st click and in the same place
      if (newRegion && Math.abs(newRegion.x - x) < 4) {
        clearTimeout(this.newRegionTimer);
        if (!readonly) {
          parent?.regionChanged(newRegion.range, ranges.length);
        }
        this.newRegion = null;
        this.newRegionTimer = null;
      } else if (statesSelected) {
        // 1st click - store the data
        this.newRegion = {
          range: this.getRegion([x, x]),
          x,
        };
        // clear it in 300ms if there no 2nd click
        this.newRegionTimer = setTimeout(() => {
          this.newRegion = null;
          this.newRegionTimer = null;
        }, 300);
      }

      // select regions on this coords consequentially one after another
      // unselect regions after the last one
      const value = this.x.invert(x);
      const regions = ranges.filter((r) => r.start <= value && r.end >= value);
      const nextIndex = regions.findIndex((r) => r.selected) + 1;
      const region = regions[nextIndex];

      if (region) {
        region.onClickRegion(d3.event.sourceEvent);
      } else {
        parent?.annotation.unselectAreas();
        parent?.plotClickHandler(+value);
      }
      return;
    }
    const region = this.getRegion(d3.event.selection);

    this.brushCreator.move(this.gCreator, null);
    const additionalSelection = d3.event.sourceEvent.ctrlKey || d3.event.sourceEvent.metaKey;

    if (additionalSelection || !statesSelected || readonly) {
      const regions = ranges.filter((r) => r.start >= region.start && r.end <= region.end);

      if (additionalSelection) {
        parent?.annotation.extendSelectionWith(regions);
      } else {
        parent?.annotation.selectAreas(regions);
      }
      return;
    }

    parent?.addRegion(region.start, region.end);
  };

  renderBrushes(ranges, flush = false) {
    const { width } = this.state;
    const height = this.height;
    const { item } = this.props;
    const extent = [
      [0, 0],
      [width, height],
    ];
    const managerBrush = d3.brushX().extent(extent);
    const x = this.x;

    if (flush) {
      this.gBrushes.selectAll(".brush").remove();
    }

    const brushSelection = this.gBrushes.selectAll(".brush").data(ranges, (r) => r.id);
    const createHandler = this.createBrushMovedHandler;
    const updateTracker = this.updateTracker;
    const getRegion = this.getRegion;

    // Set up new brushes
    brushSelection
      .enter()
      .append("g")
      .attr("class", "brush")
      .attr("id", (r) => `brush_${item.id}_${r.id}`)
      .each(function (r) {
        const group = d3.select(this);
        const brush = d3.brushX().extent(extent);

        brush.on("brush", function () {
          if (checkD3EventLoop("brush")) return;
          const sticked = getRegion(d3.event.selection, r.instant);

          managerBrush.move(group, [x(sticked.start), x(sticked.end) + r.instant * 0.5]);
          updateTracker(d3.mouse(this)[0]);
        });
        brush.on("end", createHandler(r.id));
        brush(group);

        if (r.instant) {
          // no resizing, only moving
          group.selectAll(".handle").style("pointer-events", "none");
        } else {
          // no moving, only resizing to prevent out-of-screen bugs
          // also no reasons to move out-of-screen regions in real world
          group.selectAll(".selection").style("pointer-events", "none");
        }
        // all other space is taken by brushCreator
        group.selectAll(".overlay").style("pointer-events", "none");

        if (r.isReadOnly()) {
          group.selectAll(".handle").remove();
        }

        if (r._brushRef === undefined || !r._brushRef.isConnected) {
          r._brushRef = group.select(".selection").node();
        }
      })
      .merge(brushSelection)
      .each(function (r) {
        const group = d3.select(this);
        const selection = group.selectAll(".selection");

        group.style("display", r.hidden ? "none" : "block");

        const color = getRegionColor(r);

        if (r.instant) {
          selection
            .attr("stroke-opacity", r.inSelection || r.highlighted ? 0.6 : 0.2)
            .attr("fill-opacity", r.inSelection || r.highlighted ? 1 : 0.6)
            .attr("stroke-width", 3)
            .attr("stroke", color)
            .attr("fill", color);
          const at = x(r.start);

          managerBrush.move(group, [at, at + 1]);
        } else {
          selection
            .attr("stroke-opacity", r.inSelection || r.highlighted ? 0.8 : 0.5)
            .attr("fill-opacity", r.inSelection || r.highlighted ? 0.6 : 0.3)
            .attr("stroke", color)
            .attr("fill", color);
          managerBrush.move(group, [r.start, r.end].map(x));
        }
      });
    brushSelection.exit().remove();
  }

  renderBrushCreator() {
    if (this.gCreator) {
      this.gCreator.selectAll("*").remove();
    } else {
      this.gCreator = this.main.append("g").attr("class", "new_brush");
    }

    const updateTracker = this.updateTracker;
    const block = this.gCreator;
    const getRegion = this.getRegion;
    const x = this.x;
    const brush = (this.brushCreator = d3
      .brushX()
      .extent([
        [0, 0],
        [this.state.width, this.height],
      ])
      .on("brush", function () {
        if (checkD3EventLoop("brush") || !d3.event.selection) return;
        const sticked = getRegion(d3.event.selection);

        brush.move(block, [x(sticked.start), x(sticked.end)]);
        updateTracker(d3.mouse(this)[0], sticked.end - sticked.start);
      })
      .on("end", this.newBrushHandler)
      // replacing default filter to allow ctrl-click action
      .filter(() => {
        return !d3.event.button;
      }));

    this.gCreator.call(this.brushCreator);
  }

  updateTracker = (screenX, brushWidth = 0) => {
    const { width } = this.state;

    if (screenX < 0 || screenX > width) return;
    const { time, value } = this.stick(screenX);

    this.trackerX = time;
    this.tracker.attr("transform", `translate(${this.x(time) + 0.5},0)`);
    this.trackerTime.text(`${this.formatTime(time)}${brushWidth === 0 ? "" : ` [${this.formatDuration(brushWidth)}]`}`);
    const { isChannelHiddenMap } = this.props.item;
    this.props.channels.forEach((item) => {
      const column = item.columnName;
      const channel = this.channels[column];
      const dataY = value[column];
      channel.trackerPoint.attr("cy", channel.y(dataY));
      if (dataY === null || isChannelHiddenMap?.[channel.id]) {
        channel.trackerPoint.style("display", "none");
        channel.trackerValue.style("display", "none");
      } else {
        channel.trackerPoint.style("display", undefined);
        channel.trackerValue.style("display", undefined);
        channel.trackerValue.text(`${channel.formatValue(dataY)} ${channel.units}`);
      }
    });
    this.tracker.attr("text-anchor", screenX > width - 100 ? "end" : "start");
  };

  renderTracker = () => {
    const updateTracker = this.updateTracker;

    this.tracker = this.main.append("g").style("pointer-events", "none");
    this.trackerValue = this.tracker.append("text").attr("font-size", 10).attr("fill", "#666");
    this.trackerTime = this.tracker
      .append("text")
      .attr("y", this.height - 1)
      .attr("font-size", 10)
      .attr("fill", "#666");
    this.trackerPoints = this.props.channels.map((item) => {
      const column = item.columnName;
      const channel = this.channels[column];
      channel.trackerValue = this.trackerValue
        .append("tspan")
        .attr("fill", item.strokecolor)
        .attr("x", 0)
        .attr("dy", 10);
      return (channel.trackerPoint = this.tracker
        .append("circle")
        .attr("cx", 0)
        .attr("r", 3)
        .attr("stroke", "red")
        .attr("fill", "none"));
    });
    this.tracker.append("line").attr("y1", this.height).attr("y2", 0).attr("stroke", "#666");

    function onHover() {
      updateTracker(d3.mouse(this)[0]);
    }

    this.main.on("mousemove", onHover);
  };

  /*
   * Render persistent playhead (cursor that shows current playback position).
   * The line is separate from the hover tracker and is updated via `updatePlayhead`.
   */
  renderPlayhead = () => {
    if (this.playhead) return; // already rendered

    // Create a group to hold both line and triangle
    this.playhead = this.main
      .append("g")
      .attr("class", "playhead")
      .attr("pointer-events", "none")
      .style("display", "none");

    const color = this.props.item.parent?.cursorcolor || "var(--color-neutral-inverted-surface)";

    // Vertical line
    this.playheadLine = this.playhead
      .append("line")
      .attr("y1", 6) // Start below small handle
      .attr("y2", this.height)
      .attr("stroke", color)
      .attr("stroke-width", 2);

    // Upside-down house handle at top (pentagon like audio player)
    this.playheadHandle = this.playhead
      .append("polygon")
      .attr("points", "-4,0 4,0 4,7 1,10 -1,10 -4,7") // Upside-down house shape
      .attr("fill", color);
  };

  /*
   * Update playhead position on timeline.
   * @param {number|null} time Native time value. If null, hides playhead.
   */
  updatePlayhead = (time) => {
    if (!this.playhead) return;

    if (time === null || !Number.isFinite(time)) {
      this.playhead.style("display", "none");
      return;
    }

    // Check if time is within current x domain to avoid drawing off-screen
    const domain = this.x.domain();
    if (time < domain[0] || time > domain[1]) {
      this.playhead.style("display", "none");
      return;
    }

    const px = this.x(time) + 0.5; // align to pixel grid like tracker
    this.playhead.attr("transform", `translate(${px},0)`).style("display", "block");
  };

  renderXAxis = () => {
    const { item } = this.props;

    if (!item.showaxis) return;

    const { width } = this.state;
    const { margin } = item;
    const tickSize = this.height + margin.top;
    const shift = -margin.top;

    let g = this.main.select(".xaxis");

    if (!g.size()) {
      g = this.main.append("g").attr("class", "xaxis");
    }

    g.attr("transform", `translate(0,${shift})`)
      .call(
        d3
          .axisBottom(this.x)
          .ticks(width / 80)
          .tickSize(tickSize + 4),
      )
      .call((g) => g.selectAll(".domain").remove())
      // @todo `clone is not a function` wtf?
      // .call(g => g.selectAll(".tick line").clone().attr("y1", 18).attr("y2", 22));
      .call((g) =>
        g
          .selectAll(".tick")
          .attr("stroke-opacity", 0.2)
          .selectAll(".bottom")
          .data([0])
          .enter()
          .append("line")
          .attr("class", "bottom")
          .attr("stroke", "currentColor")
          .attr("y1", tickSize + 16)
          .attr("y2", tickSize + margin.bottom),
      );
  };

  renderYAxis = () => {
    const { item } = this.props;

    if (!item.showaxis || !item.showyaxis) return;
    const { margin } = item;

    // @todo usual .data([0]) trick doesn't work for some reason :(
    let g = this.main.select(".yaxis");
    let g2 = this.main.select(".yaxis2");

    if (!g.size()) {
      g = this.main.append("g").attr("class", "yaxis");
    }

    if (!g2.size()) {
      g2 = this.main.append("g").attr("class", "yaxis2");
    }
    g2.attr("transform", `translate(${this.state.width},0)`);

    const channelsAllowedToAxis = this.props.channels.filter((item) => item.showaxis && item.showyaxis);
    const leftChannel = channelsAllowedToAxis.length > 0 && this.channels[channelsAllowedToAxis[0].columnName];
    const rightChannel = channelsAllowedToAxis.length > 1 && this.channels[channelsAllowedToAxis[1].columnName];
    if (leftChannel) {
      g.call(d3.axisLeft(leftChannel.y).tickFormat(leftChannel.formatValue).tickSize(3))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.select(".title").remove())
        .call((g) =>
          g
            .append("text")
            .attr("class", "title")
            .attr("font-size", 8)
            .attr("x", -6)
            .attr("y", 0)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text(leftChannel.units),
        );
    }
    if (rightChannel) {
      g2.call(d3.axisRight(rightChannel.y).tickFormat(rightChannel.formatValue).tickSize(3))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.select(".title").remove())
        .call((g) =>
          g
            .append("text")
            .attr("class", "title")
            .attr("font-size", 8)
            .attr("x", 0)
            .attr("y", 0)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(rightChannel.units),
        );
    }
  };

  initZoom() {
    const { data, item, time } = this.props;
    const times = data[time];
    const upd = item.parent?.throttledRangeUpdate();
    const onZoom = () => {
      const e = d3.event;

      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { range } = this.props;
      const indices = range.map((r) => d3.bisectRight(times, r));
      const MAX_POINTS_ON_SCREEN = 10;
      const [x] = d3.mouse(d3.event.target);
      const width = this.x.range()[1];
      // slow down zooming in
      const scale = Math.min(0.3, -e.deltaY / this.height);
      // if there are too few points displayed, don't zoom in

      if (indices[1] - indices[0] < MAX_POINTS_ON_SCREEN && scale > 0) return;

      const shift = range[1] - range[0];
      const zoomed = [
        Math.max(+this.extent[0], +range[0] + (shift * scale * x) / width),
        Math.min(+this.extent[1], range[1] - shift * scale * (1 - x / width)),
      ];

      upd(zoomed, scale);
    };

    this.main.on("wheel", onZoom);
  }

  stick = (screenX) => {
    const dataX = this.x.invert(screenX);
    const stickTimes = this.allTimes;
    let i = d3.bisectRight(stickTimes, dataX, 0, stickTimes.length - 1);

    if (stickTimes[i] - dataX > dataX - stickTimes[i - 1]) i--;

    return {
      time: stickTimes[i],
      value: this.allSeries[i],
    };
  };

  componentDidMount() {
    if (!this.ref.current) return;

    const { range } = this.props;

    this.initializeComponent();
    for (const channel of this.props.channels) {
      this.initializeChannel(channel);
    }

    this.renderTracker();
    this.renderPlayhead();
    this.updatePlayhead(this.props.cursorTime);
    this.updateTracker(0); // initial value, will be updated in setRangeWithScaling
    this.renderYAxis();
    this.setRangeWithScaling(range);
    this.renderBrushCreator();
    this.initZoom();

    // We initially generate a SVG group to keep our brushes' DOM elements in:
    this.gBrushes = this.main.append("g").attr("class", "brushes").attr("clip-path", `url("#${this.clipPathId}")`);

    this.renderBrushes(this.props.ranges);

    window.addEventListener("resize", this.changeWidth);
  }

  get formatTime() {
    return this.props.item.parent?.formatTime;
  }

  get formatDuration() {
    return this.props.item.parent?.formatDuration;
  }

  // initially it checks do we even need this optimization
  // but then this is a switch between optimized and original data
  get slices() {
    return this.props.item.parent?.dataSlices;
  }

  initializeComponent() {
    const isDarkMode = getCurrentTheme() === "Dark";
    const { item, time, channels } = this.props;
    const { isDate, slicesCount } = item.parent;
    const { margin } = item;
    const height = this.height;
    this.clipPathId = `clip_${item.id}`;

    this.zoomStep = slicesCount;

    let { series } = this.props;

    series = series.filter((x) => {
      return channels.some((c) => x[c.columnName] !== null);
    });

    const times = series.map((x) => {
      return x[time];
    });

    this.allSeries = series;
    this.allTimes = times;

    const values = channels.flatMap((c) => {
      const column = c.columnName;
      return series.map((x) => {
        return x[column];
      });
    });

    const optimizedWidthWithZoom = getOptimalWidth() * this.zoomStep;

    this.useOptimizedData = series.length > optimizedWidthWithZoom;

    if (this.useOptimizedData) {
      this.optimizedSeries = sparseValues(series, optimizedWidthWithZoom);
    }

    const offsetWidth = this.ref.current.offsetWidth;
    const width = offsetWidth ? offsetWidth - margin.left - margin.right : this.state.width;
    // intention direct assignment to avoid rerender and correct initialization
    // eslint-disable-next-line react/no-direct-mutation-state

    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.width = width;

    this.extent = d3.extent(times);
    const scale = isDate ? d3.scaleUtc() : d3.scaleLinear();

    const x = scale
      // .clamp(true)
      .domain(this.extent)
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(values))
      .range([height - margin.max, margin.min]);

    // active domain-range mappers
    this.x = x;
    this.y = y;
    // static max scale domain-range mappers
    this.plotX = x.copy();
    this.plotY = y.copy();

    this.main = d3
      .select(this.ref.current)
      .append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
      .style("display", "block")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    this.defs = this.main.append("defs");

    this.main
      .append("clipPath")
      .attr("id", this.clipPathId)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", height)
      .attr("width", width);

    // decorative huge opaque block with channel name on background

    if (channels.length === 1) {
      this.main
        .append("text")
        .text(item.legend)
        .attr("fill", isDarkMode ? "red" : "black")
        .attr("dx", "1em")
        .attr("dy", "1em")
        .attr("font-weight", "bold")
        .attr("font-size", "1.4em")
        .attr("dy", "1em")
        .attr("opacity", 0.1);
    }

    this.pathContainer = this.main.append("g").attr("clip-path", `url("#${this.clipPathId}")`);
  }

  channels = {};

  initializeChannel(item) {
    const markerId = `marker_${item.id}`;
    const column = item.columnName;
    const { time, range } = this.props;
    const { margin } = item;
    const height = this.height;

    const channel = (this.channels[column] = { id: item.id, units: item.units });

    let { series } = this.props;

    if (this.optimizedSeries) {
      channel.useOptimizedData = this.useOptimizedData;
      series = this.optimizedSeries;
    }

    series = series.filter((x) => {
      return x[column] !== null;
    });

    if (this.optimizedSeries) {
      channel.optimizedSeries = series;
    }

    const values = series.map((x) => {
      return x[column];
    });

    if (!values) {
      const names = Object.keys(data).filter((name) => name !== time);
      const message = `\`${column}\` not found in data. Available columns: ${names.join(
        ", ",
      )}. For headless csv you can use column index`;

      getRoot(item).annotationStore.addErrors([errorBuilder.generalError(message)]);
      return;
    }

    const formatValue = d3.format(item.displayformat);
    channel.formatValue = formatValue;

    const y = d3
      .scaleLinear()
      .domain(d3.extent(values))
      .range([height - margin.max, margin.min]);

    channel.x = this.x.copy();
    channel.plotX = this.x.copy();
    channel.y = y;
    channel.plotY = y.copy();

    // max scale line
    channel.line = d3
      .line()
      .y((d) => channel.plotY(d[column]))
      .x((d) => channel.plotX(d[time]));

    // line that has representation only on the current range
    channel.lineSlice = d3
      .line()
      .defined((d) => d[time] >= range[0] && d[time] <= range[1])
      .y((d) => channel.y(d[column]))
      .x((d) => channel.x(d[time]));

    const marker = this.defs
      .append("marker")
      .attr("id", markerId)
      .attr("markerWidth", item.markersize)
      .attr("markerHeight", item.markersize)
      .attr("refX", item.markersize / 2)
      .attr("refY", item.markersize / 2);

    markerSymbol(marker, item.markersymbol, item.markersize, item.markercolor);

    channel.path = this.pathContainer.append("path").datum(series).attr("d", channel.line);
    // to render different zoomed slices of path
    channel.path2 = this.pathContainer.append("path");

    for (const path of [channel.path, channel.path2]) {
      path
        .attr("vector-effect", "non-scaling-stroke")
        .attr("fill", "none")
        .attr("stroke-width", item.strokewidth || 1)
        .attr("stroke", item.strokecolor || "steelblue")
        .attr("marker-start", item.markersize > 0 ? `url(#${markerId})` : "")
        .attr("marker-mid", item.markersize > 0 ? `url(#${markerId})` : "")
        .attr("marker-end", item.markersize > 0 ? `url(#${markerId})` : "");
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.changeWidth);
  }

  setRangeWithScaling(range) {
    this.x.domain(range);
    const current = this.x.range();
    const all = this.plotX.domain().map(this.x);
    const scale = (all[1] - all[0]) / (current[1] - current[0]);
    const left = Math.max(0, Math.floor((this.zoomStep * (current[0] - all[0])) / (all[1] - all[0])));
    const right = Math.max(0, Math.floor((this.zoomStep * (current[1] - all[0])) / (all[1] - all[0])));
    const translate = all[0] - current[0];

    const { item } = this.props;
    if (item.timerange) {
      const timerange = item.timerange.split(",").map(Number);

      this.x.domain(timerange);
    }

    for (const channelItem of this.props.channels) {
      this.setChannelRangeWithScaling(channelItem, range, { left, right, translate, scale });
    }
  }
  setChannelRangeWithScaling(channelItem, range, { left, right, translate, scale }) {
    const column = channelItem.columnName;
    const channel = this.channels[column];
    channel.x.domain(range);

    let translateY = 0;
    let scaleY = 1;
    const originY = channel.y.range()[0];
    const { item } = this.props;
    // overwrite parent's
    const fixedscale =
      channelItem.fixedscale === undefined
        ? item.fixedscale === undefined
          ? item.parent?.fixedscale
          : item.fixedscale
        : channelItem.fixedscale;

    if (channelItem.timerange) {
      const timerange = channelItem.timerange.split(",").map(Number);

      channel.x.domain(timerange);
    }

    if (!fixedscale) {
      // array slice may slow it down, so just find a min-max by ourselves
      const { data, time } = this.props;
      const values = data[column];
      // indices of the first and last displayed values
      let i = d3.bisectRight(data[time], range[0]);
      const j = d3.bisectRight(data[time], range[1]);
      // find min-max
      let min = values[i];
      let max = values[i];

      for (; i < j; i++) {
        if (min > values[i]) min = values[i];
        if (max < values[i]) max = values[i];
      }

      if (channelItem.datarange) {
        const datarange = channelItem.datarange.split(",");

        if (datarange[0] !== "") min = new Number(datarange[0]);
        if (datarange[1] !== "") max = new Number(datarange[1]);
      }

      // calc scale and shift
      const [globalMin, globalMax] = d3.extent(values);
      const diffY = globalMax - globalMin;

      scaleY = diffY / (max - min);

      channel.y.domain([min, max]);
      // `translateY` relies on the current `y`'s domain so it should be calculated after it
      translateY = channel.y(globalMin) - channel.y(min);
    }

    // zoomStep - zoom level when we need to switch between optimized and original data
    const strongZoom = scale > this.zoomStep;
    const haveToSwitchData = strongZoom === channel.useOptimizedData;

    if (channel.optimizedSeries && haveToSwitchData) {
      channel.useOptimizedData = !channel.useOptimizedData;
      if (channel.useOptimizedData) {
        channel.path.datum(channel.optimizedSeries);
        channel.path.attr("d", channel.line);
      } else {
        channel.path.attr("transform", "");
      }
    }

    if (channel.useOptimizedData) {
      channel.path.attr("transform", `translate(${translate} ${translateY}) scale(${scale} ${scaleY})`);
      channel.path.attr("transform-origin", `left ${originY}`);
      channel.path2.attr("d", "");
    } else {
      if (channel.optimizedSeries) {
        channel.path.datum(this.slices[left]);
        channel.path.attr("d", channel.lineSlice);
        if (left !== right && this.slices[right]) {
          channel.path2.datum(this.slices[right]);
          channel.path2.attr("d", channel.lineSlice);
        } else {
          channel.path2.attr("d", "");
        }
      } else {
        channel.path.attr("d", channel.lineSlice);
        channel.path2.attr("d", "");
      }
    }

    this.renderXAxis();
    this.renderYAxis();
    this.updateTracker(this.x(this.trackerX));

    // Sync playhead with new scale/domain
    this.updatePlayhead(this.props.cursorTime);
  }

  componentDidUpdate(prevProps, prevState) {
    const { range } = this.props;
    const { width } = this.state;
    let flushBrushes = false;

    if (width !== prevState.width) {
      const { item, range } = this.props;
      const { margin } = item;
      const height = this.height;
      const svg = d3.select(this.ref.current).selectAll("svg");

      svg.attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom]);
      // all width based scales should be updated
      this.x.range([0, width]);
      this.plotX.range([0, width]);
      for (const channel of Object.values(this.channels)) {
        channel.x.range([0, width]);
        channel.plotX.range([0, width]);
        // Channels' charts will be successfully updated in `setRangeWithScaling` in all cases except for optimized data
        // as in that case they are designed to be more static, so we have to do it right now
        if (channel.useOptimizedData) {
          channel.path.attr("d", channel.line);
        }
      }
      this.renderBrushCreator();
      svg.selectAll("clipPath rect").attr("width", width);

      this.setRangeWithScaling(range);
      this.renderBrushCreator();
      flushBrushes = true;
    } else {
      const domain = this.x.domain();

      if (+domain[0] !== +range[0] || +domain[1] !== +range[1]) {
        this.setRangeWithScaling(range);
      }
    }

    this.renderBrushes(this.props.ranges, flushBrushes);

    const { isChannelHiddenMap, highlightedChannelId } = this.props.item;
    for (const channel of Object.values(this.channels)) {
      const isDimmed = highlightedChannelId && highlightedChannelId !== channel.id;
      const isHidden = !!isChannelHiddenMap?.[channel.id];
      const opacity = isDimmed ? 0.3 : undefined;
      const display = isHidden ? "none" : undefined;
      channel.path.style("opacity", opacity).style("display", display);
      channel.path2.style("opacity", opacity).style("display", display);
    }

    const cursorChanged = this.props.cursorTime !== prevProps.cursorTime;
    if (cursorChanged || width !== prevState.width || flushBrushes) {
      this.updatePlayhead(this.props.cursorTime);
    }

    this.updateTracker(this.x(this.trackerX));
  }

  render() {
    this.props.ranges.map((r) =>
      fixMobxObserve(r.start, r.end, r.selected, r.inSelection, r.highlighted, r.hidden, r.style?.fillcolor),
    );
    fixMobxObserve(
      this.props.range.map(Number),
      this.props.item.highlightedChannelId,
      this.props.item.isChannelHiddenMap,
      this.props.cursorTime,
    );

    return <div className="htx-timeseries-channel" ref={this.ref} />;
  }
}

const TimeSeriesVisualizer = observer(TimeSeriesVisualizerD3);

export default TimeSeriesVisualizer;
