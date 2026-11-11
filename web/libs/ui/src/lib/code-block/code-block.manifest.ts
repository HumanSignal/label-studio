import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CodeBlock",
  tier: 1,
  exports: ["CodeBlock"],
  intent: ["read-only code or configuration"],
  use_when: "Showing a snippet, a config or an ID the user may copy.",
  never_when: ["a <pre> with mono classes", "editable code (use CodeEditor)"],
  replaces: ["jsx:<pre>"],
});
