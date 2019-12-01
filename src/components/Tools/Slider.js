import React, { Component, Fragment } from "react";
import { Button, Divider, Icon, Slider, Tooltip } from "antd";
import { observer } from "mobx-react";

export default observer(
  class SliderTool extends Component {
    render() {
      return (
        <Fragment>
          <Slider
            defaultValue={100}
            max={200}
            min={0}
            vertical
            tipFormatter={null}
            style={{ height: 50 }}
            onChange={value => {
              this.props.updateBrushStrokeWidth(value);
            }}
          />
          <Tooltip title={this.props.title} placement="left">
            <Button
              shape="circle"
              type={this.props.item.brushControl === "eraser" ? "primary" : "default"}
              className={styles.button}
              onClick={() => {
                this.props.updateBrushControl("eraser");
              }}
            >
              <Icon type={"scissor"} />
            </Button>
          </Tooltip>
        </Fragment>
      );
    }
  },
);
