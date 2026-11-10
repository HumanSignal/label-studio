import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Popover",
  tier: 1,
  exports: ["Popover"],
  intent: ["rich content anchored to a trigger"],
  use_when: "Interactive or formatted content that opens next to its trigger and closes on outside click or Escape.",
  never_when: [
    "plain text (use Tooltip)",
    "a list of actions (use Dropdown)",
    "a hand-rolled absolutely positioned panel",
  ],
  replaces: [],
});
