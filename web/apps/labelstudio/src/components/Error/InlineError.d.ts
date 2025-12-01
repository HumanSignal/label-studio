import type { CSSProperties, ReactNode, FC } from "react";

export interface InlineErrorProps {
  minimal?: boolean;
  includeValidation?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

declare module "apps/labelstudio/src/components/Error/InlineError" {
  export const InlineError: FC<InlineErrorProps>;
}
