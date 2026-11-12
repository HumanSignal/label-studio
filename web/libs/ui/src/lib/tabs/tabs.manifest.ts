import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Tabs",
  tier: 1,
  exports: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
  intent: ["move between sub-sections of one section"],
  use_when: "Navigating between sub-sections of a parent section whose content differs but sits at the same level.",
  never_when: [
    "switching the view, format or filter of the same content (use SegmentedControl)",
    "a row of Buttons with an active class",
    "role=tablist built by hand",
    "navigation between pages",
  ],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Tabs/Tabs.jsx",
    "services/lso/web/libs/editor/src/components/SidePanels/TabPanels/Tabs.tsx",
    "services/lso/web/libs/editor/src/components/AnnotationTabs/AnnotationTabs.jsx",
  ],
});
