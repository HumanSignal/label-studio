import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "TaxonomyMultiTreeSelect",
  tier: 2,
  category: "Product",
  exports: ["TaxonomyMultiTreeSelect"],
  intent: [],
  use_when: "Taxonomy selection in the labeling editor.",
  never_when: [],
  replaces: [],
});
