import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "TaxonomyMultiTreeSelect",
  tier: 2,
  exports: ["TaxonomyMultiTreeSelect"],
  intent: [],
  use_when: "Taxonomy selection in the labeling editor.",
  never_when: [],
  replaces: [],
});
