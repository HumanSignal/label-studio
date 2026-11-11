import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CollectionUploader",
  tier: 2,
  exports: ["CollectionUploader", "CollectionHeader", "MediaCard", "SubmissionRuleBadges", "SubmissionStatusChip"],
  intent: [],
  use_when: "The data-collection submission flow: upload, rules, status.",
  never_when: [],
  replaces: [],
});
