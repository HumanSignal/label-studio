/**
 * @typedef {string | {
 * path: string,
 * method: RequestMethod,
 * convert: ResponseConverter,
 * mock: (url: string, request: Request) => Dict
 * body: Dict,
 * headers: Headers,
 * }} EndpointConfig
 */

import { formDataToJPO } from "./helpers";

/**
 * @typedef {Dict<string, EndpointConfig>} Endpoints
 */

/**
 * @typedef {{
 * gateway: string | URL,
 * endpoints: Dict<EndpointConfig>,
 * commonHeaders: Dict<string>,
 * mockDelay: number,
 * mockDisabled: boolean,
 * sharedParams: Dict<any>,
 * alwaysExpectJSON: boolean,
 * }} APIProxyOptions
 */

/**
 * Proxy layer for any type of API's
 */
export class APIProxy {
  /** @type {string} */
  gateway = null;

  /** @type {Dict<string>} */
  commonHeaders = {};

  /** @type {number} */
  mockDelay = 0;

  /** @type {boolean} */
  mockDisabled = false;

  /** @type {"same-origin"|"cors"} */
  requestMode = "same-origin";

  /** @type {Dict} */
  sharedParams = {};

  /**
   * Constructor
   * @param {APIProxyOptions} options
   */
  constructor(options) {
    this.commonHeaders = options.commonHeaders ?? {};
    this.gateway = this.resolveGateway(options.gateway);
    this.requestMode = this.detectMode();
    this.mockDelay = options.mockDelay ?? 0;
    this.mockDisabled = options.mockDisabled ?? false;
    this.sharedParams = options.sharedParams ?? {};
    this.alwaysExpectJSON = options.alwaysExpectJSON ?? true;

    this.resolveMethods(options.endpoints);
  }

  /**
   * Check if method exists
   * @param {String} method
   */
  isValidMethod(method) {
    return this[method] instanceof Function;
  }

