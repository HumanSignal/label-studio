import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "../button/button";
import { ModalWindow, type ModalWindowSize } from "./modal-window";

type DialogBaseProps = {
  open: boolean;
  /** Called with `false` whenever the dialog closes: a button, or the X, Escape or a click outside. */
  onOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  children?: ReactNode;
  /** Status text shown left of the buttons, e.g. "12 tasks selected". */
  footerMeta?: ReactNode;
  /** @default "medium" */
  size?: ModalWindowSize;
  /** Close with the X button, Escape and a click outside. @default false */
  allowClose?: boolean;
  /** With `allowClose`, also close on a click outside. @default true */
  closeOnClickOutside?: boolean;
  /** Classes for the body region; `p-0` removes the default padding. */
  bodyClassName?: string;
  dataTestId?: string;
};

export type ConfirmDialogProps = DialogBaseProps & {
  okText?: string;
  cancelText?: string;
  /** Runs on the confirm button. When it returns a promise the button waits, and the dialog closes once it resolves. */
  onOk?: () => unknown;
  /** Called on Cancel, and on the X, Escape or a click outside. */
  onCancel?: () => void;
  /** Colour of the confirm button. Destructive actions use `negative`. */
  buttonLook?: ButtonProps["variant"] | "destructive";
};

/** What an owner keeps in state for a confirmation it is about to show: everything but `open` and `onOpenChange`. */
export type ConfirmDialogContent = Omit<ConfirmDialogProps, "open" | "onOpenChange">;

export type InfoDialogProps = DialogBaseProps & {
  okText?: string;
  onOk?: () => void;
};

/**
 * Keeps the props of the last open render while the dialog fades out, so owners can clear their state on close
 * without the buttons, size or close controls changing during the exit animation.
 */
function useShown<P>(open: boolean, current: P): P {
  const shown = useRef(current);
  if (open) shown.current = current;
  return shown.current;
}

function useWaiting(open: boolean) {
  const [waiting, setWaiting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!open) setWaiting(false);
  }, [open]);
  const run = (action: (() => unknown) | undefined, close: () => void) => {
    const result = action?.();
    if (!(result instanceof Promise)) {
      close();
      return;
    }
    setWaiting(true);
    result.then(
      () => close(),
      () => {
        if (mounted.current) setWaiting(false);
      },
    );
  };
  return { waiting, run };
}

/** A confirmation with Cancel and a confirm action, rendered by the component that owns it. */
export function ConfirmDialog({ open, onOpenChange, ...current }: ConfirmDialogProps) {
  const {
    title,
    children,
    footerMeta,
    size = "medium",
    allowClose = false,
    closeOnClickOutside = true,
    bodyClassName,
    dataTestId,
    okText = "OK",
    cancelText = "Cancel",
    onOk,
    onCancel,
    buttonLook,
  } = useShown(open, current);
  const { waiting, run } = useWaiting(open);
  const close = () => onOpenChange?.(false);
  const cancel = () => {
    if (waiting) return;
    onCancel?.();
    close();
  };

  return (
    <ModalWindow
      placement="center"
      open={open}
      onOpenChange={(next) => {
        if (!next && allowClose) cancel();
      }}
      size={size}
      title={title}
      showCloseButton={allowClose}
      closeOnScrimClick={allowClose && closeOnClickOutside}
      closeOnFocusOutside={false}
      trapFocus
      footerMeta={footerMeta}
      bodyClassName={bodyClassName}
      dataTestId={dataTestId}
      footer={
        <div className="flex justify-end gap-tight">
          <Button
            look="outlined"
            variant="neutral"
            autoFocus
            aria-label={cancelText}
            data-testid="dialog-cancel-button"
            disabled={waiting}
            onClick={cancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonLook === "destructive" ? "negative" : (buttonLook ?? "primary")}
            aria-label={okText}
            data-testid="dialog-ok-button"
            waiting={waiting}
            onClick={() => {
              if (!waiting) run(onOk, close);
            }}
          >
            {okText}
          </Button>
        </div>
      }
    >
      {children}
    </ModalWindow>
  );
}

/** A notice with a single OK button, rendered by the component that owns it. */
export function InfoDialog({ open, onOpenChange, ...current }: InfoDialogProps) {
  const {
    title,
    children,
    footerMeta,
    size = "medium",
    allowClose = false,
    closeOnClickOutside = true,
    bodyClassName,
    dataTestId,
    okText = "OK",
    onOk,
  } = useShown(open, current);
  const close = () => onOpenChange?.(false);

  return (
    <ModalWindow
      placement="center"
      open={open}
      onOpenChange={(next) => {
        if (!next && allowClose) close();
      }}
      size={size}
      title={title}
      showCloseButton={allowClose}
      closeOnScrimClick={allowClose && closeOnClickOutside}
      closeOnFocusOutside={false}
      trapFocus
      footerMeta={footerMeta}
      bodyClassName={bodyClassName}
      dataTestId={dataTestId}
      footer={
        <div className="flex justify-end gap-tight">
          <Button
            variant="primary"
            aria-label={okText}
            data-testid="dialog-ok-button"
            onClick={() => {
              onOk?.();
              close();
            }}
          >
            {okText}
          </Button>
        </div>
      }
    >
      {children}
    </ModalWindow>
  );
}
