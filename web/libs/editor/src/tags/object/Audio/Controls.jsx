import React, { Fragment } from "react";
import { Button } from "antd";
import { observer } from "mobx-react";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";

import Hint from "../../../components/Hint/Hint";

const AudioControls = ({ item, store }) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1em" }}>
      <Button
        type="primary"
        onClick={() => {
          item._ws.playPause();
        }}
      >
        {item.playing && (
          <Fragment>
            <PauseCircleOutlined /> <span>Pause</span>
            {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
              <Hint>[{item.hotkey}]</Hint>
            )}
          </Fragment>
        )}
        {!item.playing && (
          <Fragment>
            <PlayCircleOutlined /> <span>Play</span>
            {store.settings.enableTooltips && store.settings.enableHotkeys && item.hotkey && (
              <Hint>[{item.hotkey}]</Hint>
            )}
          </Fragment>
        )}
      </Button>
    </div>
  );
};

export default observer(AudioControls);
