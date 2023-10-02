import { destroy } from 'mobx-state-tree';
import { guidGenerator } from '../utils/unique';
import { FF_DEV_4081, isFF } from '../utils/feature-flags';

/** @type {Map<any, ToolsManager>} */
const INSTANCES = new Map();
let root = null;

class ToolsManager {
  static getInstance({ name } = {}) {
    if (!name) return;

    if (INSTANCES.has(name)) {
      return INSTANCES.get(name);
    }

    const instance = new ToolsManager({ name });

    INSTANCES.set(name, instance);
    return instance;
  }

  static allInstances() {
    return Array.from(INSTANCES.values());
  }

  static setRoot(rootStore) {
    root = rootStore;
  }

  static removeAllTools() {
    INSTANCES.forEach((manager) => manager.removeAllTools());
    INSTANCES.clear();
  }

  constructor({
    name,
  } = {}) {
    this.name = name;
    this.tools = {};
    this._default_tool = null;
    this._prefix = guidGenerator();
  }

  get preservedTool() {
    return window.localStorage.getItem(`selected-tool:${this.name}`);
  }

  get obj() {
    return root.annotationStore.names.get(this.name);
  }

  addTool(toolName, tool, removeDuplicatesNamed = null, prefix = guidGenerator()) {
    if (tool.smart && tool.smartOnly) return;
    // todo: It seems that key is used only for storing,
    // but not for finding tools, so may be there might
    // be an array instead of an object
    const name = tool.toolName ?? toolName;
    const key = `${prefix ?? this._prefix}#${name}`;

    if (isFF(FF_DEV_4081) && removeDuplicatesNamed && toolName === removeDuplicatesNamed) {
      const findme = new RegExp(`^.*?#${name}.*$`);

      if (Object.keys(this.tools).some(entry => findme.test(entry))) {
        console.log(`Ignoring duplicate tool ${name} because it matches removeDuplicatesNamed ${removeDuplicatesNamed}`);
        return;
      }
    }

    this.tools[key] = tool;

    if (tool.default && !this._default_tool) this._default_tool = tool;

    if (this.preservedTool && tool.shouldPreserveSelectedState) {
      if (tool.fullName === this.preservedTool && tool.setSelected) {
        this.unselectAll();
        this.selectTool(tool, true);
      }
      return;
    }

    if (this._default_tool && !this.hasSelected) {
      this.selectTool(this._default_tool, true);
    }
  }

  unselectAll() {
    // when one of the tool get selected you need to unselect all
    // other active tools
    Object.values(this.tools).forEach(t => {
      if (typeof t.selected !== 'undefined') t.setSelected(false);
    });

    const stage = this.obj?.stageRef;

    if (stage) {
      stage.container().style.cursor = 'default';
    }
  }

  selectTool(tool, selected) {
    const currentTool = this.findSelectedTool();
    const newSelection = tool?.group;

    // if there are no tools selected, there are no specific labels to unselect
    // also this will skip annotation init
    if (currentTool && newSelection === 'segmentation') {
      const toolType = tool.control.type.replace(/labels$/, '');
      const currentLabels = tool.obj.activeStates();
      // labels of different types; we can't create regions with different tools simultaneously, so we have to unselect them
      const unrelatedLabels = currentLabels.filter(tag => {
        const type = tag.type.replace(/labels$/, '');

        if (tag.type === 'labels') return false;
        if (type === toolType) return false;
        return true;
      });

      unrelatedLabels.forEach(tag => tag.unselectAll());
    }

    if (currentTool && currentTool.handleToolSwitch) {
      currentTool.handleToolSwitch(tool);
    }

    if (selected) {
      this.unselectAll();
      if (tool.setSelected) tool.setSelected(true);
    } else {
      const drawingTool = this.findDrawingTool();

      if (drawingTool) return this.selectTool(drawingTool, true);
      if (tool.setSelected) tool.setSelected(false);
    }
  }

  selectDefault() {
    const tool = this.findSelectedTool();

    if (this._default_tool && tool?.dynamic === true) {
      this.unselectAll();
      this._default_tool.setSelected(true);
    }
  }

  allTools() {
    return Object.values(this.tools);
  }

  addToolsFromControl(s) {
    const self = this;

    if (s.tools) {
      const t = s.tools;

      Object.keys(t).forEach(k => {
        self.addTool(k, t[k], s.removeDuplicatesNamed, s.name || s.id);
      });
    }
  }

  findSelectedTool() {
    return Object.values(this.tools).find(t => t.selected);
  }

  findDrawingTool() {
    return Object.values(this.tools).find(t => t.isDrawing);
  }

  event(name, ev, ...args) {
    // if there is an active tool, dispatch there
    const selectedTool = this.findSelectedTool();

    if (selectedTool) {
      selectedTool.event(name, ev, args);
      return;
    }
  }

  reload({ name } = {}) {
    INSTANCES.delete(this.name);
    INSTANCES.set(name, this);

    this.removeAllTools();

    this.name = name;
  }

  removeAllTools() {
    Object.values(this.tools).forEach(t => destroy(t));
    this.tools = {};
    this._default_tool = null;
  }

  get hasSelected() {
    return Object.values(this.tools).some(t => t.selected);
  }
}

window.ToolManager = ToolsManager;

export default ToolsManager;
