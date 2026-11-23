import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Field",
  tier: 1,
  category: "Inputs",
  exports: ["Field"],
  intent: ["A label, help text and error message around a control"],
  use_when:
    "Around a control that has no label or error props of its own: a code editor, a tree select, a row of inputs. Input, TextArea, NumberInput, RadioGroup and CheckboxGroup take label, description, hint and error directly.",
  never_when: [
    "A label and an error drawn next to a control by hand",
    "An Optional marker: fields are optional by default; mark only required ones",
  ],
  props_rules: [
    "required shows the Required badge; nothing marks optional fields",
    "layout horizontal puts the control at the right and the error full width under the label",
  ],
  replaces: [],
});
