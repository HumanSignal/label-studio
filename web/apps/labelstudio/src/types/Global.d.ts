declare const APP_SETTINGS: Record<string, any>;

declare type AnyObject = Record<string, unknown>

declare global {
  interface Window {
    APP_SETTINGS: Record<string, any>;
    FEATURE_FLAGS?: Record<string, boolean>;
    LabelStudio: any;
  }
}

