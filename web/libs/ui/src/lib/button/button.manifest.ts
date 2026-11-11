import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Button",
  tier: 1,
  exports: ["Button", "ButtonGroup"],
  intent: ["something clickable that performs an action", "a row of related actions"],
  use_when: "Any element the user clicks to do something: submit, open, navigate, toggle a panel, icon-only controls.",
  never_when: [
    "a raw <button>, <a onClick> or div with role=button",
    "a Badge or chip made clickable",
    "more than one filled primary Button per screen",
  ],
  props_rules: [
    "look=filled only for the single main action; outlined or string for the rest",
    "icon-only buttons pass aria-label",
    "variant negative only for destructive actions, which also confirm",
  ],
  replaces: ["services/lso/web/libs/editor/src/common/Button/Button.tsx", "jsx:<button>"],
});
