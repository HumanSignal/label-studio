import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Tooltip",
  tier: 1,
  exports: ["Tooltip"],
  intent: ["A short explanation on hover or focus"],
  use_when: "Plain-text help attached to a control or a truncated value.",
  never_when: ["Title attributes", "DOM-built tooltips", "Rich or interactive content (use Popover)"],
  replaces: [
    "services/lso/web/libs/editor/src/lib/AudioUltra/Tooltip/Tooltip.ts",
    "services/lse/web/libs/interface-components/src/components/AudioCanvas/audioultra/Tooltip/Tooltip.ts",
    "services/lso/web/libs/editor/src/components/Hint/Hint.tsx",
    "services/lso/web/apps/labelstudio/src/components/CopyableTooltip/CopyableTooltip.jsx",
    "services/lse/web/apps/labelstudio/src/components/CopyableTooltip/CopyableTooltip.jsx",
  ],
});
