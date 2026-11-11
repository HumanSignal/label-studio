import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "MultiStateToggle",
  tier: 1,
  exports: ["MultiStateToggle"],
  intent: ["pick one of up to five visible options"],
  use_when:
    "A segmented control for a small, always-visible set of mutually exclusive options (view modes, density, a short filter).",
  never_when: ["more than five options (use Select)", "options that need descriptions (use Radio once it exists)"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/ToggleItems/ToggleItems.tsx",
    "services/lse/web/apps/labelstudio/src/components/ToggleItems/ToggleItems.tsx",
  ],
});
