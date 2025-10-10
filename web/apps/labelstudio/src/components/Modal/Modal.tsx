/**
 * Label Studio Modal wrapper
 *
 * This file provides backward compatibility by wrapping @humansignal/ui Modal
 * with LS-specific providers automatically injected.
 */
import type { ReactElement } from "react";
import {
  modal as coreModal,
  confirm as coreConfirm,
  info as coreInfo,
  type ModalProps as CoreModalProps,
  type ConfirmProps as CoreConfirmProps,
  type InfoProps as CoreInfoProps,
  type ModalUpdateProps as CoreModalUpdateProps,
} from "@humansignal/ui";
import { ApiProvider } from "../../providers/ApiProvider";
import { AuthProvider } from "@humansignal/core/providers/AuthProvider";
import { ConfigProvider } from "../../providers/ConfigProvider";
import { ToastProvider } from "@humansignal/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../utils/query-client";

export type { ButtonProps as ButtonVariant } from "@humansignal/ui";

export type ConfirmProps<T> = CoreConfirmProps<T> & ExtraProps;
export type InfoProps<T> = CoreInfoProps<T> & ExtraProps;
export type ModalProps<T = unknown> = CoreModalProps<T>;
// biome-ignore lint/suspicious/noExplicitAny: Generic type parameter for backward compatibility
export type ModalUpdate<Props extends ModalProps<any>> = CoreModalUpdateProps<any>;
export type ModalUpdateProps<T> = CoreModalUpdateProps<T>;

export type ExtraProps = {
  unique?: string;
  simple?: boolean;
  onHidden?: () => void;
  providers?: ReactElement[];
};

/**
 * Get the default LS providers for modals
 */
const getDefaultProviders = (): ReactElement[] => {
  return [
    <ConfigProvider key="config" />,
    <ToastProvider key="toast" />,
    <ApiProvider key="api" />,
    <AuthProvider key="auth" />,
    <QueryClientProvider key="query" client={queryClient} />,
  ];
};

/**
 * Create a modal with LS providers automatically injected.
 * Maintains backward compatibility with existing LS code.
 */
export const modal = <T,>(props: ModalProps<T> & ExtraProps): ModalUpdateProps<T> => {
  const providers = props.simple ? [] : (props.providers ?? getDefaultProviders());

  return coreModal({
    ...props,
    providers,
  }) as ModalUpdateProps<T>;
};

/**
 * Create a confirmation modal with LS providers.
 */
export const confirm = <T,>(props: ConfirmProps<T>): ModalUpdateProps<T> => {
  const providers = props.simple ? [] : (props.providers ?? getDefaultProviders());

  return coreConfirm({
    ...props,
    providers,
  }) as ModalUpdateProps<T>;
};

/**
 * Create an informational modal with LS providers.
 */
export const info = <T,>(props: InfoProps<T>): ModalUpdateProps<T> => {
  const providers = props.simple ? [] : (props.providers ?? getDefaultProviders());

  return coreInfo({
    ...props,
    providers,
  }) as ModalUpdateProps<T>;
};

// Re-export Modal component and hooks
export { Modal, useModalControls } from "@humansignal/ui";

// Re-export for backward compatibility
Object.assign(Modal, {
  info,
  confirm,
  modal,
});

// Export standalone modal as default
export { modal as standaloneModal };
