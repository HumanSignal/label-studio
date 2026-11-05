import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Typography",
  tier: 1,
  exports: ["Typography"],
  intent: ["any product copy"],
  use_when: "Every piece of user-visible text: headings, body, labels, metadata, truncation.",
  never_when: ["bare <p>, <span> or <h*> with text utilities", "inline colour or font styles"],
  props_rules: ["disabled text uses text-neutral-content-subtlest"],
  replaces: ["jsx:<p>", "jsx:<span>"],
});
