import { formDataToJPO } from "../utils/helpers";
import statusCodes from "./status-codes.json";
import type {
  APIProxyOptions,
  ApiResponse,
  EndpointConfig,
  RequestMethod,
  RequestMode,
  ResponseError,
  ResponseMeta,
  WrappedResponse,
} from "./types";

type ApiMethods<T extends Record<string, EndpointConfig>> = {
  [K in keyof T]: (params?: Record<string, any>, options?: ApiParams) => Promise<WrappedResponse<any>>;
};

// We're catching certain types of errors that
// are not supposed to be user-facing
const IGNORED_ERRORS = new RegExp(
  [
    "abort", // Whenever the abort controller kicked in
    "failed to fetch", // Network's offline, bad URL, CORS, etc. in Chrome
    "networkerror", // Same as the above but Firefox,
  ].join("|"),
  "i",
);

export type ApiParams = {
  headers?: RequestInit["headers"];
  signal?: RequestInit["signal"];
  body?: FormData | URLSearchParams | Record<string, any>;
};

/**
 * Proxy layer for any type of API's
 */
export class APIProxy<T extends {}> {
  gateway: string;

  commonHeaders: Record<string, string> = {};

  mockDelay = 0;

  mockDisabled = false;

  requestMode: RequestMode = "same-origin";

  sharedParams: Record<string, any> = {};

  alwaysExpectJSON = true;

  methods = {} as ApiMethods<T>;

  onRequestFinished?: (res: Response) => void;

  constructor(options: APIProxyOptions<T>) {
    this.commonHeaders = options.commonHeaders ?? {};
    this.gateway = this.resolveGateway(options.gateway);
    this.requestMode = this.detectMode();
    this.mockDelay = options.mockDelay ?? 0;
    this.mockDisabled = options.mockDisabled ?? false;
    this.sharedParams = options.sharedParams ?? {};
    this.alwaysExpectJSON = options.alwaysExpectJSON ?? true;
    this.onRequestFinished = options.onRequestFinished;

    this.resolveMethods(options.endpoints);
  }

  invoke<T>(
    method: keyof typeof this.methods,
    params?: Record<string, any>,
    options?: ApiParams,
  ): Promise<WrappedResponse<T>> {
    if (!this.isValidMethod(method as string)) {
      throw new Error(`Method ${method.toString()} not found`);
    }

    return this.methods[method](params, options);
  }

  /**
   * Check if method exists
   * @param {String} method
   */
  isValidMethod(method: string) {
    return method in this.methods && this.methods[method as keyof typeof this.methods] instanceof Function;
  }

  /**
   * Resolves gateway to a full URL
   * @returns {string}
   */
  resolveGateway(url: string | URL): string {
    if (url instanceof URL) {
      return url.toString();
    }

    try {
      return new URL(url).toString();
    } catch (_e) {
      const gateway = new URL(window.location.href);

      gateway.search = "";
      gateway.hash = "";

      if (url[0] === "/") {
        gateway.pathname = url.replace(/([/])$/, "");
      } else {
        gateway.pathname = `${gateway.pathname}/${url}`.replace(/([/]+)/g, "/").replace(/([/])$/, "");
      }

      return gateway.toString();
    }
  }

  /**
   * Detect RequestMode.
   */
  detectMode(): RequestMode {
    const currentOrigin = window.location.origin;
    const gatewayOrigin = new URL(this.gateway).origin;

    return currentOrigin === gatewayOrigin ? "same-origin" : "cors";
  }

  /**
   * Build methods list from endpoints
   */
  private resolveMethods(endpoints: Record<string, EndpointConfig>, parentPath?: string[]) {
    if (endpoints) {
      const methods = new Map(Object.entries(endpoints));

      methods.forEach((settings, methodName) => {
        const { scope, ...restSettings } = this.getSettings(settings);
        const parent = parentPath ?? ([] as string[]);
        const method = this.createApiCallExecutor(restSettings, parent, false);
        const rawMethod = this.createApiCallExecutor(restSettings, parent, true);

        Object.assign(this.methods, {
          [methodName]: method,
          [`${methodName}Raw`]: rawMethod,
        });

        if (scope && typeof scope === "object") this.resolveMethods(scope, [...(parentPath ?? []), restSettings.path]);
      });
    }
  }

