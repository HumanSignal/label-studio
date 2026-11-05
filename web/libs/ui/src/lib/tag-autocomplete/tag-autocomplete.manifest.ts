import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "TagAutocomplete",
  tier: 2,
  exports: ["TagAutocomplete"],
  intent: [],
  use_when: "Free-form tag entry with suggestions.",
  never_when: [],
  replaces: [
    "services/lse/web/apps/labelstudio/src/components_lse/OrganizationTagsAutocomplete",
    "services/lse/web/apps/labelstudio/src/components_lse/TagMultiSelect/TagMultiSelect.tsx",
  ],
});
