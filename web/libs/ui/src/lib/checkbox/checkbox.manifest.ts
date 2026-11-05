import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Checkbox",
  tier: 1,
  exports: ["Checkbox"],
  intent: ["select one or several items from a set"],
  use_when: "Selection of rows, options or items where several can be chosen at once, including indeterminate parents.",
  never_when: ["a raw <input type=checkbox>", "an on/off setting (use Toggle)"],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Table/TableCheckbox.jsx",
    'jsx:<input type="checkbox">',
  ],
});
