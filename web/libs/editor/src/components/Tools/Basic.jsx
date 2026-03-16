import { Component } from "react";
import { Button, Tooltip } from "@humansignal/ui";
import { observer } from "mobx-react";

import styles from "./Styles.module.css";

export default observer(
  class BasicToolView extends Component {
    render() {
      return (
        <Tooltip title={this.props.tooltip} alignment="top-left">
          <Button
            shape="circle"
            variant={this.props.selected ? "primary" : "neutral"}
            disabled={!!this.props.disabled}
            leading={this.props.icon}
            className={styles.button}
            onClick={this.props.onClick}
            aria-label={this.props.tooltip || "Tool button"}
          />
        </Tooltip>
      );
    }
  },
);
