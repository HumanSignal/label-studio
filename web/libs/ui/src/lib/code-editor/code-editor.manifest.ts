import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CodeEditor",
  tier: 2,
  exports: ["CodeEditor"],
  intent: [],
  use_when: "Editable code with syntax highlighting (labeling config, scripts).",
  never_when: [],
  replaces: [],
});
