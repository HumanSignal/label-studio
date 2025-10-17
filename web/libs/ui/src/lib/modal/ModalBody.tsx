import type { PropsWithChildren } from "react";
import { Elem } from "./ModalContext";

export const ModalBody = ({ bare, children }: PropsWithChildren<{ bare?: boolean }>) => {
  return (
    <Elem name="body" mod={{ bare }}>
      {children}
    </Elem>
  );
};
