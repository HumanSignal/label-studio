import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "TreeSelect",
  tier: 2,
  exports: ["TreeSelect", "TreeSelectItem"],
  intent: [],
  use_when: "Choosing from a hierarchy, single or multiple, searchable.",
  never_when: [],
  replaces: [],
});
