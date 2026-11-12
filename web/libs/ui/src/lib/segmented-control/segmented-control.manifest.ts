import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "SegmentedControl",
  tier: 1,
  exports: ["SegmentedControl", "MultiStateToggle"],
  intent: ["switch the view or format of the same content", "pick one of up to five visible options"],
  use_when:
    "Switching views, filtering the same data or showing the same content in another format (list or grid, form or JSON, a short filter). MultiStateToggle is its deprecated old name.",
  never_when: [
    "moving between sub-sections whose content differs (use Tabs)",
    "more than five options (use Select)",
    "options that need descriptions (use Radio once it exists)",
  ],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/ToggleItems/ToggleItems.tsx",
    "services/lse/web/apps/labelstudio/src/components/ToggleItems/ToggleItems.tsx",
  ],
});
