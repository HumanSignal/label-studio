import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "EnterpriseBadge",
  tier: 2,
  exports: ["EnterpriseBadge"],
  intent: [],
  use_when: "Marks a feature as Enterprise-only.",
  never_when: [],
  replaces: [],
});
