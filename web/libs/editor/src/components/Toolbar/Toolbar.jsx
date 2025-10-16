import { useMemo, useState } from "react";
import { inject, observer } from "mobx-react";

import { useWindowSize } from "../../common/Utils/useWindowSize";
import { cn } from "../../utils/bem";
import { isDefined } from "../../utils/utilities";
import { Tool } from "./Tool";
import { ToolbarProvider } from "./ToolbarContext";

import "./FlyoutMenu.scss";
import "./Tool.scss";
import "./Toolbar.scss";

export const Toolbar = inject("store")(
  observer(({ store, tools, expanded }) => {
    const [toolbar, setToolbar] = useState(null);
    const windowSize = useWindowSize();

    const alignment = useMemo(() => {
      if (!isDefined(toolbar)) return "right";

      const bbox = toolbar.getBoundingClientRect();

      if (bbox.left < 200) {
        return "right";
      }
      if (windowSize.width - bbox.right < 200) {
        return "left";
      }

      return "right";
    }, [toolbar, windowSize]);

    const toolGroups = tools
      .filter((t) => !t.dynamic)
      .reduce((res, tool) => {
        const group = res[tool.group] ?? [];

        group.push(tool);
        res[tool.group] = group;
        return res;
      }, {});

    const smartTools = tools.filter((t) => t.dynamic);

    return (
      <ToolbarProvider value={{ expanded, alignment }}>
        <div ref={(el) => setToolbar(el)} className={cn("toolbar").mod({ alignment, expanded }).toClassName()}>
          {Object.entries(toolGroups).map(([name, tools], i) => {
            const visibleTools = tools.filter((t) => t.viewClass);

            return visibleTools.length ? (
              <div className={cn("toolbar").elem("group").toClassName()} key={`toolset-${name}-${i}`}>
                {visibleTools
                  .sort((a, b) => a.index - b.index)
                  .map((tool, i) => {
                    const ToolComponent = tool.viewClass;

                    return <ToolComponent key={`${tool.toolName}-${i}`} />;
                  })}
              </div>
            ) : null;
          })}
          {store.autoAnnotation && <SmartTools tools={smartTools} />}
        </div>
      </ToolbarProvider>
    );
  }),
);

const SmartTools = observer(({ tools }) => {
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(
      tools.findIndex((t) => t.selected),
      0,
    ),
  );

  const selected = useMemo(() => tools[selectedIndex], [selectedIndex]);

  const hasSelected = tools.some((t) => t.selected);

  return (
    tools.length > 0 && (
      <div className={cn("toolbar").elem("group").toClassName()}>
        <Tool
          smart
          label="Auto-Detect"
          active={hasSelected}
          icon={selected.iconClass}
          shortcut="tool:auto-detect"
          extra={
            tools.length > 1 ? (
              <div className={cn("toolbar").elem("smart").toClassName()}>
                {tools.map((t, i) => {
                  const ToolView = t.viewClass;

                  return (
                    <div
                      key={`${i}`}
                      onClickCapture={(e) => {
                        e.preventDefault();
                        setSelectedIndex(i);
                        t.manager.selectTool(t, true);
                      }}
                    >
                      <ToolView />
                    </div>
                  );
                })}
              </div>
            ) : null
          }
          controls={selected.controls}
          onClick={(e) => {
            let nextIndex = selectedIndex + 1;

            // if that's a smart button in extra block, it's already selected
            // if it's a hotkey handler, there are no `e` event
            if (e?.target?.closest(`.${cn("tool").elem("extra")}`)) return;

            if (!hasSelected) nextIndex = 0;
            else if (nextIndex >= tools.length) nextIndex = 0;

            const nextTool = tools[nextIndex];

            setSelectedIndex(nextIndex);
            nextTool.manager.selectTool(nextTool, true);
          }}
        />
      </div>
    )
  );
});
