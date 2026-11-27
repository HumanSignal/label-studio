import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CollapsiblePanel",
  tier: 1,
  category: "Surfaces",
  exports: ["CollapsiblePanel"],
  intent: ["An expandable panel-style section"],
  use_when: "A single section the user expands or collapses, panel style.",
  never_when: ["A details element styled by hand", "Stacked sections (use Accordion)"],
  replaces: [],
});
