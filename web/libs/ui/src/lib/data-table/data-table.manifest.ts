import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "DataTable",
  tier: 1,
  exports: ["DataTable"],
  intent: ["rows and columns of data"],
  use_when: "Tabular data with sorting, selection, column sizing or virtualisation.",
  never_when: ["a raw <table>", "a grid of divs styled as a table"],
  replaces: ["services/lso/web/libs/datamanager/src/components/Common/Table/Table.jsx", "jsx:<table>"],
});
