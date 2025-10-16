import type { PropsWithChildren } from "react";
import { Elem } from "./ModalContext";

export const ModalTitle = ({ children }: PropsWithChildren) => {
  return <Elem name="title">{children}</Elem>;
};
