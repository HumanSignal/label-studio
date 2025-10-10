import type { PropsWithChildren } from "react";
import { Elem } from "./ModalContext";

type ModalHeaderProps = PropsWithChildren<{
  /**
   * If true, a horizontal line will be added under the header
   */
  divided?: boolean;
}>;

export const ModalHeader = ({ children, divided }: ModalHeaderProps) => {
  return (
    <Elem name="header" mod={{ divided }}>
      {children}
    </Elem>
  );
};
