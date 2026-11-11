import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Pagination",
  tier: 1,
  exports: ["Pagination"],
  intent: ["move through pages of a list"],
  use_when: "Page controls for lists and tables, with page size where the list supports it.",
  never_when: ["an app-local Pagination", "prev/next Buttons wired by hand"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Pagination/Pagination.tsx",
    "services/lse/web/apps/labelstudio/src/components/Pagination/Pagination.tsx",
    "services/lso/web/libs/datamanager/src/components/Common/Pagination/Pagination.tsx",
    "services/lso/web/libs/editor/src/common/Pagination/Pagination.tsx",
  ],
});
