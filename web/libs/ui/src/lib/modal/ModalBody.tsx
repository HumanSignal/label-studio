import type { PropsWithChildren } from "react";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";

export const ModalBody = ({ bare, children }: PropsWithChildren<{ bare?: boolean }>) => {
  return <div className={cn("modal-ls").elem("body").mod({ bare }).toClassName()}>{children}</div>;
};
