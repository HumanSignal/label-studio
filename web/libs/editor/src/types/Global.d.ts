import { ComponentClass, FC, FunctionComponent, ReactHTML, ReactSVG } from "react";

declare type AnyComponent = FC<any> | keyof ReactHTML | keyof ReactSVG | ComponentClass<unknown, unknown> | FunctionComponent<unknown> | string

declare global {
  interface Window {
    APP_SETTINGS: Record<string, any>;
    FEATURE_FLAGS?: Record<string, boolean>;
  }
}
