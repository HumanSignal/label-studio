import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "DataTable",
  tier: 1,
  category: "Data display",
  exports: ["DataTable"],
  intent: ["Rows and columns of data"],
  use_when: "Tabular data with sorting, selection, column sizing or virtualisation.",
  never_when: [
    "a raw <table> for datasets (use PropertyTable for compact inspector properties)",
    "a grid of divs styled as a table",
  ],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Table/Table.jsx",
    "services/lse/web/apps/labelstudio/src/pages/Organization/Models/@components/DataTable/DataTable.tsx",
    "jsx:<table>",
  ],
});
