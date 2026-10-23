import { type PropsWithChildren, useCallback, useEffect, useState, forwardRef } from "react";
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
import { Button, ToastType, useToast } from "@humansignal/ui";
import {
  holdProjectAccessDenied,
  httpMethodFromEndpoint,
  isProjectAccessHeld,
  shouldBlockRequestWhileProjectAccessHeld,
  shouldHoldProjectRequestDenied,
  subscribeProjectAccessHeld,
} from "@humansignal/core/lib/utils/project-access-ui";
import { captureException } from "../config/Sentry";

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

const originalInvoke = apiInstance.invoke.bind(apiInstance);
apiInstance.invoke = ((method, params, options) => {
  const name = String(method).replace(/Raw$/, "");
  const httpMethod = httpMethodFromEndpoint((API_CONFIG.endpoints as Record<string, unknown>)[name]);
  if (shouldBlockRequestWhileProjectAccessHeld(httpMethod)) return Promise.resolve(null);
  return originalInvoke(method, params, options);
}) as typeof apiInstance.invoke;

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
        stacktrace={isFF(FF_IMPROVE_GLOBAL_ERROR_MESSAGES) ? undefined : stacktrace}
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
const PROJECT_ACCESS_DENIED = "项目不可访问，可能已被删除或访问权限已取消";

export const ApiProvider = forwardRef<ApiContextType, PropsWithChildren<Record<string, never>>>(({ children }, ref) => {
  const toast = useToast();
  const [accessHeld, setAccessHeld] = useState(isProjectAccessHeld());

  useEffect(() => subscribeProjectAccessHeld(() => setAccessHeld(isProjectAccessHeld())), []);

  /**
   * Handles errors with Label Studio-specific logic including:
   * - Toast notifications for 4xx errors
   * - Modal errors for validation errors
   * - Sentry logging for server errors
   */
  const handleError = useCallback(
    (errorDetails: FormattedError, result: ApiResponse) => {
      const status = result.$meta?.status;
      if (shouldHoldProjectRequestDenied(location.pathname, Number(status), result.$meta?.url)) {
        holdProjectAccessDenied();
        return;
      }

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
      if (isFF(FF_IMPROVE_GLOBAL_ERROR_MESSAGES) && is4xx && !containsValidationErrors) {
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
  const handleFatalError = useCallback((_errorDetails: FormattedError, result: ApiResponse) => {
    if (apiLocked) return;

    const status = result.$meta?.status;

    // Handle 401 redirects
    if (status === 401) {
      apiLocked = true;
      location.href = absoluteURL("/");
      return;
    }

    if (shouldHoldProjectRequestDenied(location.pathname, Number(status), result.$meta?.url)) {
      holdProjectAccessDenied();
      return;
    }

    // Handle 404 redirects with improved error messages
    if (isFF(FF_IMPROVE_GLOBAL_ERROR_MESSAGES) && status === 404) {
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
      {accessHeld ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-base border-b border-negative-border bg-negative-background px-base py-tight"
        >
          <p className="text-body-medium">{PROJECT_ACCESS_DENIED}</p>
          <Button
            type="button"
            variant="neutral"
            look="outlined"
            onClick={() => {
              location.assign(absoluteURL("/projects"));
            }}
          >
            返回项目列表
          </Button>
        </div>
      ) : null}
      {children}
    </CoreApiProvider>
  );
});

ApiProvider.displayName = "ApiProvider";
