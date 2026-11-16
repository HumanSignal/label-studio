import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Dropdown",
  tier: 1,
  exports: ["Dropdown", "DropdownTrigger"],
  intent: ["A list of actions behind a trigger"],
  use_when: "A menu of actions or options that opens from a button, a cell or a card.",
  never_when: ["An app-local Menu", "Raw buttons styled as menu items", "A Select for choosing values"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Menu/Menu.jsx",
    "services/lse/web/apps/labelstudio/src/components/Menu/Menu.jsx",
    "services/lso/web/libs/datamanager/src/components/Common/Menu/Menu.jsx",
    "services/lso/web/libs/editor/src/common/Menu/Menu.jsx",
    "services/lse/web/apps/labelstudio/src/components/ButtonDropdown/ButtonDropdown.tsx",
  ],
});
