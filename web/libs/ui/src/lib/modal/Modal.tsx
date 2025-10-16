import { createRef, type ReactElement } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";
import { Button, type ButtonProps } from "../button/button";
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
  let renderCount = 0;

  rootDiv.className = cn("modal-holder").toClassName();

  document.body.appendChild(rootDiv);

  const renderModal = (props: ModalProps<T> & ExtraProps, animate?: boolean) => {
    renderCount++;

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
          animateAppearance={animate}
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

/**
 * Creates a confirmation modal with OK and Cancel buttons.
 */
export const confirm = <T,>({ okText, onOk, cancelText, onCancel, buttonLook, ...props }: ConfirmProps<T>) => {
  const modal = standaloneModal({
    ...props,
    allowClose: false,
    footer: (
      <div className="flex gap-2 justify-end">
        <Button
          onClick={() => {
            onCancel?.();
            modal.close();
          }}
          look="outlined"
          variant="neutral"
          autoFocus
          aria-label={cancelText ?? "Cancel"}
          data-testid="dialog-cancel-button"
        >
          {cancelText ?? "Cancel"}
        </Button>

        <Button
          onClick={() => {
            onOk?.();
            modal.close();
          }}
          variant={buttonLook ?? "primary"}
          aria-label={okText ?? "Confirm"}
          data-testid="dialog-ok-button"
        >
          {okText ?? "OK"}
        </Button>
      </div>
    ),
  });

  return modal;
};

/**
 * Creates an informational modal with a single OK button.
 */
export const info = <T,>({ okText, onOkPress, ...props }: InfoProps<T>) => {
  const modal = standaloneModal({
    ...props,
    footer: (
      <div className="flex gap-2 justify-end">
        <Button
          onClick={() => {
            onOkPress?.();
            modal.close();
          }}
          aria-label={okText ?? "OK"}
          data-testid="dialog-ok-button"
        >
          {okText ?? "OK"}
        </Button>
      </div>
    ),
  });

  return modal;
};

export { standaloneModal as modal };
export { Modal };
