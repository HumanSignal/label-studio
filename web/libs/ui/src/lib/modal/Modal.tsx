import { createElement, createRef, type FC, type ReactElement } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import type { ButtonProps } from "../button/button";
import { confirm as confirmDialog, info as infoDialog } from "../modal-window/confirm";
import { Modal, type ModalProps } from "./ModalPopup";
import { ToastViewport } from "../toast/toast";

export type ExtraProps = {
  unique?: string;
  simple?: boolean;
  onHidden?: () => void;
  /**
   * Optional providers to wrap the modal with.
   * Allows applications to inject their own providers (ApiProvider, AuthProvider, etc.)
   */
  providers?: ReactElement[];
};

export type ConfirmProps<T = unknown> = ModalProps<T> & {
  okText?: string;
  onOk?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  buttonLook?: ButtonProps["variant"];
} & ExtraProps;

export type InfoProps<T> = ModalProps<T> & {
  okText?: string;
  onOkPress?: () => void;
} & ExtraProps;

export type ModalUpdate<T, Props extends ModalProps<T> & ExtraProps> = {
  update: (newProps: Partial<Props>) => void;
  close: () => Promise<void> | undefined;
  visible: boolean;
};

/**
 * Creates a standalone modal with optional provider wrapping.
 *
 * @example
 * // Simple modal without providers
 * const modal = standaloneModal({ title: 'Hello', body: 'World', simple: true });
 *
 * @example
 * // Modal with app providers
 * const modal = standaloneModal({
 *   title: 'Hello',
 *   body: 'World',
 *   providers: [
 *     <ApiProvider key="api" />,
 *     <AuthProvider key="auth" />
 *   ]
 * });
 */

export type ModalUpdateProps<T> = ModalUpdate<T, ModalProps<T> & ExtraProps>;
const UNIQUE_MODALS = new Map<string, ModalUpdate<unknown, ModalProps<unknown> & ExtraProps>>();

const standaloneModal = <T,>({ simple = true, ...props }: ModalProps<T> & ExtraProps): ModalUpdateProps<T> => {
  if (props.unique && UNIQUE_MODALS.has(props.unique)) {
    return UNIQUE_MODALS.get(props.unique) as ModalUpdate<T, ModalProps<T> & ExtraProps>;
  }
  const modalRef = createRef<Modal>();
  const rootDiv = document.createElement("div");
  let _renderCount = 0;

  rootDiv.className = cn("modal-holder").toClassName();

  document.body.appendChild(rootDiv);

  const renderModal = (props: ModalProps<T> & ExtraProps, animate?: boolean) => {
    _renderCount++;

    // Get providers from props or use empty array for simple modals
    const providers = simple ? [] : (props.providers ?? []);

    // Check if ToastProvider is in the providers list
    const hasToastProvider = providers.some(
      (provider) => provider?.type?.name === "ToastProvider" || provider?.key === "toast",
    );

    // If providers are provided, wrap the modal with a MultiProvider-like structure
    const wrapWithProviders = (content: ReactElement) => {
      if (providers.length === 0) {
        return content;
      }

      // Nest providers from right to left (innermost to outermost)
      return providers.reduceRight((acc, provider) => {
        // Clone the provider and add the accumulated content as children
        return { ...provider, props: { ...provider.props, children: acc } };
      }, content);
    };

    const wrappedContent = wrapWithProviders(
      <>
        <Modal
          ref={modalRef}
          {...props}
          onHide={() => {
            props.onHidden?.();
            unmountComponentAtNode(rootDiv);
            rootDiv.remove();
            if (props.unique) UNIQUE_MODALS.delete(props.unique);
          }}
          animateAppearance={props.animateAppearance ?? animate}
        />
        {hasToastProvider && <ToastViewport />}
      </>,
    );

    render(wrappedContent, rootDiv);
  };

  renderModal(props, true);

  const modalControls: ModalUpdate<T, ModalProps<T>> = {
    update(newProps: ModalProps<T>) {
      renderModal({ ...props, ...(newProps ?? {}), visible: true }, false);
    },
    close() {
      return modalRef.current?.hide();
    },
    get visible() {
      return modalRef.current?.visible ?? false;
    },
  };

  if (props.unique) {
    UNIQUE_MODALS.set(props.unique, modalControls as unknown as ModalUpdate<unknown, ModalProps<unknown> & ExtraProps>);
  }

  return modalControls;
};

/** Legacy dialogs were 600 px wide by default; the narrow ones they were given become `small`. */
function legacyDialogSize(width: unknown): "small" | "medium" {
  const px = typeof width === "number" ? width : Number.parseFloat(String(width ?? ""));
  return Number.isFinite(px) && px <= 520 ? "small" : "medium";
}

/**
 * Maps legacy modal props onto the public dialog options. Legacy confirmations could not be dismissed and legacy
 * notices could; a call that passes `allowClose` keeps its choice.
 */
function toDialogOptions<T>(props: ModalProps<T> & ExtraProps, dismissibleByDefault: boolean) {
  const {
    title,
    body,
    children,
    bodyProps,
    width,
    style,
    allowClose,
    unique,
    onHidden,
    simple = true,
    providers,
  } = props;
  return {
    title,
    body: typeof body === "function" ? createElement(body as FC<unknown>, bodyProps as never) : (body ?? children),
    dataTestId: props["data-testid"],
    size: legacyDialogSize(width ?? style?.width),
    allowClose: allowClose ?? dismissibleByDefault,
    unique,
    onHidden,
    providers: simple ? [] : providers,
  };
}

/**
 * Creates a confirmation modal with OK and Cancel buttons.
 * @deprecated Use `confirm` from `@humansignal/ui`; this one forwards to it.
 */
export const confirm = <T,>({ okText, onOk, cancelText, onCancel, buttonLook, ...props }: ConfirmProps<T>) => {
  const dialog = confirmDialog({ ...toDialogOptions(props, false), okText, onOk, cancelText, onCancel, buttonLook });
  return {
    update: (next: Partial<ConfirmProps<T>>) => dialog.update(toDialogOptions({ ...props, ...next }, false)),
    close: () => dialog.close(),
    get visible() {
      return dialog.visible;
    },
  } satisfies ModalUpdate<T, ConfirmProps<T>>;
};

/**
 * Creates an informational modal with a single OK button.
 * @deprecated Use `info` from `@humansignal/ui`; this one forwards to it.
 */
export const info = <T,>({ okText, onOkPress, ...props }: InfoProps<T>) => {
  const dialog = infoDialog({ ...toDialogOptions(props, true), okText, onOkPress });
  return {
    update: (next: Partial<InfoProps<T>>) => dialog.update(toDialogOptions({ ...props, ...next }, true)),
    close: () => dialog.close(),
    get visible() {
      return dialog.visible;
    },
  } satisfies ModalUpdate<T, InfoProps<T>>;
};

/**
 * @deprecated Prefer `ModalWindow` from `@humansignal/ui` for app chrome; use `ff.isActive` at the call site.
 */
export { standaloneModal as modal };
export { Modal };
