import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Button, type ButtonProps } from "../button/button";
import { ToastViewport } from "../toast/toast";
import { Dialog, type ModalWindowSize } from "./modal-window";

/** Close animation of ModalWindow (fade out), so the node is removed after it ends. */
const CLOSE_DELAY_MS = 150;

type DialogBaseOptions = {
  title?: ReactNode;
  body?: ReactNode;
  /** Status text shown left of the buttons, e.g. "12 tasks selected". */
  footerMeta?: ReactNode;
  /** @default "medium" */
  size?: ModalWindowSize;
  /** Close with the X button, Escape and a click outside. The feature opening the dialog decides. @default false */
  allowClose?: boolean;
  /** Reuse the open dialog with this key instead of opening a second one. */
  unique?: string;
  /** Called after the dialog closed and left the page. */
  onHidden?: () => void;
  /** App providers to wrap the dialog with (API, auth, toasts...), outermost first. */
  providers?: ReactElement[];
  dataTestId?: string;
};

export type ConfirmDialogOptions = DialogBaseOptions & {
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
  /** Called on Cancel, and on the X, Escape or a click outside. */
  onCancel?: () => void;
  /** Colour of the confirm button. Destructive actions use `negative`. */
  buttonLook?: ButtonProps["variant"] | "destructive";
};

export type InfoDialogOptions = DialogBaseOptions & {
  okText?: string;
  onOkPress?: () => void;
};

export type DialogHandle<Options> = {
  update: (options: Partial<Options>) => void;
  close: () => Promise<void>;
  readonly visible: boolean;
};

const UNIQUE_DIALOGS = new Map<string, DialogHandle<unknown>>();

function withProviders(content: ReactElement, providers: ReactElement[] = []): ReactElement {
  return providers.reduceRight<ReactElement>(
    (children, provider) => ({ ...provider, props: { ...provider.props, children } }),
    content,
  );
}

function hasToastProvider(providers: ReactElement[] = []): boolean {
  return providers.some(
    (provider) => (provider?.type as { name?: string })?.name === "ToastProvider" || provider?.key === "toast",
  );
}

function openDialog<Options extends DialogBaseOptions>(
  initial: Options,
  renderFooter: (options: Options, close: (cancelled: boolean) => void) => ReactNode,
  onDismiss?: (options: Options) => void,
): DialogHandle<Options> {
  const existing = initial.unique ? UNIQUE_DIALOGS.get(initial.unique) : undefined;
  if (existing) return existing as DialogHandle<Options>;

  const node = document.createElement("div");
  document.body.appendChild(node);
  const root = createRoot(node);
  let options = initial;
  let open = true;
  let closing: Promise<void> | null = null;

  const close = (): Promise<void> => {
    if (closing) return closing;
    open = false;
    render();
    closing = new Promise((resolve) => {
      setTimeout(() => {
        root.unmount();
        node.remove();
        if (options.unique) UNIQUE_DIALOGS.delete(options.unique);
        options.onHidden?.();
        resolve();
      }, CLOSE_DELAY_MS);
    });
    return closing;
  };

  const finish = (cancelled: boolean) => {
    if (cancelled) onDismiss?.(options);
    void close();
  };

  function render() {
    const allowClose = options.allowClose ?? false;
    root.render(
      withProviders(
        <>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              if (!next && allowClose) finish(true);
            }}
            size={options.size ?? "medium"}
            title={options.title}
            showCloseButton={allowClose}
            closeOnScrimClick={allowClose}
            closeOnFocusOutside={false}
            footer={renderFooter(options, finish)}
            footerMeta={options.footerMeta}
            dataTestId={options.dataTestId}
          >
            {options.body}
          </Dialog>
          {hasToastProvider(options.providers) && <ToastViewport />}
        </>,
        options.providers,
      ),
    );
  }

  render();

  const handle: DialogHandle<Options> = {
    update(next) {
      if (!open) return;
      options = { ...options, ...next };
      render();
    },
    close,
    get visible() {
      return open;
    },
  };
  if (initial.unique) UNIQUE_DIALOGS.set(initial.unique, handle as DialogHandle<unknown>);
  return handle;
}

/** Opens a confirmation dialog with Cancel and a confirm action. */
export function confirm(options: ConfirmDialogOptions): DialogHandle<ConfirmDialogOptions> {
  return openDialog(
    options,
    ({ okText, cancelText, onOk, onCancel, buttonLook }, finish) => (
      <div className="flex justify-end gap-tight">
        <Button
          look="outlined"
          variant="neutral"
          autoFocus
          aria-label={cancelText ?? "Cancel"}
          data-testid="dialog-cancel-button"
          onClick={() => {
            onCancel?.();
            finish(false);
          }}
        >
          {cancelText ?? "Cancel"}
        </Button>
        <Button
          variant={buttonLook === "destructive" ? "negative" : (buttonLook ?? "primary")}
          aria-label={okText ?? "OK"}
          data-testid="dialog-ok-button"
          onClick={() => {
            onOk?.();
            finish(false);
          }}
        >
          {okText ?? "OK"}
        </Button>
      </div>
    ),
    (current) => current.onCancel?.(),
  );
}

/** Opens a notice with a single OK button. */
export function info(options: InfoDialogOptions): DialogHandle<InfoDialogOptions> {
  return openDialog(options, ({ okText, onOkPress }, finish) => (
    <div className="flex justify-end gap-tight">
      <Button
        variant="primary"
        aria-label={okText ?? "OK"}
        data-testid="dialog-ok-button"
        onClick={() => {
          onOkPress?.();
          finish(false);
        }}
      >
        {okText ?? "OK"}
      </Button>
    </div>
  ));
}
