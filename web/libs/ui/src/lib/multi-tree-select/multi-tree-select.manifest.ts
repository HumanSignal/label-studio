import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "MultiTreeSelect",
  tier: 2,
  exports: [
    "MultiTreeSelect",
    "MultiTreeSelectDropdown",
    "MultiTreeSelectProvider",
    "TreeNode",
    "TreeSearch",
    "TreeSelected",
  ],
  intent: [],
  use_when:
    "The provider-backed multi-tree picker used by pickers and the taxonomy editor until the unified TreeSelect lands.",
  never_when: [],
  replaces: [],
});
