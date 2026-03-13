import { Component, Fragment } from "react";
import { Slider } from "antd";
import { Button, cn, Tooltip } from "@humansignal/ui";
import { observer } from "mobx-react";

import styles from "./Styles.module.css";

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
          <Tooltip title={this.props.title} alignment="top-left">
            <Button
              look={this.props.selected ? "filled" : "outlined"}
              className={cn(styles.button, "rounded-full")}
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
