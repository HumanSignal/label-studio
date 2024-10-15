export type {};
declare global {
  interface Window {
    APP_SETTINGS: Record<string, any>;
    FEATURE_FLAGS: Record<string, boolean>;
    LSF_CONFIG: Record<any, any>;
    DEFAULT_LSF_INIT: boolean;
    LabelStudio: any;
    Htx: any;
  }
}
