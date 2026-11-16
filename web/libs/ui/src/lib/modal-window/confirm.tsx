import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { ButtonProps } from "../button/button";
import { ToastViewport } from "../toast/toast";
import { ConfirmDialog, InfoDialog } from "./confirm-dialog";
import { ModalWindow, type ModalWindowSize, type ModalWindowPlacement } from "./modal-window";

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
  /** With `allowClose`, also close on a click outside. Turn off when closing by accident loses something. @default true */
  closeOnClickOutside?: boolean;
  /** Reuse the open dialog with this key instead of opening a second one. */
  unique?: string;
  /** Called after the dialog closed and left the page. */
  onHidden?: () => void;
  /** App providers to wrap the dialog with (API, auth, toasts...), outermost first. */
  providers?: ReactElement[];
  /** Classes for the body region; `p-0` removes the default padding. */
  bodyClassName?: string;
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

export type ModalOptions = DialogBaseOptions & {
  footer?: ReactNode;
  /** @default "top" */
  placement?: ModalWindowPlacement;
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
  renderDialog: (options: Options, open: boolean, finish: () => void) => ReactElement,
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

  function render() {
    root.render(
      withProviders(
        <>
          {renderDialog(options, open, () => void close())}
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

const dialogProps = (options: DialogBaseOptions, open: boolean, finish: () => void) => ({
  open,
  onOpenChange: (next: boolean) => {
    if (!next) finish();
  },
  title: options.title,
  footerMeta: options.footerMeta,
  size: options.size ?? "medium",
  allowClose: options.allowClose ?? false,
  closeOnClickOutside: options.closeOnClickOutside ?? true,
  bodyClassName: options.bodyClassName,
  dataTestId: options.dataTestId,
});

/** Opens a confirmation dialog with Cancel and a confirm action. */
export function confirm(options: ConfirmDialogOptions): DialogHandle<ConfirmDialogOptions> {
  return openDialog(options, (current, open, finish) => (
    <ConfirmDialog
      {...dialogProps(current, open, finish)}
      okText={current.okText}
      cancelText={current.cancelText}
      buttonLook={current.buttonLook}
      onOk={() => {
        current.onOk?.();
      }}
      onCancel={current.onCancel}
    >
      {current.body}
    </ConfirmDialog>
  ));
}

/** Opens a notice with a single OK button. */
export function info(options: InfoDialogOptions): DialogHandle<InfoDialogOptions> {
  return openDialog(options, (current, open, finish) => (
    <InfoDialog {...dialogProps(current, open, finish)} okText={current.okText} onOk={current.onOkPress}>
      {current.body}
    </InfoDialog>
  ));
}

/** Opens a ModalWindow imperatively, for surfaces opened from code that holds no React state. */
export function modal(options: ModalOptions): DialogHandle<ModalOptions> {
  return openDialog(options, (current, open, finish) => {
    const allowClose = current.allowClose ?? false;
    return (
      <ModalWindow
        placement={current.placement ?? "top"}
        open={open}
        onOpenChange={(next) => {
          if (!next && allowClose) finish();
        }}
        size={current.size ?? "medium"}
        title={current.title}
        showCloseButton={allowClose}
        closeOnScrimClick={allowClose && (current.closeOnClickOutside ?? true)}
        closeOnFocusOutside={false}
        footer={current.footer}
        footerMeta={current.footerMeta}
        bodyClassName={current.bodyClassName}
        dataTestId={current.dataTestId}
      >
        {current.body}
      </ModalWindow>
    );
  });
}