  /**
   * Resolves gateway to a full URL
   * @returns {string}
   */
  resolveGateway(url) {
    if (url instanceof URL) {
      return url.toString();
    }

    try {
      return new URL(url).toString();
    } catch (e) {
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
   * @returns {"same-origin"|"cors"}
   */
  detectMode() {
    const currentOrigin = window.location.origin;
    const gatewayOrigin = new URL(this.gateway).origin;

    return currentOrigin === gatewayOrigin ? "same-origin" : "cors";
  }

  /**
   * Build methods list from endpoints
   * @private
   */
  resolveMethods(endpoints, parentPath) {
    if (endpoints) {
      const methods = new Map(Object.entries(endpoints));

      methods.forEach((settings, methodName) => {
        const { scope, ...restSettings } = this.getSettings(settings);

        Object.defineProperty(this, methodName, {
          value: this.createApiCallExecutor(restSettings, [parentPath]),
        });

        Object.defineProperty(this, `${methodName}Raw`, {
          value: this.createApiCallExecutor(restSettings, [parentPath], true),
        });

        if (scope) this.resolveMethods(scope, [...(parentPath ?? []), restSettings.path]);
      });
    }
  }

  /**
   * Actual API call
   * @param {EndpointConfig} settings
   * @private
   */
  createApiCallExecutor(methodSettings, parentPath, raw = false) {
    return async (urlParams, { headers, signal, body } = {}) => {
      let responseResult;
      let responseMeta;

      try {
        const finalParams = {
          ...(urlParams ?? {}),
          ...(this.sharedParams ?? {}),
        };

        const { method, url: apiCallURL } = this.createUrl(methodSettings.path, finalParams, parentPath);

        const requestMethod = method ?? (methodSettings.method ?? "get").toUpperCase();

        const initialheaders = Object.assign(
          this.getDefaultHeaders(requestMethod),
          this.commonHeaders ?? {},
          methodSettings.headers ?? {},
          headers ?? {},
        );

        const requestHeaders = new Headers(initialheaders);

        const requestParams = {
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

          if (extendedBody instanceof FormData) {
            requestParams.body = extendedBody;
          } else if (contentType === "multipart/form-data") {
            requestParams.body = this.createRequestBody(extendedBody);
          } else if (contentType === "application/json") {
            requestParams.body = this.bodyToJSON(extendedBody);
          } else {
            requestParams.body = extendedBody;
          }

          // @todo better check for files maybe?
          if (contentType === "multipart/form-data") {
            // fetch will set correct header with boundaries
            requestHeaders.delete("Content-Type");
          }
        }

        /** @type {Response} */
        let rawResponse;

        if (methodSettings.mock && process.env.NODE_ENV === "development" && !this.mockDisabled) {
          rawResponse = await this.mockRequest(apiCallURL, urlParams, requestParams, methodSettings);
        } else {
          rawResponse = await fetch(apiCallURL, requestParams);
        }

        responseMeta = {
          headers: new Map(Array.from(rawResponse.headers)),
          status: rawResponse.status,
          url: rawResponse.url,
        };

        if (raw) return rawResponse;

        if (rawResponse.ok) {
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
            responseResult = this.generateException(err, responseText);
          }
        } else {
          responseResult = this.generateError(rawResponse);
        }
      } catch (exception) {
        responseResult = this.generateException(exception);
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
  getSettings(settings) {
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

  getDefaultHeaders(method) {
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
   * @param {string} path
   * @param {Dict} data
   * @private
   */
  createUrl(endpoint, data = {}, parentPath) {
    const url = new URL(this.gateway);
    const usedKeys = [];
    const { path: resolvedPath, method: resolvedMethod } = this.resolveEndpoint(endpoint, data);
    const path = []
      .concat(...(parentPath ?? []), resolvedPath)
      .filter((p) => p !== undefined)
      .join("/")
      .replace(/([/]+)/g, "/");

    const processedPath = path.replace(/:([^/]+)/g, (...res) => {
      const keyRaw = res[1];
      const [key, optional] = keyRaw.match(/([^?]+)(\??)/).slice(1, 3);
      const result = data[key];

      usedKeys.push(key);

      if (result === undefined) {
        if (optional === "?") return "";
        throw new Error(`Can't find key \`${key}\` in data`);
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
   * @param {string|Function} endpoint
   * @param {Dict} data
   */
  resolveEndpoint(endpoint, data) {
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
   * @private
   * @param {Dict} body
   */
  createRequestBody(body) {
    if (body instanceof FormData) return body;

    const formData = new FormData();

    Object.entries(body).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return formData;
  }

  /**
   * Converts body to JSON string
   * @param {Object|FormData} body
   */
  bodyToJSON(body) {
    const object = formDataToJPO(body);
    return JSON.stringify(object);
  }

  /**
   * Generates an error from a Response object
   * @param {Response} fetchResponse
   * @private
   */
  async generateError(fetchResponse, exception) {
    const result = (async () => {
      const text = await fetchResponse.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return text;
      }
    })();

    return {
      status: fetchResponse.status,
      error: (exception?.message ?? fetchResponse.statusText) || "Server Error",
      response: await result,
    };
  }

  /**
   * Generates an error from a caught exception
   * @param {Error} exception
   * @private
   */
  generateException(exception, details) {
    console.error(exception);
    const parsedDetails = () => {
      try {
        return JSON.parse(details);
      } catch (e) {
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
   * @param {Request} params
   * @param {EndpointConfig} settings
   */
  mockRequest(url, params, request, settings) {
    return new Promise(async (resolve) => {
      let response = null;
      let ok = true;

      try {
        const fakeRequest = new Request(request);

        if (typeof request.body === "string") {
          fakeRequest.body = JSON.parse(request.body);
        }

        response = await settings.mock(url, params ?? {}, fakeRequest);
      } catch (err) {
        console.error(err);
        ok = false;
      }

      setTimeout(() => {
        resolve({
          ok,
          json() {
            return Promise.resolve(response);
          },
        });
      }, this.mockDelay);
    });
  }
}
