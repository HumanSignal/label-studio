// `yieldToEditor`: the labeling editor uses the same key (Shift+Left/Right pan and grow time
// series regions), so the action gives way while the labeling panel is active.
export const keymap = {
  "dm.focus-previous": {
    title: "Focus previous task",
    shortcut: "shift+up",
  },
  "dm.focus-next": {
    title: "Focus previous task",
    shortcut: "shift+down",
  },
  "dm.close-labeling": {
    title: "Focus previous task",
    shortcut: "shift+left",
    yieldToEditor: true,
  },
  "dm.open-labeling": {
    title: "Focus previous task",
    shortcut: "shift+right",
    yieldToEditor: true,
  },
  "dm.toggle-bulk-sidebar-minimization": {
    title: "Toggle bulk sidebar minimization",
    shortcut: "shift+.",
  },
};
