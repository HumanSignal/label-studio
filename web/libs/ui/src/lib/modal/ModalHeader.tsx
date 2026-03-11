import type { PropsWithChildren } from "react";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";

type ModalHeaderProps = PropsWithChildren<{
  /**
   * If true, a horizontal line will be added under the header
   */
  divided?: boolean;
}>;

export const ModalHeader = ({ children, divided }: ModalHeaderProps) => {
  return <div className={cn("modal-ls").elem("header").mod({ divided }).toClassName()}>{children}</div>;
};
