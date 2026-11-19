import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Toggle",
  tier: 1,
  category: "Inputs",
  exports: ["Toggle"],
  intent: ["An on/off setting"],
  use_when:
    "A setting that is either on or off and takes effect as a preference (auto-save, notifications, a feature switch).",
  never_when: [
    "Selecting items (use Checkbox)",
    "Choosing one of several named options (use SegmentedControl or Select)",
  ],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Form/Elements/Toggle/Toggle.jsx",
    "services/lse/web/apps/labelstudio/src/components/Form/Elements/Toggle/Toggle.jsx",
    "services/lso/web/libs/datamanager/src/components/Common/Form/Elements/Toggle/Toggle.jsx",
  ],
});
