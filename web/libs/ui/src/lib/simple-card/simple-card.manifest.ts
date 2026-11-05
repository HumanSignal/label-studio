import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "SimpleCard",
  tier: 1,
  exports: ["SimpleCard"],
  intent: ["a titled surface grouping related content"],
  use_when: "A bordered surface with an optional title and description around a group of controls or data.",
  never_when: ["an app-local Card", "a div with border and shadow classes", "nested cards"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Card/Card.jsx",
    "services/lse/web/apps/labelstudio/src/components/Card/Card.jsx",
    "services/lse/web/apps/labelstudio/src/pages/ProjectDashboard/Card.jsx",
  ],
  notes:
    "The product Card until the library's four card implementations collapse into one; lib/Card, card-new and the shad card are internal.",
});
