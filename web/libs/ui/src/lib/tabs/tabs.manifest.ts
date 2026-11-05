import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Tabs",
  tier: 1,
  exports: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
  intent: ["switch between views of the same thing"],
  use_when: "Peer views of one subject, selected one at a time.",
  never_when: ["a row of Buttons with an active class", "role=tablist built by hand", "navigation between pages"],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Tabs/Tabs.jsx",
    "services/lso/web/libs/editor/src/components/SidePanels/TabPanels/Tabs.tsx",
    "services/lso/web/libs/editor/src/components/AnnotationTabs/AnnotationTabs.jsx",
  ],
});
