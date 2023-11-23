import { getEnv, getSnapshot, getType, types } from 'mobx-state-tree';
import { observer } from 'mobx-react';
import React from 'react';
import { Tool } from '../components/Toolbar/Tool';
import { toKebabCase } from 'strman';

const ToolView = observer(({ item }) => {
  return (
    <Tool
      ariaLabel={toKebabCase(getType(item).name)}
      active={item.selected}
      icon={item.iconClass}
      label={item.viewTooltip}
      shortcut={item.shortcut}
      extraShortcuts={item.extraShortcuts}
      tool={item}
      onClick={() => {
        item.manager.selectTool(item, true);
      }}
    />
  );
});

const BaseTool = types
  .model('BaseTool', {
    smart: false,
    unselectRegionOnToolChange: false,
    removeDuplicatesNamed: types.maybeNull(types.string),
  })
  .volatile(() => ({
    dynamic: false,
    index: 1,
  }))
  .views(self => {
    return {
      get toolName() {
        return getType(self).name;
      },
      get isSeparated() {
        return self.control.isSeparated;
      },
      get viewClass() {
        return () => self.shouldRenderView ? <ToolView item={self} /> : null;
      },
      get viewTooltip() {
        return null;
      },
      get controls() {
        return null;
      },
      get shouldRenderView() {
        return (self.isSeparated || self.smartEnabled) && self.iconClass;
      },
      get iconClass() {
        if (self.iconComponent) {
          const Icon = self.iconComponent;

          return <Icon />;
        }
        return null;
      },
      get iconComponent() {
        return null;
      },
      get smartEnabled() {
        return self.control?.smartEnabled ?? false;
      },
    };
  })
  .actions((self) => {
    return {
      afterCreate() {
        if (self.smart && self.control?.smart) {
          const currentEnv = getEnv(self);
          const toolType = getType(self);
          const snapshot = {
            ...getSnapshot(self),
            smart: false,
            default: false,
          };
          const env = {
            ...currentEnv,
          };

          const smartCopy = toolType.create(snapshot, env);

          smartCopy.makeDynamic();

          getEnv(self).manager.addTool(`${toolType.name}-smart`, smartCopy, self.control.removeDuplicatesNamed);
        }
      },

      makeDynamic() {
        self.dynamic = true;
      },
    };
  });


export const MIN_SIZE = { X: 3, Y: 3 };

export const DEFAULT_DIMENSIONS = {
  rect: { width: 30, height: 30 },
  ellipse: { radius: 30 },
  polygon: { length: 30 },
};

export default BaseTool;
