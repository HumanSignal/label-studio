import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Message",
  tier: 1,
  exports: ["Message"],
  intent: ["an inline notice", "a page-level notice with a title"],
  use_when: "Info, warning, error or success text placed inline with the content it refers to.",
  never_when: ["custom coloured info boxes", "transient results (use Toast)"],
  props_rules: [
    "variant is a colour (primary, neutral, positive, negative, warning, enterprise); look is filled or ghost",
  ],
  replaces: [
    "services/lse/web/apps/labelstudio/src/components_lse/Warning/Warning.jsx",
    "services/lso/web/libs/editor/src/components/ErrorMessage/ErrorMessage.jsx",
  ],
});
