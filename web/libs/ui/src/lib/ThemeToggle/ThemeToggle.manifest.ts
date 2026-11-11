import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "ThemeToggle",
  tier: 2,
  exports: ["ThemeToggle"],
  intent: [],
  use_when: "The light, dark and auto theme switch.",
  never_when: [],
  replaces: [],
});
