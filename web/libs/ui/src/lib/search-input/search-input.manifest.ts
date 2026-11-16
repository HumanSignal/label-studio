import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "SearchInput",
  tier: 1,
  exports: ["SearchInput"],
  intent: ["Filter a list by typing"],
  use_when: "A search box that narrows a list or table as the user types.",
  never_when: ["General text entry (Input gap)", "A raw <input> with a magnifier icon"],
  replaces: [],
});
