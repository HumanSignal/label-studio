export { confirm, info } from "./Modal";
/**
 * Imperative `modal()` and class `Modal` for legacy app-chrome dialogs.
 *
 * @deprecated For non-confirmation surfaces, prefer `ModalWindow` from `@humansignal/ui` with local open state and a feature flag at the call site. Continue using `confirm` and `info` for confirmations until those APIs migrate.
 *
 * When legacy usage is gone, the panel-based API may be re-exported here as `modal` (see migration cleanup).
 */
export { modal, Modal } from "./Modal";
export { ModalBody } from "./ModalBody";
export { ModalCloseButton } from "./ModalCloseButton";
export { ModalFooter } from "./ModalFooter";
export { ModalHeader } from "./ModalHeader";
export { ModalTitle } from "./ModalTitle";
export { useModalControls } from "./ModalPopup";

export type { ModalProps } from "./ModalPopup";
export type {
  ModalUpdate,
  ExtraProps,
  ConfirmProps,
  InfoProps,
  ModalUpdateProps,
} from "./Modal";
