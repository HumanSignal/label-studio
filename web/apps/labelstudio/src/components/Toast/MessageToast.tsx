import { Toast, ToastAction, type ToastProps } from "../../components/Toast/Toast";
import { LsCross } from "../../assets/icons";
import type { FC } from "react";
import { Block } from "../../utils/bem";
import "./MessageToast.scss";

export interface MessageToastProps extends ToastProps {
  children?: any;
  toastType?: "info" | "error" | null;
  closeCallback?: () => void;
}

export const MessageToast: FC<MessageToastProps> = ({ toastType = "info", closeCallback, children, ...props }) => {
  return (
    <Block
      name="MessageToast"
      tag={Toast}
      open={!!children}
      mod={{
        info: toastType === "info",
        error: toastType === "error",
      }}
      action={
        <ToastAction closeCallback={closeCallback} altText="x">
          <LsCross />
        </ToastAction>
      }
      {...props}
    >
      {children}
    </Block>
  );
};
