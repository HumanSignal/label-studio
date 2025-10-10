import type { CSSProperties, PropsWithChildren } from "react";
import { Elem } from "./ModalContext";

type ModalFooterProps = PropsWithChildren<{
  bare?: boolean;
  style?: CSSProperties;
  className?: string;
}>;

export const ModalFooter = ({ children, bare, style, className }: ModalFooterProps) => (
  <Elem name="footer" mod={{ bare }} mix={className} style={style}>
    {children}
  </Elem>
);
