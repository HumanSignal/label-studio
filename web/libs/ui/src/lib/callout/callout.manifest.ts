import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Callout",
  tier: 1,
  exports: ["Callout", "CalloutIcon", "CalloutHeader", "CalloutTitle", "CalloutContent"],
  intent: [],
  use_when: "",
  never_when: [],
  replaces: [],
  deprecated: {
    replaced_by: "Message",
    reason: "Message covers inline and page-level notices; Callout had no importers left.",
  },
});
