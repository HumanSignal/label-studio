import React, { Fragment, Component } from "react";
import { observer } from "mobx-react";
import { Button, Icon } from "antd";

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
          </Fragment>
        )}
        {!item.playing && (
          <Fragment>
            <Icon type="play-circle" /> Play
          </Fragment>
        )}
      </Button>
    </div>
  );
});

export default observer(AudioControls);
