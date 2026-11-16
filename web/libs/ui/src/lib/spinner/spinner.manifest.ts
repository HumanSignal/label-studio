import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Spinner",
  tier: 1,
  exports: ["Spinner", "SPINNER_SIZES"],
  intent: ["An action in progress"],
  use_when: "Something the user triggered is still running and has no layout to reserve.",
  never_when: ["Loading a layout that will be filled (use Skeleton)", "An app-local spinner or CSS animation"],
  props_rules: ["size is a name (smallest, smaller, small, medium, large, larger, largest), never a px number"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Spinner/Spinner.jsx",
    "services/lse/web/apps/labelstudio/src/components/Spinner/Spinner.tsx",
    "services/lse/web/apps/labelstudio/src/components/SpinnerCircle/SpinnerCircle.jsx",
    "services/lso/web/libs/datamanager/src/components/Common/Spinner.jsx",
    "services/lse/web/apps/labelstudio/src/pages/Interfaces/preview/PreviewSpinner.tsx",
  ],
});
