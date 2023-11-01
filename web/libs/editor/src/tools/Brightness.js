import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import Constants from '../core/Constants';
import ToolMixin from '../mixins/Tool';

import { Tool } from '../components/Toolbar/Tool';
import { Range } from '../common/Range/Range';
import { IconBrightnessTool } from '../assets/icons';

const ToolView = observer(({ item }) => {
  return (
    <Tool
      active={item.selected}
      ariaLabel="brightness"
      label="Brightness"
      controlsOnHover
      controls={[
        <Range
          key="brightness"
          align="vertical"
          reverse
          continuous
          minIcon={<IconBrightnessTool style={{ width: 22, height: 22, opacity: 0.2 }}/>}
          maxIcon={<IconBrightnessTool style={{ width: 22, height: 22, opacity: 0.8 }}/>}
          value={item.brightness}
          max={Constants.BRIGHTNESS_MAX}
          onChange={val => {
            item.setStroke(val);
          }}
        />,
      ]}
      icon={<IconBrightnessTool />}
    />
  );
});

const _Tool = types
  .model({
    brightness: types.optional(types.number, Constants.BRIGHTNESS_VALUE),
  })
  .views(self => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },
  }))
  .actions(self => ({
    setStroke(val) {
      self.brightness = val;
      self.obj.setBrightnessGrade(val);
    },
  }));

const Brightness = types.compose(_Tool.name, ToolMixin, BaseTool, _Tool);

export { Brightness };
