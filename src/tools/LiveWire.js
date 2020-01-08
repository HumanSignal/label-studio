import React, { Component, Fragment } from "react";
import { observer } from "mobx-react";
import { types, getParent } from "mobx-state-tree";

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
      if (self.mode != "drawing") return;
    },

    mousedownEv(ev, [x, y]) {
      self.mode = "drawing";
    },
  }));

const LiveWire = types.compose(ToolMixin, _Tool, BaseTool);

export { LiveWire };
