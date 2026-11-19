import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "JsonViewer",
  tier: 2,
  category: "Data display",
  exports: ["JsonViewer"],
  intent: [],
  use_when: "Expandable, virtualised JSON for task data and results.",
  never_when: [],
  replaces: [],
});
