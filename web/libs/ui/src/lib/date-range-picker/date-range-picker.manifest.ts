import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "DateRangePicker",
  tier: 2,
  exports: ["DateRangePicker", "DateRangePickerTrigger"],
  intent: ["pick a date or date-time range"],
  use_when:
    "Filtering or scoping by a period: a calendar with preset ranges and optional times, opened from DateRangePickerTrigger.",
  never_when: ["a single date with no range", "raw <input type=date> pairs"],
  replaces: [],
});
