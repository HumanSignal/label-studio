/**
 * Datamanager Modal wrapper
 *
 * Re-exports Modal from @humansignal/ui for backward compatibility.
 * Datamanager modals don't use providers by default (simple: true).
 */
import {
  modal as coreModal,
  confirm as coreConfirm,
  info as coreInfo,
  type ModalProps as CoreModalProps,
  type ConfirmProps as CoreConfirmProps,
  type InfoProps as CoreInfoProps,
  type ModalUpdateProps as CoreModalUpdateProps,
} from "@humansignal/ui";

export type { ButtonProps as ButtonVariant } from "@humansignal/ui";

export type ConfirmProps<T> = CoreConfirmProps<T>;
export type InfoProps<T> = CoreInfoProps<T>;
export type ModalProps<T = unknown> = CoreModalProps<T>;
// biome-ignore lint/suspicious/noExplicitAny: Generic type parameter for backward compatibility
export type ModalUpdate<Props extends ModalProps<any>> = CoreModalUpdateProps<any>;
export type ModalUpdateProps<T> = CoreModalUpdateProps<T>;

/**
 * Create a simple modal (no providers by default).
 * Datamanager modals are typically simple and don't need provider injection.
 */
export const modal = <T,>(props: ModalProps<T>): ModalUpdateProps<T> => {
  return coreModal({
    ...props,
    simple: props.simple ?? true, // Default to simple for Datamanager
  }) as ModalUpdateProps<T>;
};

/**
 * Create a confirmation modal.
 */
export const confirm = <T,>(props: ConfirmProps<T>): ModalUpdateProps<T> => {
  return coreConfirm({
    ...props,
    simple: true,
  }) as ModalUpdateProps<T>;
};

/**
 * Create an informational modal.
 */
export const info = <T,>(props: InfoProps<T>): ModalUpdateProps<T> => {
  return coreInfo({
    ...props,
    simple: true,
  }) as ModalUpdateProps<T>;
};

// Re-export Modal component and hooks
export { Modal, useModalControls } from "@humansignal/ui";

// Export standalone modal as alias
export { modal as standaloneModal };
