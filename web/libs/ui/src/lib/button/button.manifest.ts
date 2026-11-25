import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Button",
  tier: 1,
  category: "Inputs",
  sizing: "control",
  exports: ["Button", "ButtonGroup"],
  intent: ["Something clickable that performs an action", "A row of related actions"],
  use_when: "Any element the user clicks to do something: submit, open, navigate, toggle a panel, icon-only controls.",
  never_when: [
    "A raw <button>, <a onClick> or div with role=button",
    "A Badge or chip made clickable",
    "More than one filled primary Button per screen",
  ],
  props_rules: [
    "look=filled only for the single main action; outlined or ghost for the rest; no other look",
    "icon-only buttons pass aria-label",
    "variant negative only for destructive actions, which also confirm",
  ],
  replaces: ["services/lso/web/libs/editor/src/common/Button/Button.tsx", "jsx:<button>"],
});
