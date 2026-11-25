import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Accordion",
  tier: 1,
  category: "Surfaces",
  exports: ["Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent"],
  intent: ["Stacked expandable sections"],
  use_when: "Several stacked sections where one or more can be open.",
  never_when: ["A single panel (use CollapsiblePanel)", "Importing the shad accordion directly"],
  replaces: [],
});
