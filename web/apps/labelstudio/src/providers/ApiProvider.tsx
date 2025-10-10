import { type PropsWithChildren, useCallback, useEffect, forwardRef } from "react";
import {
  ApiProvider as CoreApiProvider,
  createApiInstance,
  type ApiContextType,
  type FormattedError,
} from "@humansignal/core";
import type { ApiResponse } from "@humansignal/core/lib/api-proxy/types";
import { ErrorWrapper } from "../components/Error/Error";
import { modal } from "../components/Modal/Modal";
import { API_CONFIG } from "../config/ApiConfig";
import { absoluteURL, isDefined } from "../utils/helpers";
import { FF_IMPROVE_GLOBAL_ERROR_MESSAGES, isFF } from "../utils/feature-flags";
import { ToastType, useToast } from "@humansignal/ui";
import { captureException } from "../config/Sentry";

export const IMPROVE_GLOBAL_ERROR_MESSAGES = isFF(FF_IMPROVE_GLOBAL_ERROR_MESSAGES);
// Duration for toast errors
export const API_ERROR_TOAST_DURATION = 10000;

// Initialize API instance with Label Studio configuration
const apiInstance = createApiInstance({
  ...API_CONFIG,
  onRequestFinished(res) {
    if (res.status === 401) {
      location.href = "/";
    }
  },
});

// Export API instance for backward compatibility
export const API = apiInstance;

// Re-export useAPI and ApiContext from core for convenience
export { useAPI, ApiContext } from "@humansignal/core";

export type ApiEndpoints = keyof typeof API.methods;

let apiLocked = false;

/**
 * Displays an error modal with the error details.
 */
const displayErrorModal = (errorDetails: FormattedError) => {
  const { isShutdown, title, message, stacktrace, ...formattedError } = errorDetails;

  modal({
    unique: "network-error",
    allowClose: !isShutdown,
    body: isShutdown ? (
      <ErrorWrapper
        possum={false}
        title={"Connection refused"}
        message={"Server not responding. Is it still running?"}
      />
    ) : (
      <ErrorWrapper
        {...formattedError}
        title={title}
        message={message}
        stacktrace={IMPROVE_GLOBAL_ERROR_MESSAGES ? undefined : stacktrace}
      />
    ),
    simple: true,
    style: { width: 680 },
  });
};

/**
 * Label Studio application-specific ApiProvider.
 * Wraps the core ApiProvider with Label Studio-specific error handling.
 */
export const ApiProvider = forwardRef<ApiContextType, PropsWithChildren<Record<string, never>>>(({ children }, ref) => {
  const toast = useToast();

  /**
   * Handles errors with Label Studio-specific logic including:
   * - Toast notifications for 4xx errors
   * - Modal errors for validation errors
   * - Sentry logging for server errors
   */
  const handleError = useCallback(
    (errorDetails: FormattedError, result: ApiResponse) => {
      const status = result.$meta?.status;
      const is4xx = status?.toString().startsWith("4");
      const containsValidationErrors =
        isDefined(result.response?.validation_errors) && Object.keys(result.response.validation_errors).length > 0;

      // Log to Sentry for non-4xx or errors with stacktraces
      if ((!is4xx || result.response?.exc_info) && result.error) {
        captureException(new Error(result.error), {
          extra: {
            status,
            server_stacktrace: result.response?.exc_info,
            server_version: result.response?.version,
          },
        });
      }

      // Show toast for 4xx without validation errors
      if (IMPROVE_GLOBAL_ERROR_MESSAGES && is4xx && !containsValidationErrors) {
        toast?.show({
          message: `${errorDetails.title}: ${errorDetails.message}`,
          type: ToastType.error,
          duration: API_ERROR_TOAST_DURATION,
        });
      } else {
        // Show modal for validation errors or non-4xx
        displayErrorModal(errorDetails);
      }
    },
    [toast],
  );

  /**
   * Handles fatal errors like 401 and 404.
   */
  const handleFatalError = useCallback((errorDetails: FormattedError, result: ApiResponse) => {
    if (apiLocked) return;

    const status = result.$meta?.status;

    // Handle 401 redirects
    if (status === 401) {
      apiLocked = true;
      location.href = absoluteURL("/");
      return;
    }

    // Handle 404 redirects with improved error messages
    if (IMPROVE_GLOBAL_ERROR_MESSAGES && status === 404) {
      apiLocked = true;
      let redirectUrl = absoluteURL("/");

      if (location.pathname.startsWith("/projects")) {
        redirectUrl = absoluteURL("/projects");
      }

      sessionStorage.setItem("redirectMessage", "The page or resource you were looking for does not exist.");
      location.href = redirectUrl;
    }
  }, []);

  // Check for redirect messages on mount
  useEffect(() => {
    const redirectMessage = sessionStorage.getItem("redirectMessage");
    if (redirectMessage) {
      toast?.show({
        message: redirectMessage,
        type: ToastType.error,
        duration: API_ERROR_TOAST_DURATION,
      });
      sessionStorage.removeItem("redirectMessage");
    }
  }, [toast]);

  return (
    <CoreApiProvider ref={ref} onError={handleError} onFatalError={handleFatalError}>
      {children}
    </CoreApiProvider>
  );
});

ApiProvider.displayName = "ApiProvider";
