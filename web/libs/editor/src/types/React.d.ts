import "react";

type CustomProp = { [key in `--${string}`]: string };

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface CSSProperties extends CustomProp {}
}
