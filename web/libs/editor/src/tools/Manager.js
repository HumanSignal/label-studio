import { ff } from "@humansignal/core";
import { destroy } from "mobx-state-tree";
import { FF_DEV_3391 } from "../utils/feature-flags";
import { guidGenerator } from "../utils/unique";

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

  /**
   * Reset any active drawing across all tool managers.
   * Called during annotation switching to properly clean up multi-click drawing
   * tools (Polygon, Vector) that may have an in-progress drawing on the outgoing
   * annotation. This is the annotation-switch counterpart of handleToolSwitch.
   */
  static resetActiveDrawings() {
    INSTANCES.forEach((manager) => manager.resetActiveDrawing());
  }

  constructor({ name } = {}) {
    this.name = name;
    this.tools = {};
    this._default_tool = null;
    this._prefix = guidGenerator();
  }

  get preservedTool() {
    return window.localStorage.getItem(`selected-tool:${this.name}`);
  }
  /**
    There are some problems with working with ToolManager with interactive view all flag switched on.
    For now, tool manager is hidden in view_all,
    so it allows us to use root and selected annotation
    while we are looking for the object or the control from the tool.
    At the same time, we can use `annotation_id`
    as an additional key to be able to get the right annotation in that view_all mode.
    But in that case,
    there will be a problem with the inconsistent state of tool manager for 2 different annotations in the context of the same task.
    */
  get root() {
    return root;
  }

  get obj() {
    if (ff.isActive(FF_DEV_3391)) {
      return root.annotationStore.selected?.names.get(this.name);
    }
    return root.annotationStore.names.get(this.name);
  }

  addTool(toolName, tool, removeDuplicatesNamed = null, prefix = guidGenerator()) {
    if (tool.smart && tool.control?.smartonly) return;
    // todo: It seems that key is used only for storing,
    // but not for finding tools, so may be there might
    // be an array instead of an object
    const name = tool.toolName ?? toolName;
    const key = `${prefix ?? this._prefix}#${name}`;

    if (removeDuplicatesNamed && toolName === removeDuplicatesNamed) {
      const findme = new RegExp(`^.*?#${name}.*$`);

      if (Object.keys(this.tools).some((entry) => findme.test(entry))) {
        return;
      }
    }

    this.tools[key] = tool;

    if (tool.default && !this._default_tool) this._default_tool = tool;

    if (this.preservedTool && tool.shouldPreserveSelectedState) {
      if (tool.fullName === this.preservedTool && tool.setSelected) {
        this.unselectAll();
        this.selectTool(tool, true, true);
        return;
      }
    }

    if (this._default_tool && !this.hasSelected) {
      this.selectTool(this._default_tool, true, true);
    }
  }

  unselectAll() {
    // when one of the tool get selected you need to unselect all
    // other active tools
    Object.values(this.tools).forEach((t) => {
      if (typeof t.selected !== "undefined") t.setSelected(false);
    });

    const stage = this.obj?.stageRef;

    if (stage) {
      stage.container().style.cursor = "default";
    }
  }

  selectTool(tool, selected, isInitial = false) {
    const currentTool = this.findSelectedTool();
    const newSelection = tool?.group;

    // if there are no tools selected, there are no specific labels to unselect
    // also this will skip annotation init
    if (currentTool && newSelection === "segmentation") {
      const toolType = tool.control.type.replace(/labels$/, "");
      const currentLabels = tool.obj.activeStates();
      // labels of different types; we can't create regions with different tools simultaneously, so we have to unselect them
      const unrelatedLabels = currentLabels.filter((tag) => {
        const type = tag.type.replace(/labels$/, "");

        if (tag.type === "labels") return false;
        if (type === toolType) return false;
        return true;
      });

      unrelatedLabels.forEach((tag) => tag.unselectAll());
    }

    currentTool?.handleToolSwitch?.(tool);
    currentTool?.complete?.();

    if (selected) {
      this.unselectAll();
      tool.setSelected?.(true, isInitial);
    } else {
      const drawingTool = this.findDrawingTool();

      this.selectTool(drawingTool ?? this._default_tool, true);
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
    if (s.tools) {
      const t = s.tools;

      Object.keys(t).forEach((k) => {
        this.addTool(k, t[k], s.removeDuplicatesNamed, s.name || s.id);
      });
    }
  }

  findSelectedTool() {
    return Object.values(this.tools).find((t) => t.selected);
  }

  findDrawingTool() {
    return Object.values(this.tools).find((t) => t.isDrawing);
  }

  /**
   * Release the active drawing tool's in-progress state without modifying the
   * region itself (the region may already be submitted). Delegates to the
   * tool's own MST action so that MST-protected properties are modified
   * correctly.
   */
  resetActiveDrawing() {
    const drawingTool = this.findDrawingTool();

    if (drawingTool?.currentArea) {
      drawingTool.resetBeforeAnnotationSwitch();
    }
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
    Object.values(this.tools).forEach((t) => destroy(t));
    this.tools = {};
    this._default_tool = null;
  }

  get hasSelected() {
    return Object.values(this.tools).some((t) => t.selected);
  }
}

window.ToolManager = ToolsManager;

export default ToolsManager;
