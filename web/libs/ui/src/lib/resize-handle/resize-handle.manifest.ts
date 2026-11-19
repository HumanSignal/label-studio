import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "ResizeHandle",
  tier: 2,
  category: "Layout",
  exports: ["ResizeHandle"],
  intent: [],
  use_when: "The drag handle between resizable panels.",
  never_when: [],
  replaces: [],
});
