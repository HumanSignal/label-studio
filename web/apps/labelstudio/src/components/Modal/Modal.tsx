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
  type ModalProps,
  type ModalUpdateProps,
  type ExtraProps,
} from "@humansignal/ui/lib/modal";
import { ApiProvider } from "../../providers/ApiProvider";
import { AuthProvider } from "@humansignal/core/providers/AuthProvider";
import { ConfigProvider } from "../../providers/ConfigProvider";
import { ToastProvider } from "@humansignal/ui/lib/toast/toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../utils/query-client";

export type { ButtonProps as ButtonVariant } from "@humansignal/ui/lib/button/button";

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

const modalTypes = {
  modal: coreModal,
  confirm: coreConfirm,
  info: coreInfo,
} as const;

const createModal = (type: keyof typeof modalTypes) => {
  return <T,>(props: ModalProps<T> & ExtraProps): ModalUpdateProps<T> => {
    return modalTypes[type]({
      simple: false,
      providers: getDefaultProviders(),
      ...props,
    });
  };
};

// Re-export Modal component and hooks
export const modal = createModal("modal");
export const confirm = createModal("confirm");
export const info = createModal("info");
export { modal as standaloneModal };
export { Modal, useModalControls } from "@humansignal/ui/lib/modal";
