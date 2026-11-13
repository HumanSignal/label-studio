import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Badge",
  tier: 1,
  exports: ["Badge"],
  intent: ["an attribute, type or count on an item", "a lifecycle state not covered by the state registry"],
  use_when: "A short label that states an attribute (Required, Inherited, a count) or a status of an item.",
  never_when: [
    "booleans or attributes most rows share (use Typography)",
    "anything clickable (use Button look=ghost or Toggle)",
    "an icon, dot, check or cross inside",
    "a local span with rounded-full classes",
  ],
  props_rules: [
    "look is always the filled default; outlined only on selection controls, where it means not selected",
    "shape=rounded for lifecycle states, square for attributes",
    "state colours follow the registry table: neutral initial, primary in process, warning needs attention, plum in review, positive done, negative failed",
    "size via the size prop only, never className overrides",
  ],
  replaces: [
    "services/lse/web/apps/labelstudio/src/components/Tag/Tag.jsx",
    "services/lso/web/libs/datamanager/src/components/Common/Tag/Tag.jsx",
    "services/lso/web/libs/editor/src/components/SimpleBadge/SimpleBadge.jsx",
    "services/lso/web/libs/editor/src/components/TaskSummary/Chip.tsx",
    "services/lse/web/apps/labelstudio/src/components/Form/Elements/ChipInput/ChipInput.tsx",
    "services/lse/web/apps/labelstudio/src/pages/Settings/PaymentsSettings/CopyToOtherProjects.tsx",
    "services/lse/web/apps/labelstudio/src/pages/Organization/OrganizationSettings/sections/SupportReportsTable.tsx",
  ],
});
