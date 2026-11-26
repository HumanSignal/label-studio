import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Input",
  tier: 1,
  category: "Inputs",
  sizing: "control",
  exports: ["Input"],
  intent: ["Free text entry"],
  use_when:
    "A single-line text field: names, URLs, emails, numbers typed as text, passwords (revealable), read-only values to copy (copyable).",
  never_when: [
    'A raw <input type="text">, or a local wrapper around one',
    "A label, hint or error message drawn inside the field: those go next to it",
    "Several lines of text (TextArea)",
  ],
  props_rules: [
    "invalid together with an error message next to the field",
    "aria-label when there is no visible label",
  ],
  replaces: ['jsx:<input type="text">'],
  retired: ["services/lso/web/libs/editor/src/common/Input/Input.jsx"],
  notes:
    "The form-bound copies (LSE and LSO app Form/Elements/Input, Data Manager Common/Form and Common/Input) carry form registration; they move with the Forms epic UTC-1672 (stages 3 and 4), not by an import swap.",
});
