import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Select",
  tier: 1,
  exports: ["Select"],
  intent: ["Pick one or several values from a flat list"],
  use_when: "Choosing from a flat list of options, single or multiple, searchable or not, with read-only display mode.",
  never_when: ["A raw <select>", "Hierarchies (use TreeSelect)", "Free text (use Input once it exists)"],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Form/Elements/MultiSelect/MultiSelect.jsx",
    "services/lse/web/apps/labelstudio/src/components/MultiSelect/MultiSelect.tsx",
    "services/lso/web/apps/labelstudio/src/components/Form/Elements/Select/Select.jsx",
    "services/lse/web/apps/labelstudio/src/components/Form/Elements/Select/Select.tsx",
    "services/lso/web/libs/datamanager/src/components/Common/Form/Elements/Select/Select.jsx",
  ],
});
