import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Card",
  tier: 1,
  exports: ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent"],
  intent: ["a titled surface grouping related content"],
  use_when:
    "A bordered surface with an optional title and description around a group of controls or data. Pass title and description for the simple case, or compose CardHeader, CardTitle, CardDescription and CardContent.",
  never_when: ["an app-local Card", "a div with border and shadow classes", "nested cards", "a footer part"],
  props_rules: [
    "size=regular (the default) for page sections; size=compact for dense panels and dashboard tiles",
    "takes the full width of its container; the container decides how many cards sit side by side",
    "flat: no shadow; footer-like content goes at the end of the content",
  ],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Card/Card.jsx",
    "services/lse/web/apps/labelstudio/src/components/Card/Card.jsx",
    "services/lse/web/apps/labelstudio/src/pages/ProjectDashboard/Card.jsx",
  ],
  notes:
    "SimpleCard is now Card size=compact; card-new and the shadcn card are gone. Saved Screens still render SimpleCard.",
});
