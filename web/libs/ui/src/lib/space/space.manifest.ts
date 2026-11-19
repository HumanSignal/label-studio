import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Space",
  tier: 1,
  exports: ["Space"],
  intent: ["Evenly spaced siblings"],
  use_when: "A horizontal or vertical row of controls with design-system gaps.",
  never_when: ["Margins on each child by hand"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Space/Space.jsx",
    "services/lse/web/apps/labelstudio/src/components/Space/Space.tsx",
    "services/lso/web/libs/datamanager/src/components/Common/Space/Space.jsx",
    "services/lso/web/libs/editor/src/common/Space/Space.tsx",
  ],
});
