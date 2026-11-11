import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "ColumnBrowser",
  tier: 2,
  exports: ["ColumnBrowser", "ColumnBrowserColumn", "ColumnBrowserItem"],
  intent: [],
  use_when: "Miller-column browsing of nested catalogs.",
  never_when: [],
  replaces: [],
});
