import { defineManifest } from "../../ds-manifest";
export default defineManifest({
  name: "PropertyTable",
  tier: 1,
  category: "Data display",
  exports: [
    "PropertyTable",
    "PropertyTableRow",
    "PropertyList",
    "PropertyTableInput",
    "PropertySection",
    "PropertyFieldRow",
    "PropertyActions",
    "PropertyButton",
    "PropertyTextInput",
    "PropertyFooter",
    "PropertyPreview",
  ],
  intent: ["compact inspector properties and editable coordinates"],
  use_when:
    "Compact, non-sortable property/value or coordinate tables in Info panels. Use PropertyList for named values and PropertyTableRow for coordinates with optional selection and details.",
  never_when: ["large datasets with sorting, resizing, or pagination (use DataTable)"],
  replaces: [],
  props_rules: [
    "Provide an accessible table label",
    "Keep draft, validation and commit behavior in the consuming editor",
  ],
});
