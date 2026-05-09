import clsx from "clsx";
import { observer } from "mobx-react";
import styles from "./ChannelLegend.module.css";

const ChannelLegend = observer(({ item }) => {
  const { channels, highlightedChannelId, isChannelHiddenMap } = item;
  return (
    <div
      className={clsx(styles.channelLegend, "flex justify-center gap-2 mb-2", {
        [styles.hovering]: highlightedChannelId !== null,
      })}
    >
      {channels.map((channel) => {
        const isVisible = !isChannelHiddenMap[channel.id];
        const isHighlighted = highlightedChannelId === channel.id;

        return (
          <div
            key={channel.id}
            className={clsx(styles.channel, "cursor-pointer select-none", { [styles.hovered]: isHighlighted })}
            onMouseEnter={() => item.setHighlightedChannel(channel.id)}
            onMouseLeave={() => item.clearHighlightedChannel()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              item.toggleChannelVisibility(channel.id);
            }}
            style={{
              "--marker-color": channel.strokecolor,
            }}
          >
            <span className={clsx(styles.channelMarker, "mr-1", { [styles.hidden]: !isVisible })} />
            <span className="channel-name">{channel.legend || channel.columnName}</span>
          </div>
        );
      })}
    </div>
  );
});

export default ChannelLegend;
