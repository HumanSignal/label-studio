import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import { IconMoveTool } from "@humansignal/icons";
import { Tool } from "../components/Toolbar/Tool";
import { AnnotationMixin } from "../mixins/AnnotationMixin";
import ToolMixin from "../mixins/Tool";
import { FF_LSDV_4930, isFF } from "../utils/feature-flags";
import BaseTool from "./Base";

const ToolView = observer(({ item }) => {
  return (
    <Tool
      ariaLabel="move-tool"
      active={item.selected}
      icon={<IconMoveTool />}
      label="Move"
      shortcut={item.shortcut}
      extraShortcuts={item.extraShortcuts}
      onClick={() => {
        item.manager.selectTool(item, !item.selected);
      }}
    />
  );
});

const _Tool = types
  .model("SelectionTool", {
    shortcut: "tool:move",
    group: "control",
  })
  .views((self) => {
    return {
      get viewClass() {
        return () => <ToolView item={self} />;
      },
      get useTransformer() {
        return true;
      },
    };
  })
  .actions((self) => {
    let isSelecting = false;

    return {
      /**
       * Indicates that move tool always interacts with regions
       */
      shouldSkipInteractions() {
        return false;
      },

      notifyRegions(type, x, y) {
        for (const reg of self.obj.regs) {
          reg?.onSelection?.(type, x, y);
        }
      },

      mousedownEv(ev, [x, y]) {
        isSelecting = true;
        self.obj.setSelectionStart({ x, y });
        self.notifyRegions("start", x, y);
      },

      mousemoveEv(ev, [x, y]) {
        if (!isSelecting) return;
        self.obj.setSelectionEnd({ x, y });
        self.notifyRegions("move", x, y);
      },

      mouseupEv(ev, [x, y]) {
        if (!isSelecting) return;
        self.obj.setSelectionEnd({ x, y });
        const { regionsInSelectionArea } = self.obj;

        self.notifyRegions("end", x, y);
        self.obj.resetSelection();
        if (ev.ctrlKey || ev.metaKey) {
          self.annotation.extendSelectionWith(regionsInSelectionArea);
        } else {
          self.annotation.selectAreas(regionsInSelectionArea);
        }
        isSelecting = false;
      },
      clickEv(ev) {
        if (isFF(FF_LSDV_4930)) {
          isSelecting = false;
          self.obj.resetSelection();
          if (!ev.ctrlKey && !ev.metaKey) {
            self.annotation.unselectAreas();
            self.notifyRegions("reset");
          }
        }
      },
    };
  });

const Selection = types.compose("MoveTool", ToolMixin, BaseTool, AnnotationMixin, _Tool);

export { Selection };
