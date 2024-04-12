import React, { Component, Fragment } from 'react';
import { Button, Dropdown, Menu, Slider } from 'antd';
import { observer } from 'mobx-react';
import { ReloadOutlined } from '@ant-design/icons';

import styles from './Styles.module.scss';

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
              shape="circle"
              type={this.props.selected ? 'primary' : 'default'}
              className={styles.button}
              onClick={this.props.onResetClick}
            >
              <ReloadOutlined />
            </Button>
          </Menu.Item>
        </Menu>
      );

      return (
        <Fragment>
          <Dropdown overlay={menu}>
            <Button shape="circle" className={styles.button}>
              {this.props.icon}
            </Button>
          </Dropdown>
        </Fragment>
      );
    }
  },
);
