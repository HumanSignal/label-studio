import type { CSSProperties, PropsWithChildren } from "react";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";

type ModalFooterProps = PropsWithChildren<{
  bare?: boolean;
  style?: CSSProperties;
  className?: string;
}>;

export const ModalFooter = ({ children, bare, style, className }: ModalFooterProps) => (
  <div className={cn("modal-ls").elem("footer").mod({ bare }).mix(className).toClassName()} style={style}>
    {children}
  </div>
);
