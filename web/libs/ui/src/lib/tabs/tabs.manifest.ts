import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Tabs",
  tier: 1,
  exports: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
  intent: ["Move between sub-sections of one section"],
  use_when: "Navigating between sub-sections of a parent section whose content differs but sits at the same level.",
  never_when: [
    "Switching the view, format or filter of the same content (use SegmentedControl)",
    "A row of Buttons with an active class",
    "Role=tablist built by hand",
    "Navigation between pages",
  ],
  replaces: [
    "services/lso/web/libs/datamanager/src/components/Common/Tabs/Tabs.jsx",
    "services/lso/web/libs/editor/src/components/SidePanels/TabPanels/Tabs.tsx",
    "services/lso/web/libs/editor/src/components/AnnotationTabs/AnnotationTabs.jsx",
  ],
});
