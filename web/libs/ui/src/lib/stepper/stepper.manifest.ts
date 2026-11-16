import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Stepper",
  tier: 1,
  exports: ["Stepper"],
  intent: ["Progress through a multi-step flow"],
  use_when: "Wizards and setup flows with ordered steps.",
  never_when: ["Numbered Badges in a row", "Tabs used as steps"],
  props_rules: ["orientation sets the direction (horizontal, vertical); size is medium or small"],
  replaces: [],
});
