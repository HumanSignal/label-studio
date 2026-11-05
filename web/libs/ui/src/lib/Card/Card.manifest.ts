import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Card",
  tier: 1,
  exports: ["Card"],
  intent: [],
  use_when: "",
  never_when: [],
  replaces: [],
  deprecated: {
    replaced_by: "SimpleCard",
    reason: "Legacy card kept for its remaining importers until the card implementations collapse into one.",
  },
});
