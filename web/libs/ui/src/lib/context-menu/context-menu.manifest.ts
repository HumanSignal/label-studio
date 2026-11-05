import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "ContextMenu",
  tier: 1,
  exports: ["ContextMenu"],
  intent: ["a right-click menu"],
  use_when: "Actions on an item opened with a right click or a kebab on canvas-like surfaces.",
  never_when: ["a Dropdown opened by right click by hand"],
  replaces: [],
});
