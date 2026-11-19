import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "SummaryLabel",
  tier: 1,
  category: "Data display",
  exports: ["SummaryLabel"],
  intent: ["Several values in one line, then +N"],
  use_when:
    "A cell, trigger or summary lists values that may not fit: tags, skills, projects, selected options. Text by default, badges with `badges`.",
  never_when: [
    "A hand-written +N or a local overflow hook",
    "A row of avatars (use AvatarStack)",
    "The count as a Badge: +N is always text",
  ],
  props_rules: [
    "counts go through formatCount: +1.2k from a thousand up",
    "where values can be selected, countLabel says so: +3 selected",
    "what clicking +N does belongs to the parent, never to SummaryLabel",
  ],
  replaces: [],
});
