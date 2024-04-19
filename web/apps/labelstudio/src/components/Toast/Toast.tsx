import { createContext, type FC, type ReactNode, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { type BemComponent, Block, Elem } from "../../utils/bem";
import "./Toast.styl";
import { MessageToast } from "./MessageToast";

export type ToastViewportProps = ToastPrimitive.ToastViewportProps & BemComponent;
export interface ToastProps {
  title?: string;
  action?: ReactNode;
  closeable?: boolean;
  open?: boolean;
}

export enum ToastType {
  info = "info",
  error = "error",
}
interface ToastProviderWithTypes extends ToastPrimitive.ToastProviderProps {
  toastType: ToastType;
}
export const ToastViewport: FC<ToastViewportProps> = ({ hotkey, label, ...props }) => {
  return (
    <Block name="toast-viewport" tag="div" {...props}>
      <ToastPrimitive.Viewport hotkey={hotkey} label={label} />
    </Block>
  );
};

export const Toast: FC<ToastProps> = ({ title, action, children, closeable = false, ...props }) => {
  return (
    <ToastPrimitive.Root {...props}>
      <Block name="toast">
        {title && (
          <ToastPrimitive.Title>
            <Elem name="title">{title}</Elem>
          </ToastPrimitive.Title>
        )}
        <ToastPrimitive.Description>
          <Elem name="content">{children}</Elem>
        </ToastPrimitive.Description>
        {action}
        {closeable && (
          <ToastPrimitive.Close asChild>
            <Elem name="close" aria-label="Close">
              <span aria-hidden>×</span>
            </Elem>
          </ToastPrimitive.Close>
        )}
      </Block>
    </ToastPrimitive.Root>
  );
};

type ToastWithoutBem = ToastPrimitive.ToastActionProps & Omit<BemComponent, "name">;
export interface ToastActionProps extends ToastWithoutBem {
  closeCallback?: () => void;
}
export const ToastAction: FC<ToastActionProps> = ({ children, closeCallback, altText, ...props }) => (
  <ToastPrimitive.Action altText={altText} asChild style={{ pointerEvents: "none" }}>
    <Elem name="action" tag="button" onClick={closeCallback} style={{ pointerEvents: "all" }} {...props}>
      {children}
    </Elem>
  </ToastPrimitive.Action>
);
type ToastShowArgs = { message: string; type?: ToastType };
type ToastContextType = {
  show: ({ message, type }: ToastShowArgs) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: FC<ToastProviderWithTypes> = ({ swipeDirection = "down", children, ...props }) => {
  const [toastMessage, setToastMessage] = useState<ToastShowArgs | null>();
  const duration = 2000;
  const show = ({ message, type }: ToastShowArgs) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), duration);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      <ToastPrimitive.Provider swipeDirection={swipeDirection} duration={duration} {...props}>
        <MessageToast toastType={toastMessage?.type} closeCallback={() => setToastMessage(null)}>
          {toastMessage?.message}
        </MessageToast>
        {children}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};
