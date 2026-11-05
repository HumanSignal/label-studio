import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "Spinner",
  tier: 1,
  exports: ["Spinner"],
  intent: ["an action in progress"],
  use_when: "Something the user triggered is still running and has no layout to reserve.",
  never_when: ["loading a layout that will be filled (use Skeleton)", "an app-local spinner or CSS animation"],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Spinner/Spinner.jsx",
    "services/lse/web/apps/labelstudio/src/components/Spinner/Spinner.tsx",
    "services/lse/web/apps/labelstudio/src/components/SpinnerCircle/SpinnerCircle.jsx",
    "services/lso/web/libs/datamanager/src/components/Common/Spinner.jsx",
    "services/lse/web/apps/labelstudio/src/pages/Interfaces/preview/PreviewSpinner.tsx",
  ],
});
