import type { ApiResponse, WrappedResponse } from "../api-proxy/types";
import type { APIProxy } from "../api-proxy";

export interface ApiCallOptions {
  params?: Record<string, unknown>;
  suppressError?: boolean;
  errorFilter?: (response: ApiResponse) => boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  body?: FormData | URLSearchParams | Record<string, unknown>;
}

export interface FormattedError {
  title: string;
  message: string;
  stacktrace?: string;
  version?: string;
  validation: [string, string[]][];
  isShutdown: boolean;
}

export interface ApiContextType {
  api: APIProxy<Record<string, unknown>>;
  callApi: <T>(method: string, options?: ApiCallOptions) => Promise<WrappedResponse<T> | null>;
  handleError: (response: Response | ApiResponse, options?: ErrorHandlerOptions) => Promise<boolean>;
  resetError: () => void;
  error: ApiResponse | null;
  showGlobalError: boolean;
  errorFormatter: (result: ApiResponse) => FormattedError;
  isValidMethod: (name: string) => boolean;
}

export interface ErrorHandlerOptions {
  showGlobalError?: boolean;
  customHandler?: (error: FormattedError, response: ApiResponse) => void;
}

export interface ApiProviderConfig {
  gateway: string;
  endpoints: Record<string, unknown>;
  commonHeaders?: Record<string, string>;
  onRequestFinished?: (res: Response) => void;
  alwaysExpectJSON?: boolean;
  sharedParams?: Record<string, unknown>;
  mockDelay?: number;
  mockDisabled?: boolean;
}
