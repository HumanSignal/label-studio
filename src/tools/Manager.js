class ToolsManager {
  constructor({ obj }) {
    this.obj = obj;
    this.tools = {};
    this._default_tool = null;
  }

  addTool(name, tool) {
    this.tools[name] = tool;
    tool._manager = this;

    if (tool.default) {
      this._default_tool = tool;
    }
  }

  unselectAll() {
    // when one of the tool get selected you need to unselect all
    // other active tools
    Object.values(this.tools).forEach(t => {
      if (typeof t.selected !== "undefined") t.setSelected(false);
    });
  }

  allTools() {
    return Object.values(this.tools);
  }

  addToolsFromControl(s) {
    const self = this;

    if (s.getTools) {
      const t = s.getTools();

      Object.keys(t).forEach(k => {
        self.addTool(k, t[k]);
      });
    }
  }

  findSelectedTool() {
    return Object.values(this.tools).find(t => t.selected);
  }

  event(name, ev, ...args) {
    // if there is an active tool, dispatch there
    const selectedTool = this.findSelectedTool();

    if (selectedTool) {
      selectedTool.event(name, ev, args);
      return;
    }

    // if there is a default tool then dispatch an event there
    if (this._default_tool) {
      this._default_tool.event(name, ev, args);
      return;
    }
  }
}

export default ToolsManager;
