import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CheckboxGroup",
  tier: 1,
  category: "Inputs",
  exports: ["CheckboxGroup"],
  intent: ["Choose several values from a short list"],
  use_when: "A labelled set of checkboxes whose checked values form one list, such as the events a webhook sends.",
  never_when: [
    "Checkboxes kept in step by hand with a list in state",
    "A long or searchable list (use Select with multiple)",
  ],
  replaces: [],
});
