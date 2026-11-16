import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Popover",
  tier: 1,
  exports: ["Popover"],
  intent: ["Rich content anchored to a trigger"],
  use_when:
    "Interactive or formatted content that opens next to its trigger and closes on outside click or Escape. Pass trigger for the simple case; compose Popover.Root, Popover.Trigger and Popover.Content when the trigger sits inside other elements (a Tooltip, a badge).",
  never_when: [
    "Plain text (use Tooltip)",
    "A list of actions (use Dropdown)",
    "A hand-rolled absolutely positioned panel",
    "The raw shadcn popover imported by path (use Popover.Root, Popover.Trigger and Popover.Content)",
  ],
  replaces: [],
});
