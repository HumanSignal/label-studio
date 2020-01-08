import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import BasicTool from "../components/Tools/Basic";
import ToolMixin from "../mixins/Tool";

const ToolView = observer(({ item }) => {
  return (
    <BasicTool
      selected={item.selected}
      onClick={ev => {
        item.manager.unselectAll();
        item.setSelected(true);
      }}
      icon={"scissor"}
    />
  );
});

const _Tool = types
  .model({})
  .views(self => ({
    get viewClass() {
      return <ToolView item={self} />;
    },
  }))
  .actions(self => ({
    mouseupEv() {
      self.mode = "viewing";
    },

    mousemoveEv(ev, [x, y]) {
      if (self.mode !== "drawing") return;

      const shape = self.getActiveShape;
      if (shape && shape.type === "brushregion") {
        shape.current.addPoints([Math.floor(x), Math.floor(y)]);
      }
    },

    mousedownEv(ev, [x, y]) {
      self.mode = "drawing";

      const shape = self.getActiveShape;
      if (shape && shape.type === "brushregion") {
        shape.addPoints({ type: "eraser" });
      }
    },
  }));

const Erase = types.compose(ToolMixin, _Tool, BaseTool);

export { Erase };
