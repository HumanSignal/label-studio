import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "CodeBlock",
  tier: 1,
  exports: ["CodeBlock"],
  intent: ["Read-only code or configuration"],
  use_when: "Showing a snippet, a config or an ID the user may copy.",
  never_when: ["A <pre> with mono classes", "Editable code (use CodeEditor)"],
  replaces: ["jsx:<pre>"],
});
