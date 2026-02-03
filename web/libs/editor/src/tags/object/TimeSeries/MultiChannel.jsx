import { observer } from "mobx-react";
import { types } from "mobx-state-tree";
import Types from "../../../core/Types";
import { TagParentMixin } from "../../../mixins/TagParentMixin";
import Registry from "../../../core/Registry";
import TimeSeriesVisualizer from "../../../components/TimeSeries/TimeSeriesVisualizer";
import ChannelLegend from "./ChannelLegend";
import { getChannelColor } from "./palette";

/**
 * MultiChannel tag for grouped display of channels on the same plot
 * @name MultiChannel
 * @param {number} [height=200] height of the plot
 * @param {boolean} [showAxis=true] whether to show both axes
 * @param {boolean} [showYAxis=true] whether to show the y-axis
 * @param {boolean} [fixedScale] whether to use a fixed scale for all channels. If not set, inherits from parent TimeSeries tag
 * @example
 * <TimeSeries name="ts" value="$timeseries" valueType="json">
 *   <MultiChannel height="300" showAxis={true} showYAxis={true}>
 *     <Channel column="velocity" legend="Velocity"/>
 *     <Channel column="acceleration" legend="Acceleration"/>
 *   </MultiChannel>
 * </TimeSeries>
 */
const Model = types
  .model("MultiChannelModel", {
    id: types.optional(types.identifier, () => Math.random().toString(36).slice(2)),
    type: "multichannel",
    children: Types.unionArray(["channel"]),
    parentTypes: Types.tagsTypes(["TimeSeries"]),
    height: types.optional(types.string, "200"),

    showaxis: types.optional(types.boolean, true),
    showyaxis: types.optional(types.boolean, true),

    fixedscale: types.maybe(types.boolean),
  })
  .volatile((self) => ({
    isChannelHiddenMap: {},
    highlightedChannelId: null,
  }))
  .views((self) => ({
    get channels() {
      return self.children.filter((child) => child.type === "channel");
    },

    get margin() {
      // If Y axis is hidden, we don't need to consider it for margin calculation
      if (!self.showyaxis) return self.parent?.margin;

      const channelsWithYAxis = self.channels.filter((channel) => channel.showaxis && channel.showyaxis);
      if (channelsWithYAxis.length > 1) {
        return {
          ...self.parent?.margin,
          right: self.parent?.margin.left,
        };
      }
      return self.parent?.margin;
    },
  }))
  .actions((self) => ({
    afterCreate() {
      self.channels.forEach((channel, idx) => {
        if (channel.strokecolor === "") {
          channel.strokecolor = getChannelColor(idx);
        }
        if (channel.markercolor === "") {
          channel.markercolor = getChannelColor(idx);
        }
      });
    },
    toggleChannelVisibility(channelId) {
      self.isChannelHiddenMap = {
        ...self.isChannelHiddenMap,
        [channelId]: !self.isChannelHiddenMap[channelId],
      };
    },

    setHighlightedChannel(channelId) {
      self.highlightedChannelId = channelId;
    },

    clearHighlightedChannel() {
      self.highlightedChannelId = null;
    },
  }));

// MultiChannel component for rendering multiple channels in a single visualization
const HtxMultiChannel = observer(({ item }) => {
  if (!item.parent?.dataObj) return null;

  return (
    <div className="htx-timeseries-multichannel">
      <div className="htx-timeseries-channel-legend-container">
        <ChannelLegend item={item} />
      </div>
      <TimeSeriesVisualizer
        time={item.parent?.keyColumn}
        channels={item.channels}
        item={item}
        data={item.parent?.dataObj}
        series={item.parent?.dataHash}
        range={item.parent?.brushRange}
        ranges={item.parent?.regs}
        cursorTime={item.parent?.cursorTime}
      />
    </div>
  );
});

const MultiChannelModel = types.compose("MultiChannelModel", TagParentMixin, Model);

Registry.addTag("multichannel", MultiChannelModel, HtxMultiChannel);

export { MultiChannelModel, HtxMultiChannel };
