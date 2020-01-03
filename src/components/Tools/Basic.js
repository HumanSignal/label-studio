import React, { Component } from "react";
import { Button, Tooltip } from "antd";
import { observer } from "mobx-react";

import styles from "./Styles.module.scss";

export default observer(
  class BasicToolView extends Component {
    render() {
      return (
        <Tooltip title={this.props.tooltip} placement="left">
          <Button
            shape="circle"
            type={this.props.selected ? "primary" : "default"}
            disabled={this.props.disabled ? true : false}
            icon={this.props.icon}
            className={styles.button}
            onClick={this.props.onClick}
          ></Button>
        </Tooltip>
      );
    }
  },
);
