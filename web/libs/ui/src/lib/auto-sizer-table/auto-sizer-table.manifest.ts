import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "AutoSizerTable",
  tier: 2,
  exports: ["AutoSizerTable"],
  intent: [],
  use_when: "A DataTable that fills its container height.",
  never_when: [],
  replaces: [],
});
