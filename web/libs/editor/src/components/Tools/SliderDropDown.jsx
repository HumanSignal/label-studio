import { Component, Fragment } from "react";
import { Dropdown, Menu, Slider } from "antd";
import { Button, IconRefresh } from "@humansignal/ui";
import { observer } from "mobx-react";

import styles from "./Styles.module.css";

export default observer(
  class SliderDropDownTool extends Component {
    render() {
      const menu = (
        <Menu>
          <Menu.Item key="1">
            <Slider
              defaultValue={this.props.default || 15}
              max={this.props.max || 50}
              value={this.props.value}
              min={0}
              vertical
              tipFormatter={null}
              style={{ height: this.props.height || 100 }}
              onChange={this.props.onChange}
            />
            <Button
              variant={this.props.selected ? "primary" : "neutral"}
              className={styles.button}
              onClick={this.props.onResetClick}
            >
              <IconRefresh />
            </Button>
          </Menu.Item>
        </Menu>
      );

      return (
        <Fragment>
          <Dropdown overlay={menu}>
            <Button className={styles.button} aria-label="Slider options">
              {this.props.icon}
            </Button>
          </Dropdown>
        </Fragment>
      );
    }
  },
);
