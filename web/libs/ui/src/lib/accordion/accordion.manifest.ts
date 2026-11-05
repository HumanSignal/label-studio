import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Accordion",
  tier: 1,
  exports: ["Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent"],
  intent: ["stacked expandable sections"],
  use_when: "Several stacked sections where one or more can be open.",
  never_when: ["a single panel (use CollapsiblePanel)", "importing the shad accordion directly"],
  replaces: [],
});
