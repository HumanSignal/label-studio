import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "ModalWindow",
  tier: 1,
  category: "Feedback",
  exports: ["ModalWindow", "ModalWindowCloseButton", "Dialog", "ConfirmDialog", "InfoDialog"],
  intent: ["A blocking decision or a focused task"],
  use_when: "A dialog the user must act on or dismiss: confirmations, forms, previews.",
  never_when: [
    "Modal over modal",
    "An app-local Modal re-export",
    "A hand-built overlay (a fixed full-viewport backdrop and a panel) instead of ModalWindow",
    "Side editing that keeps the page visible (use Drawer)",
  ],
  props_rules: [
    "placement=center (or Dialog) for short confirmations; top, the default, when the body height changes",
    "destructive confirmations use a negative Button and, for high impact, typed validation",
    "one-line confirmations and notices use ConfirmDialog / InfoDialog, rendered by the owning component, never a hand-built Dialog",
    "render every dialog as JSX in the component that owns it; never open one from a function in a React root of its own",
    "status text next to the actions goes in footerMeta, left of the buttons",
    "a custom header that needs a close button uses ModalWindowCloseButton with showCloseButton={false}; never import @radix-ui/react-dialog in a screen",
    "a modal that opens another is hidden while the second is open and returns with its state; never close and reopen it by hand",
  ],
  replaces: [],
  retired: [
    "services/lso/web/apps/labelstudio/src/components/Modal/Modal.tsx",
    "services/lse/web/apps/labelstudio/src/components/Modal/Modal.tsx",
    "services/lso/web/libs/datamanager/src/components/Common/Modal/Modal.tsx",
    "services/lso/web/libs/editor/src/common/Modal/Modal.tsx",
  ],
});
