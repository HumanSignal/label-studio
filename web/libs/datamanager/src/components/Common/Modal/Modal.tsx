/**
 * Datamanager Modal wrapper
 *
 * Re-exports Modal from @humansignal/ui for backward compatibility.
 * Datamanager modals don't use providers by default (simple: true).
 */
import { Modal, modal, info, confirm, useModalControls } from "@humansignal/ui/lib/modal";

Object.assign(Modal, {
  info,
  confirm,
  modal,
});

export { modal as standaloneModal, modal, info, confirm, useModalControls, Modal };

export type { ButtonProps as ButtonVariant } from "@humansignal/ui/lib/button/button";
