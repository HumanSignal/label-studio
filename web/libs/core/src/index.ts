import * as ff from "./lib/utils/feature-flags/ff";

export * from "./lib/Tour";
export * from "./lib/utils/analytics";
export * from "./lib/utils/urlJSON";
export * from "./lib/utils/helpers";
export * from "./lib/utils/string";
export * from "./lib/utils/bem";
export * from "./lib/utils/visitedProjects";
export * from "./lib/utils/billing";
export * from "./hooks/useAbortController";
export * from "./lib/hooks/useCopyText";
export * from "./hooks/usePageTitle";

// API Provider
export {
  ApiProvider,
  ApiContext,
  useAPI,
  errorFormatter,
} from "./providers/api-provider";
export {
  createApiInstance,
  getApiInstance,
  resetApiInstance,
  API,
} from "./lib/api-provider/api-instance";
export type {
  ApiCallOptions,
  ApiContextType,
  FormattedError,
  ErrorHandlerOptions,
  ApiProviderConfig,
} from "./lib/api-provider/types";

export { ff };
