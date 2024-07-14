import React, { Component, Fragment } from "react";
import { Button, Slider, Tooltip } from "antd";
import { observer } from "mobx-react";

import styles from "./Styles.module.scss";

export default observer(
  class SliderTool extends Component {
    render() {
      return (
        <Fragment>
          <Slider
            value={this.props.value}
            defaultValue={this.props.default || 15}
            max={this.props.max || 50}
            min={1}
            vertical
            tipFormatter={null}
            style={{ height: this.props.height || 100 }}
            onChange={this.props.onChange}
          />
          <Tooltip title={this.props.title} placement="left">
            <Button
              shape="circle"
              type={this.props.selected ? "primary" : "default"}
              className={styles.button}
              onClick={this.props.onClick}
            >
              {this.props.icon}
            </Button>
          </Tooltip>
        </Fragment>
      );
    }
  },
);
