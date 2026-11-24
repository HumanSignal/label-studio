import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "NumberInput",
  tier: 1,
  category: "Inputs",
  sizing: "control",
  exports: ["NumberInput"],
  intent: ["Enter a number"],
  use_when:
    "A count, percentage, amount or duration. The value is a number or null, clamped to min and max when the field is left.",
  never_when: [
    'An Input or raw <input type="number"> with a unit positioned by hand',
    "A number the user picks from a short fixed list (use Select or SegmentedControl)",
  ],
  props_rules: [
    "stepper side by default; compact only where space is tight",
    "unit for %, minutes and the like, never text placed over the field",
  ],
  replaces: ['jsx:<input type="number">'],
  notes:
    "The app Form Counter elements (LSE and LSO app, Data Manager) carry form registration; they move with the Forms epic UTC-1672.",
});
