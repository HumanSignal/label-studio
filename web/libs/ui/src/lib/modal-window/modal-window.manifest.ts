import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "ModalWindow",
  tier: 1,
  exports: ["ModalWindow", "Dialog"],
  intent: ["a blocking decision or a focused task"],
  use_when: "A dialog the user must act on or dismiss: confirmations, forms, previews.",
  never_when: [
    "modal over modal",
    "an app-local Modal re-export",
    "side editing that keeps the page visible (use Drawer)",
  ],
  props_rules: [
    "destructive confirmations use a negative Button and, for high impact, typed validation",
    "one-line confirmations and notices open with confirm() / info() from @humansignal/ui, never a hand-built Dialog",
    "status text next to the actions goes in footerMeta, left of the buttons",
  ],
  replaces: [
    "services/lso/web/apps/labelstudio/src/components/Modal/Modal.tsx",
    "services/lse/web/apps/labelstudio/src/components/Modal/Modal.tsx",
    "services/lso/web/libs/datamanager/src/components/Common/Modal/Modal.tsx",
    "services/lso/web/libs/editor/src/common/Modal/Modal.tsx",
    "services/lso/web/libs/editor/src/components/Dialog/Dialog.jsx",
  ],
});
