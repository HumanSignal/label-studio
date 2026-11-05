import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CollapsiblePanel",
  tier: 1,
  exports: ["CollapsiblePanel"],
  intent: ["an expandable panel-style section"],
  use_when: "A single section the user expands or collapses, panel style.",
  never_when: ["a details element styled by hand", "stacked sections (use Accordion)"],
  replaces: [],
});
