import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "BadgeGroup",
  tier: 2,
  exports: ["BadgeGroup"],
  intent: [],
  use_when: "Several badges in one cell with overflow handling.",
  never_when: [],
  replaces: [],
});
