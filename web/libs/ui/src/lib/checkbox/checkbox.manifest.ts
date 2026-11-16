import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Checkbox",
  tier: 1,
  exports: ["Checkbox"],
  intent: ["Select one or several items from a set"],
  use_when: "Selection of rows, options or items where several can be chosen at once, including indeterminate parents.",
  never_when: ["A raw <input type=checkbox>", "An on/off setting (use Toggle)"],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Table/TableCheckbox.jsx",
    'jsx:<input type="checkbox">',
  ],
});
