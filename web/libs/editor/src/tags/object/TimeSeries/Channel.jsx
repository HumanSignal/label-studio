import { useMemo } from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import TimeSeriesVisualizer from "../../../components/TimeSeries/TimeSeriesVisualizer";
import Registry from "../../../core/Registry";
import Types from "../../../core/Types";
import { guidGenerator } from "../../../core/Helpers";
import { TagParentMixin } from "../../../mixins/TagParentMixin";
import { FF_DEV_3391, isFF } from "../../../utils/feature-flags";

/**
 * Channel tag can be used to label time series data
 * @name Channel
 * @subtag
 * @param {string} column column name or index
 * @param {string} [legend] display name of the channel
 * @param {string} [units] display units name
 * @param {string} [displayFormat] format string for the values, uses d3-format:<br/>
 *        `[,][.precision][f\|%]`<br/>
 *        `,` - group thousands with separator (from locale): `,` (12345.6 -> 12,345.6) `,.2f` (12345.6 -> 12,345.60)<br/>
 *        `.precision` - precision for `f\|%` type, significant digits for empty type:<br/>
 *                     `.3f` (12.3456 -> 12.345, 1000 -> 1000.000)<br/>
 *                     `.3` (12.3456 -> 12.3, 1.2345 -> 1.23, 12345 -> 1.23e+4)<br/>
 *        `f` - treat as float, default precision is .6: `f` (12 -> 12.000000) `.2f` (12 -> 12.00) `.0f` (12.34 -> 12)<br/>
 *        `%` - treat as percents and format accordingly: `%.0` (0.128 -> 13%) `%.1` (1.2345 -> 123.4%)
 * @param {number} [height=200] height of the plot
 * @param {string=} [strokeColor=#f48a42] plot stroke color, expects hex value
 * @param {number=} [strokeWidth=1] plot stroke width
 * @param {string=} [markerColor=#f48a42] plot stroke color, expects hex value
 * @param {number=} [markerSize=0] plot stroke width
 * @param {number=} [markerSymbol=circle] plot stroke width
 * @param {string=} [timeRange] data range of x-axis / time axis
 * @param {string=} [dataRange] data range of y-axis / data axis
 * @param {string=} [showAxis] show or bide both axis
 * @param {boolean} [fixedScale] if false current view scales to fit only displayed values; if given overwrites TimeSeries' fixedScale
 */

const csMap = {
  curvebasis: "curvebasis",
  curvebasisopen: "curveBasisOpen",
  curvebundle: "curveBundle",
  curvecardinal: "curveCardinal",
  curvecardinalopen: "curveCardinalOpen",
  curvecatmullrom: "curveCatmullRom",
  curvecatmullromopen: "curveCatmullRomOpen",
  curvelinear: "curveLinear",
  curvemonotonex: "curveMonotoneX",
  curvemonotoney: "curveMonotoneY",
  curvenatural: "curveNatural",
  curveradial: "curveRadial",
  curvestep: "curveStep",
  curvestepafter: "curveStepAfter",
  curvestepbefore: "curveStepBefore",
};

const TagAttrs = types.model({
  legend: "",
  units: "",
  displayformat: types.optional(types.string, ".1f"),

  interpolation: types.optional(types.enumeration(Object.values(csMap)), "curveStep"),

  height: types.optional(types.string, "200"),

  strokewidth: types.optional(types.string, "1"),
  strokecolor: types.optional(types.string, ""),

  markersize: types.optional(types.string, "0"),
  markercolor: types.optional(types.string, ""),
  markersymbol: types.optional(types.string, "circle"),

  datarange: types.maybe(types.string),
  timerange: types.maybe(types.string),

  showaxis: types.optional(types.boolean, true),
  showyaxis: types.optional(types.boolean, true),

  fixedscale: types.maybe(types.boolean),

  column: types.string,
});

const Model = types
  .model("ChannelModel", {
    ...(isFF(FF_DEV_3391) ? { id: types.identifier } : { id: types.optional(types.identifier, guidGenerator) }),
    type: "channel",
    children: Types.unionArray(["channel", "view"]),
    parentTypes: Types.tagsTypes(["TimeSeries"]),
  })
  .views((self) => ({
    get columnName() {
      let column = self.column;

      if (/^\d+$/.test(column)) {
        column = self.parent?.headers[column] || column;
      }
      column = column.toLowerCase();
      return column;
    },
    get series() {
      return item.parent?.dataHash;
    },
    get margin() {
      return self.parent?.margin;
    },
  }));

const ChannelModel = types.compose("ChannelModel", TagParentMixin, Model, TagAttrs);

const HtxChannelViewD3 = ({ item }) => {
  if (!item.parent?.dataObj) return null;
  // @todo maybe later for some other option
  // let channels = item.parent?.overviewchannels;
  // if (channels) channels = channels.split(",");
  // if (channels && !channels.includes(item.value.substr(1))) return null;

  const channels = useMemo(() => [item], [item]);

  return (
    <TimeSeriesVisualizer
      time={item.parent?.keyColumn}
      column={item.columnName}
      item={item}
      channels={channels}
      data={item.parent?.dataObj}
      series={item.parent?.dataHash}
      range={item.parent?.brushRange}
      ranges={item.parent?.regs}
      cursorTime={item.parent?.cursorTime}
    />
  );
};

const HtxChannel = observer(HtxChannelViewD3);

Registry.addTag("channel", ChannelModel, HtxChannel);

export { ChannelModel, HtxChannel };
