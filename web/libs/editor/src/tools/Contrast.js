import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import Constants from '../core/Constants';
import ToolMixin from '../mixins/Tool';

import { Tool } from '../components/Toolbar/Tool';
import { Range } from '../common/Range/Range';
import { IconContrastTool } from '../assets/icons';

const ToolView = observer(({ item }) => {
  return (
    <Tool
      active={item.selected}
      ariaLabel="contrast"
      label="Contrast"
      controlsOnHover
      controls={[
        <Range
          key="contrast"
          align="vertical"
          reverse
          continuous
          minIcon={<IconContrastTool style={{ width: 22, height: 22, opacity: 0.2 }}/>}
          maxIcon={<IconContrastTool style={{ width: 22, height: 22, opacity: 0.8 }}/>}
          value={item.contrast}
          max={Constants.CONTRAST_MAX}
          onChange={val => {
            item.setStroke(val);
          }}
        />,
      ]}
      icon={<IconContrastTool />}
    />
  );
});

const _Tool = types
  .model('ContrastTool', {
    contrast: types.optional(types.number, Constants.CONTRAST_VALUE),
  })
  .views(self => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },
  }))
  .actions(self => ({
    setStroke(val) {
      self.contrast = val;
      self.obj.setContrastGrade(val);
    },
  }));

const Contrast = types.compose(_Tool.name, ToolMixin, BaseTool, _Tool);

export { Contrast };
