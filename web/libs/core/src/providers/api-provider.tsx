import {
  createContext,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApiResponse, WrappedResponse } from "../lib/api-proxy/types";
import { getApiInstance } from "../lib/api-provider/api-instance";
import type { ApiCallOptions, ApiContextType, ErrorHandlerOptions, FormattedError } from "../lib/api-provider/types";

export const ApiContext = createContext<ApiContextType | null>(null);
ApiContext.displayName = "ApiContext";

/**
 * Formats an API error response into a user-friendly error object.
 *
 * @param result - The API response containing the error
 * @returns Formatted error object
 */
export const errorFormatter = (result: ApiResponse): FormattedError => {
  const response = "response" in result ? result.response : null;
  const isShutdown = false;

  return {
    isShutdown,
    title: result.error ? "Runtime error" : "Server error",
    message: response?.detail ?? result?.error ?? "An unknown error occurred",
    stacktrace: response?.exc_info ?? undefined,
    version: response?.version,
    validation: Object.entries<string[]>(response?.validation_errors ?? {}),
  };
};

interface ApiProviderProps {
  /**
   * Callback to handle non-fatal errors.
   * This is called for errors that should be displayed to the user.
   */
  onError?: (error: FormattedError, response: ApiResponse) => void;

  /**
   * Callback to handle fatal errors that should stop the application.
   * This is called for errors like 401 (unauthorized) or 404 (not found).
   */
  onFatalError?: (error: FormattedError, response: ApiResponse) => void;
}

/**
 * ApiProvider component that provides API functionality to the application.
 * This should wrap the entire application or a major section of it.
 *
 * @example
 * ```tsx
 * <ApiProvider onError={handleError} onFatalError={handleFatalError}>
 *   <App />
 * </ApiProvider>
 * ```
 */
export const ApiProvider = forwardRef<ApiContextType, PropsWithChildren<ApiProviderProps>>(
  ({ children, onError, onFatalError }, ref) => {
    const [error, setError] = useState<ApiResponse | null>(null);
    const api = getApiInstance();

    const resetError = useCallback(() => setError(null), []);

    /**
     * Handles API errors with appropriate user feedback.
     */
    const handleError = useCallback(
      async (response: Response | ApiResponse, options: ErrorHandlerOptions = {}): Promise<boolean> => {
        let result: ApiResponse = response as ApiResponse;

        if (response instanceof Response) {
          result = await api.generateError(response);
        }

        const errorDetails = errorFormatter(result);
        const { showGlobalError = true, customHandler } = options;

        if (!showGlobalError) {
          return errorDetails.isShutdown;
        }

        if (customHandler) {
          customHandler(errorDetails, result);
        } else if (onError) {
          onError(errorDetails, result);
        }

        if (errorDetails.isShutdown && onFatalError) {
          onFatalError(errorDetails, result);
        }

        return errorDetails.isShutdown;
      },
      [api, onError, onFatalError],
    );

    /**
     * Calls an API method with the given options.
     * Handles errors automatically unless suppressError is true.
     */
    const callApi = useCallback(
      async <T,>(method: string, options: ApiCallOptions = {}): Promise<WrappedResponse<T> | null> => {
        const { params = {}, errorFilter, suppressError, ...rest } = options;

        setError(null);

        const result = await api.invoke<T>(method, params, rest);

        if (result?.error) {
          const shouldShowGlobalError = !errorFilter || errorFilter(result) === false;

          if (suppressError !== true) {
            setError(result);
          }

          if (shouldShowGlobalError && suppressError !== true) {
            await handleError(result, {
              showGlobalError: true,
            });
            return null;
          }
        }

        return result;
      },
      [api, handleError],
    );

    const contextValue: ApiContextType = useMemo(
      () => ({
        api,
        callApi,
        handleError,
        resetError,
        error,
        showGlobalError: true,
        errorFormatter,
        isValidMethod(name: string) {
          return api.isValidMethod(name);
        },
      }),
      [api, callApi, handleError, resetError, error],
    );

    useEffect(() => {
      if (ref && !(ref instanceof Function)) {
        ref.current = contextValue;
      }
    }, [ref, contextValue]);

    return <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>;
  },
);

ApiProvider.displayName = "ApiProvider";

/**
 * Hook to access the API context.
 * Must be used within an ApiProvider.
 *
 * @returns The API context
 * @throws {Error} If used outside of an ApiProvider
 *
 * @example
 * ```tsx
 * const { callApi } = useAPI();
 * const result = await callApi('getUser', { params: { id: 1 } });
 * ```
 */
export const useAPI = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useAPI must be used within an ApiProvider");
  }
  return context;
};
