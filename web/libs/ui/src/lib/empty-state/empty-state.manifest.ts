import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "EmptyState",
  tier: 1,
  exports: ["EmptyState"],
  intent: ["Nothing to show"],
  use_when: "No data, no results or a first-run screen: icon, title, description and the action that fills it.",
  never_when: ["A bare 'No data' Typography", "An app-local empty block"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/EmptyState/EmptyState.jsx",
    "services/lso/web/libs/datamanager/src/components/MainView/DataView/empty-state/EmptyState.tsx",
    "services/lso/web/libs/editor/src/components/SidePanels/Components/EmptyState.tsx",
  ],
});
