import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "TaxonomySelectionList",
  tier: 2,
  exports: ["TaxonomySelectionList"],
  intent: [],
  use_when: "The read-only list of selected taxonomy paths.",
  never_when: [],
  replaces: [],
});
