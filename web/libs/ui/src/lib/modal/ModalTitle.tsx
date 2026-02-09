import type { PropsWithChildren } from "react";
import { cnb as cn } from "@humansignal/core/lib/utils/bem";

export const ModalTitle = ({ children }: PropsWithChildren) => {
  return <div className={cn("modal-ls").elem("title").toClassName()}>{children}</div>;
};
