import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Indicator",
  tier: 1,
  exports: ["Indicator", "IndicatorMark"],
  intent: ["a status dot or count on the corner of something"],
  use_when:
    "A dot, icon or count pinned to the corner of an avatar, an icon or a button: unread items, presence, a review result. On an avatar, use Avatar's indicator and badge props, which draw it.",
  never_when: [
    "a hand-built absolute span with a count or a dot on a button or icon",
    "a label next to text (use Badge)",
    "the only way a state is shown: the label is read by screen readers, so give it one",
  ],
  props_rules: [
    "label is required: a dot or a number alone says nothing",
    "counts go through formatCount: 1.2k from a thousand up",
    "overlap=circular on round hosts",
    "position is one of the four corners; no free offsets",
  ],
  replaces: [],
});
