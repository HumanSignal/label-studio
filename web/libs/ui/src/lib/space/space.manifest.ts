import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Space",
  tier: 1,
  exports: ["Space"],
  intent: ["Evenly spaced siblings"],
  use_when: "A horizontal or vertical row of controls with design-system gaps.",
  never_when: ["Margins on each child by hand"],
  replaces: [],
});
