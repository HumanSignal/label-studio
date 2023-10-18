import { useMemo, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import './Toolbar.styl';
import './Tool.styl';
import './FlyoutMenu.styl';
import { useWindowSize } from '../../common/Utils/useWindowSize';
import { isDefined } from '../../utils/utilities';
import { inject, observer } from 'mobx-react';
import { ToolbarProvider } from './ToolbarContext';
import { Tool } from './Tool';

export const Toolbar = inject('store')(observer(({ store, tools, expanded }) => {
  const [toolbar, setToolbar] = useState(null);
  const windowSize = useWindowSize();

  const alignment = useMemo(() => {
    if (!isDefined(toolbar)) return 'right';

    const bbox = toolbar.getBoundingClientRect();

    if (bbox.left < 200) {
      return 'right';
    } else if (windowSize.width - bbox.right < 200) {
      return 'left';
    }

    return 'right';
  }, [toolbar, windowSize]);

  const toolGroups = tools.filter(t => !t.dynamic).reduce((res,tool) => {
    const group = res[tool.group] ?? [];

    group.push(tool);
    res[tool.group] = group;
    return res;
  }, {});

  const smartTools = tools.filter(t => t.dynamic);

  return (
    <ToolbarProvider value={{ expanded, alignment }}>
      <Block ref={(el) => setToolbar(el)} name="toolbar" mod={{ alignment, expanded }}>
        {Object.entries(toolGroups).map(([name, tools], i) => {
          const visibleTools = tools.filter(t => t.viewClass);

          return visibleTools.length ? (
            <Elem name="group" key={`toolset-${name}-${i}`}>
              {visibleTools.sort((a, b) => a.index - b.index).map((tool, i) => {
                const ToolComponent = tool.viewClass;

                return (
                  <ToolComponent key={`${tool.toolName}-${i}`}/>
                );
              })}
            </Elem>
          ) : null;
        })}
        {store.autoAnnotation && (
          <SmartTools tools={smartTools}/>
        )}
      </Block>
    </ToolbarProvider>
  );
}));

const SmartTools = observer(({ tools }) => {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(tools.findIndex(t => t.selected), 0));

  const selected = useMemo(() => tools[selectedIndex], [selectedIndex]);

  const hasSelected = tools.some(t => t.selected);

  return tools.length > 0 && (
    <Elem name="group">
      <Tool
        smart
        label="Auto-Detect"
        active={hasSelected}
        icon={selected.iconClass}
        shortcut="M"
        extra={tools.length > 1 ? (
          <Elem name="smart">
            {tools.map((t, i) => {
              const ToolView = t.viewClass;

              return (
                <div key={`${i}`} onClickCapture={(e) => {
                  e.preventDefault();
                  setSelectedIndex(i);
                  t.manager.selectTool(t, true);
                }}>
                  <ToolView />
                </div>
              );
            })}
          </Elem>
        ) : null}
        controls={selected.controls}
        onClick={() => {
          let nextIndex = selectedIndex + 1;

          if (!hasSelected) nextIndex = 0;
          else if (nextIndex >= tools.length) nextIndex = 0;

          const nextTool = tools[nextIndex];

          setSelectedIndex(nextIndex);
          nextTool.manager.selectTool(nextTool, true);
        }}
      />
    </Elem>
  );
});
