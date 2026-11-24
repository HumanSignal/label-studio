import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "RadioGroup",
  tier: 1,
  category: "Inputs",
  sizing: "fixed",
  exports: ["RadioGroup", "Radio"],
  intent: ["Pick one of several described options"],
  use_when:
    "Mutually exclusive options that each need a label and often a description; the card variant for a few options with more weight.",
  never_when: [
    'A raw <input type="radio">',
    "A row of short options that switch a view (use SegmentedControl)",
    "More than about six options (use Select)",
  ],
  props_rules: ["label names the group; every Radio has a label", "variant card only for two to four options"],
  replaces: ['jsx:<input type="radio">'],
  retired: ["services/lso/web/libs/editor/src/common/RadioGroup/RadioGroup.jsx"],
  notes:
    "The app Form RadioGroup copies carry form registration and move with the Forms epic UTC-1672; their button mode and the Data Manager Common/RadioGroup (density and view toggles) move to SegmentedControl.",
});
