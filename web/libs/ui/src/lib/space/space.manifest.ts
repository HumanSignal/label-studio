import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Space",
  tier: 1,
  exports: ["Space"],
  intent: ["evenly spaced siblings"],
  use_when: "A horizontal or vertical row of controls with design-system gaps.",
  never_when: ["margins on each child by hand"],
  replaces: [],
});
