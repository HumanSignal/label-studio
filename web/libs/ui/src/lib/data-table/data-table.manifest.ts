import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "DataTable",
  tier: 1,
  exports: ["DataTable"],
  intent: ["Rows and columns of data"],
  use_when: "Tabular data with sorting, selection, column sizing or virtualisation.",
  never_when: ["A raw <table>", "A grid of divs styled as a table"],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Table/Table.jsx",
    "services/lse/web/apps/labelstudio/src/pages/Organization/Models/@components/DataTable/DataTable.tsx",
    "jsx:<table>",
  ],
});
