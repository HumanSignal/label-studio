import { createContext, type FC, type ReactNode, useCallback, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import styles from "./toast.module.scss";
import clsx from "clsx";
import { IconCross } from "../../assets/icons";
import { cn } from "@humansignal/shad/utils";

export type ToastViewportProps = ToastPrimitive.ToastViewportProps & any;
export interface ToastProps extends Omit<ToastPrimitive.ToastProps, "type"> {
  title?: string;
  action?: ReactNode;
  closeable?: boolean;
  open?: boolean;
  onClose?: () => void;
  type?: ToastType;
}

export enum ToastType {
  info = "info",
  error = "error",
  alertError = "alertError",
}
interface ToastProviderWithTypes extends ToastPrimitive.ToastProviderProps {
  type?: ToastType;
}
export const ToastViewport: FC<ToastViewportProps> = ({ hotkey, label, ...props }) => {
  return (
    <div className={styles["toast-viewport"]} {...props}>
      <ToastPrimitive.Viewport hotkey={hotkey} label={label} />
    </div>
  );
};

export const Toast: FC<ToastProps> = ({
  title,
  action,
  children,
  closeable = false,
  onClose,
  type = ToastType.info,
  ...props
}) => {
  const closeHandler = useCallback(
    (open: boolean) => {
      props.onOpenChange?.(open);
      if (!closeable) return;
      if (!open) onClose?.();
    },
    [closeable, onClose, props.onOpenChange],
  );

  return (
    <ToastPrimitive.Root {...props} onOpenChange={closeHandler}>
      <div
        className={clsx(styles.toast, {
          [styles.toast_info]: type === ToastType.info,
          [styles.toast_error]: type === ToastType.error,
          [styles.toast_alertError]: type === ToastType.alertError,
        })}
      >
        {title && (
          <ToastPrimitive.Title>
            <div className={clsx(styles.toast__title)}>{title}</div>
          </ToastPrimitive.Title>
        )}
        <ToastPrimitive.Description>
          <div className={clsx(styles.toast__content)}>{children}</div>
        </ToastPrimitive.Description>
        {action}
        {closeable && (
          <ToastPrimitive.Close asChild>
            <div className={clsx(styles.toast__close)} aria-label="Close">
              <span aria-hidden>
                <IconCross />
              </span>
            </div>
          </ToastPrimitive.Close>
        )}
      </div>
    </ToastPrimitive.Root>
  );
};

export interface ToastActionProps extends ToastPrimitive.ToastActionProps {
  onClose?: () => void;
}
export const ToastAction: FC<ToastActionProps> = ({ children, onClose, altText, ...props }) => (
  <ToastPrimitive.Action altText={altText} asChild className="pointer-events-none">
    <button className={cn(styles.toast__action, "pointer-events-all")} onClick={onClose} {...props}>
      {children}
    </button>
  </ToastPrimitive.Action>
);
export type ToastShowArgs = {
  message: string | ReactNode | JSX.Element;
  type?: ToastType;
  duration?: number; // -1 for no auto close
};
type ToastContextType = {
  show: ({ message, type, duration }: ToastShowArgs) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  if (process.env.NODE_ENV === "test") return null;
  const context = useContext(ToastContext);

  // Avoid throwing error in test environment
  // Otherwise every test that uses useToast will throw an error and be forced to wrap the component in a ToastProvider even if it's not needed
  if (!context && process.env.NODE_ENV !== "test") {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: FC<ToastProviderWithTypes> = ({ swipeDirection = "down", children, type, ...props }) => {
  const [toastMessage, setToastMessage] = useState<ToastShowArgs | null>();
  const defaultDuration = 4000;
  const duration = toastMessage?.duration ?? defaultDuration;
  const show = ({ message, type, duration = defaultDuration }: ToastShowArgs) => {
    setToastMessage({ message, type });
    if (duration < 0) return;
    setTimeout(() => setToastMessage(null), duration);
  };
  const toastType = toastMessage?.type ?? type ?? ToastType.info;
  return (
    <ToastContext.Provider value={{ show }}>
      <ToastPrimitive.Provider swipeDirection={swipeDirection} duration={duration} {...props}>
        <Toast
          className={clsx(styles.messageToast, {
            [styles.messageToast_info]: toastType === ToastType.info,
            [styles.messageToast_error]: toastType === ToastType.error,
            [styles.messageToast_alertError]: toastType === ToastType.alertError,
          })}
          open={!!toastMessage?.message}
          action={
            <ToastAction onClose={() => setToastMessage(null)} altText="x">
              <IconCross />
            </ToastAction>
          }
          type={toastType}
          {...props}
        >
          {toastMessage?.message}
        </Toast>
        {children}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};