  /**
   * Actual API call
   */
  private createApiCallExecutor(methodSettings: Exclude<EndpointConfig, string>, parentPath: string[], raw = false) {
    return async (urlParams: Record<string, any>, { headers, signal, body }: ApiParams = {}) => {
      let responseResult: ApiResponse = {};
      let responseMeta = {} as ResponseMeta;

      try {
        const finalParams = {
          ...(methodSettings.params ?? {}),
          ...(urlParams ?? {}),
          ...(this.sharedParams ?? {}),
        };

        const { method, url: apiCallURL } = this.createUrl(
          methodSettings.path,
          finalParams,
          parentPath,
          methodSettings.gateway,
        );

        const requestMethod = method ?? (methodSettings.method ?? "get").toUpperCase();

        const initialheaders = Object.assign(
          this.getDefaultHeaders(requestMethod as RequestMethod),
          this.commonHeaders ?? {},
          methodSettings.headers ?? {},
          headers ?? {},
        );

        const requestHeaders = new Headers(initialheaders);

        const requestParams: RequestInit = {
          method: requestMethod,
          headers: requestHeaders,
          mode: this.requestMode,
          credentials: this.requestMode === "cors" ? "omit" : "same-origin",
        };

        if (signal) {
          requestParams.signal = signal;
        }

        if (requestMethod !== "GET") {
          const contentType = requestHeaders.get("Content-Type");
          const { sharedParams } = this;
          const extendedBody = body ?? {};

          if (extendedBody instanceof FormData) {
            Object.entries(sharedParams ?? {}).forEach(([key, value]) => {
              extendedBody.append(key, value);
            });
          } else {
            Object.assign(extendedBody, {
              ...(sharedParams ?? {}),
              ...(body ?? {}),
            });
          }

          if (extendedBody instanceof FormData || extendedBody instanceof URLSearchParams) {
            requestParams.body = extendedBody;
          } else if (contentType === "multipart/form-data") {
            requestParams.body = this.createRequestBody(extendedBody);
          } else if (contentType === "application/json") {
            requestParams.body = this.bodyToJSON(extendedBody);
          }

          // @todo better check for files maybe?
          if (contentType === "multipart/form-data") {
            // fetch will set correct header with boundaries
            requestHeaders.delete("Content-Type");
          }
        }

        /** @type {Response} */
        let rawResponse: Response;

        const isDevelopment = process.env.NODE_ENV === "development";
        const useMock =
          methodSettings.mock instanceof Function &&
          (methodSettings.forceMock || (isDevelopment && this.mockDisabled !== true));

        if (useMock) {
          rawResponse = await this.mockRequest(apiCallURL, urlParams, requestParams, methodSettings);
        } else {
          try {
            rawResponse = await fetch(apiCallURL, requestParams);
          } catch (err: unknown) {
            if (!(err instanceof Error)) {
              console.warn("Can't handle error", err);
              return null;
            }
            // we don't want the user to see some of the errors
            // so we fail silently
            if (err.message.match(IGNORED_ERRORS) !== null) {
              IGNORED_ERRORS.lastIndex = -1;
              return null;
            }

            const error = err as Error;
            responseResult = this.generateException(error);
            return new Response(`${err.name}: ${err.message}`, { status: 500 });
          }
        }

        this.onRequestFinished?.(rawResponse);
        if (raw) return rawResponse;

        responseMeta = {
          headers: new Map(headersToArray(rawResponse.headers)),
          status: rawResponse.status,
          url: rawResponse.url,
          ok: rawResponse.ok,
        };

        if (rawResponse.ok && rawResponse.status !== 401) {
          const responseText = await rawResponse.text();

          try {
            const responseData =
              rawResponse.status !== 204
                ? JSON.parse(this.alwaysExpectJSON ? responseText : responseText || "{}")
                : { ok: true };

            if (methodSettings.convert instanceof Function) {
              return await methodSettings.convert(responseData);
            }

            responseResult = responseData;
          } catch (err) {
            responseResult = this.generateException(err as Error, responseText);
          }
        } else {
          responseResult = await this.generateError(rawResponse);
        }
      } catch (exception) {
        responseResult = this.generateException(exception as Error);
      }

      Object.defineProperty(responseResult, "$meta", {
        value: responseMeta,
        configurable: false,
        enumerable: false,
        writable: false,
      });

      return responseResult;
    };
  }

  /**
   * Retrieve method-specific settings
   * @private
   * @param {EndpointConfig} settings
   * @returns {EndpointConfig}
   */
  getSettings(settings: EndpointConfig): Exclude<EndpointConfig, string> {
    if (typeof settings === "string") {
      settings = {
        path: settings,
      };
    }

    return {
      method: "GET",
      mock: undefined,
      convert: undefined,
      scope: undefined,
      ...settings,
    };
  }

  getDefaultHeaders(method: RequestMethod) {
    switch (method) {
      case "POST":
      case "PATCH":
      case "DELETE": {
        return {
          "Content-Type": "application/json",
        };
      }
      default:
        return {};
    }
  }

