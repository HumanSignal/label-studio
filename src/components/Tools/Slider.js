import React, { Component, Fragment } from "react";
import { Button, Divider, Icon, Slider, Tooltip } from "antd";
import { observer } from "mobx-react";

import styles from "./Styles.module.scss";

export default observer(
  class SliderTool extends Component {
    render() {
      return (
        <Fragment>
          <Slider
            defaultValue={15}
            max={50}
            min={0}
            vertical
            tipFormatter={null}
            style={{ height: 100 }}
            onChange={this.props.onChange}
          />
          <Tooltip title={this.props.title} placement="left">
            <Button
              shape="circle"
              type={this.props.selected ? "primary" : "default"}
              className={styles.button}
              onClick={this.props.onClick}
            >
              <Icon type={this.props.icon} />
            </Button>
          </Tooltip>
        </Fragment>
      );
    }
  },
);
