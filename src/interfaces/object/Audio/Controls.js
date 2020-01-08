import React, { Fragment } from "react";
import { Button, Icon } from "antd";
import { observer } from "mobx-react";

import Hint from "../../../components/Hint/Hint";

const AudioControls = observer(({ item, store }) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1em" }}>
      <Button
        type="primary"
        onClick={ev => {
          item._ws.playPause();
        }}
      >
        {item.playing && (
          <Fragment>
            <Icon type="pause-circle" /> Pause
            {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
              <Hint>[{item.hotkey}]</Hint>
            )}
          </Fragment>
        )}
        {!item.playing && (
          <Fragment>
            <Icon type="play-circle" /> Play
            {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
              <Hint>[{item.hotkey}]</Hint>
            )}
          </Fragment>
        )}
      </Button>
    </div>
  );
});

export default observer(AudioControls);
