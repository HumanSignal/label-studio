import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "EnterpriseUpgradeOverlay",
  tier: 2,
  exports: ["EnterpriseUpgradeOverlay"],
  intent: [],
  use_when: "Blurs an Enterprise-only area with an upgrade call to action.",
  never_when: [],
  replaces: [],
});