  /**
   * Creates a URL from gateway + endpoint path + params
   */
  private createUrl(endpoint: string, data: Record<string, any> = {}, parentPath: string[] = [], gateway?: string) {
    const url = new URL(gateway ? this.resolveGateway(gateway) : this.gateway);
    const usedKeys: string[] = [];

    const { path: resolvedPath, method: resolvedMethod } = this.resolveEndpoint(endpoint, data);

    const path = ([] as string[])
      .concat(...(parentPath ?? []), resolvedPath)
      .filter((p) => p !== undefined)
      .join("/")
      .replace(/([/]+)/g, "/");

    const processedPath = path.replace(/:([^/]+)/g, (...res) => {
      const keyRaw = res[1] as string;
      const [key, optional] = keyRaw.match(/([^?]+)(\??)/)!.slice(1, 3);
      const result = data[key];

      usedKeys.push(key);

      if (result === undefined) {
        if (optional === "?") return "";
        throw new Error(`Can't find key \`${key}\` in data [${path}]`);
      }

      return result;
    });

    url.pathname += processedPath.replace(/\/+/g, "/").replace(/\/+$/g, "");

    if (data && typeof data === "object") {
      Object.entries(data).forEach(([key, value]) => {
        if (!usedKeys.includes(key)) {
          url.searchParams.set(key, value);
        }
      });
    }

    return {
      url: url.toString(),
      method: resolvedMethod,
    };
  }

  /**
   * Resolves an endpoint
   */
  resolveEndpoint(endpoint: string | ((data: Record<string, any>) => string), data: Record<string, any>) {
    let finalEndpoint;

    if (endpoint instanceof Function) {
      finalEndpoint = endpoint(data);
    } else {
      finalEndpoint = endpoint;
    }

    const methodRegexp = /^(GET|POST|PATCH|DELETE|PUT|HEAD|OPTIONS):/;
    const method = finalEndpoint.match(methodRegexp)?.[1];
    const path = finalEndpoint.replace(methodRegexp, "");

    return { method, path };
  }

  /**
   * Create FormData object from raw JS object
   */
  private createRequestBody(body: Record<string, any>) {
    if (body instanceof FormData) return body;

    const formData = new FormData();

    Object.entries(body).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return formData;
  }

  /**
   * Converts body to JSON string
   */
  bodyToJSON(body: Record<string, any> | FormData) {
    const object = body instanceof FormData ? formDataToJPO(body) : body;

    return JSON.stringify(object);
  }

  /**
   * Generates an error from a Response object
   */
  async generateError(fetchResponse: Response): Promise<ResponseError> {
    let response = await fetchResponse.text();

    try {
      response = JSON.parse(response);
    } catch (_e) {}

    const statusCode = statusCodes[fetchResponse.status.toString() as keyof typeof statusCodes] ?? "Unknown error";

    return {
      status: fetchResponse.status,
      error: statusCode,
      response,
    };
  }

  /**
   * Generates an error from a caught exception
   * @param {Error} exception
   * @private
   */
  generateException(exception: Error, details?: string) {
    console.error(exception);
    const parsedDetails = () => {
      try {
        return JSON.parse(details ?? "{}");
      } catch (_e) {
        return details;
      }
    };

    return {
      error: exception.message,
      details: parsedDetails(),
    };
  }

  /**
   * Emulate server call
   * @param {string} url
   * @param {Record<string, unknown>} params
   * @param {Request} request
   * @param {EndpointConfig} settings
   */
  mockRequest(
    url: string,
    params: Record<string, unknown>,
    request: RequestInit,
    settings: Exclude<EndpointConfig, string>,
  ) {
    return new Promise<Response>(async (resolve) => {
      let response: Record<string, any> | undefined;
      let ok = true;

      try {
        const requestParams = {
          ...(request ?? {}),
          url,
          referrer: location.href,
        };

        if (typeof request.body === "string") {
          requestParams.body = request.body;
        }

        const fakeRequest = new Request(url, requestParams);

        console.log("Request", params, fakeRequest);

        response = await settings.mock?.(url, params ?? {}, fakeRequest);
      } catch (err) {
        console.error(err);
        ok = false;
      }

      const fakeResponse = new Response(JSON.stringify(response), {
        status: ok ? 200 : 500,
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
      });

      console.log("Response", {
        response: fakeResponse,
        responseBody: response,
      });

      setTimeout(() => {
        resolve(fakeResponse);
      }, this.mockDelay);
    });
  }
}

function headersToArray(headers: Headers) {
  const headersArray: [string, string][] = [];
  headers.forEach((value, key) => {
    headersArray.push([key, value]);
  });
  return headersArray;
}
