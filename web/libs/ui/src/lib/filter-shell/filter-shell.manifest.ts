import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "FilterShell",
  tier: 2,
  exports: ["FilterShell"],
  intent: [],
  use_when: "The chip-and-popover shell that filter rows share.",
  never_when: [],
  replaces: [],
});
