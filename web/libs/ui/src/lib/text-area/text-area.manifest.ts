import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "TextArea",
  tier: 1,
  category: "Inputs",
  exports: ["TextArea"],
  intent: ["Multi-line text entry"],
  use_when:
    "Several lines of free text: descriptions, instructions, comments. autosize for fields that grow with their content.",
  never_when: [
    "A raw <textarea>, or a local wrapper around one",
    "A single line of text (Input)",
    "Code or JSON (CodeEditor)",
  ],
  props_rules: [
    "invalid together with an error message next to the field",
    "aria-label when there is no visible label",
  ],
  replaces: ["jsx:<textarea>"],
  notes:
    "The form-bound copies (LSE and LSO app Form/Elements/TextArea, Data Manager Common/Form) move with the Forms epic UTC-1672; the editor comment forms' common/TextArea moves in UTC-1691.",
});
