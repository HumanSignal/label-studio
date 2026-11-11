import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Label",
  tier: 1,
  exports: ["Label"],
  intent: ["a caption for a form control"],
  use_when: "The text, required marker and description attached to a control.",
  never_when: ["a bare <label> or Typography placed next to a control by hand"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Form/Elements/Label/Label.jsx",
    "services/lse/web/apps/labelstudio/src/components/Form/Elements/Label/Label.tsx",
    "services/lso/web/libs/datamanager/src/components/Common/Form/Elements/Label/Label.jsx",
    "services/lso/web/libs/editor/src/common/Label/Label.jsx",
  ],
});
