import React, { Component, Fragment } from "react";
import { Button, Divider, Icon, Slider } from "antd";
import { observer } from "mobx-react";

import styles from "./ImageControls.module.scss";

export default observer(
  class ImageControls extends Component {
    render() {
      /**
       * Control for brightness
       */
      let brightnessControl = (
        <Fragment>
          <Slider
            defaultValue={100}
            max={200}
            min={0}
            vertical
            tipFormatter={null}
            style={{ height: 50 }}
            onChange={value => {
              this.props.updateBrightness(value);
            }}
          />
        </Fragment>
      );
      /**
       * Control for zoom
       */
      let zoomControls = (
        <Fragment>
          <Button
            shape="circle"
            icon="zoom-in"
            className={styles.button}
            onClick={event => {
              this.props.handleZoom(1.2);
            }}
          ></Button>
          <Button
            shape="circle"
            icon="zoom-out"
            className={styles.button}
            onClick={() => {
              this.props.handleZoom(0.8);
            }}
          ></Button>
        </Fragment>
      );
      return (
        <div className={styles.block}>
          {this.props.item.brightness ? brightnessControl : null}
          {this.props.item.zoom ? zoomControls : null}
        </div>
      );
    }
  },
);
