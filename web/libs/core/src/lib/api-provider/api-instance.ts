import { APIProxy } from "../api-proxy";
import type { ApiProviderConfig } from "./types";

let apiInstance: APIProxy<Record<string, unknown>> | null = null;

/**
 * Creates and initializes the API instance with the provided configuration.
 * This should be called once at application startup.
 *
 * @param config - Configuration for the API instance
 * @returns The initialized API instance
 */
export function createApiInstance(config: ApiProviderConfig): APIProxy<Record<string, unknown>> {
  if (apiInstance) {
    console.warn("API instance already exists. Returning existing instance.");
    return apiInstance;
  }

  apiInstance = new APIProxy({
    gateway: config.gateway,
    endpoints: config.endpoints,
    commonHeaders: config.commonHeaders,
    onRequestFinished: config.onRequestFinished,
    alwaysExpectJSON: config.alwaysExpectJSON,
    sharedParams: config.sharedParams,
    mockDelay: config.mockDelay,
    mockDisabled: config.mockDisabled,
  });

  return apiInstance;
}

/**
 * Gets the current API instance.
 * Throws an error if the instance has not been initialized.
 *
 * @returns The API instance
 * @throws {Error} If API instance is not initialized
 */
export function getApiInstance(): APIProxy<Record<string, unknown>> {
  if (!apiInstance) {
    throw new Error("API instance not initialized. Call createApiInstance first.");
  }
  return apiInstance;
}

/**
 * Resets the API instance (useful for testing).
 * This should not be used in production code.
 */
export function resetApiInstance(): void {
  apiInstance = null;
}

/**
 * Export singleton proxy that lazily gets the API instance.
 * This maintains backward compatibility with direct API imports.
 */
export const API = new Proxy({} as APIProxy<Record<string, unknown>>, {
  get(_target, prop) {
    const instance = getApiInstance();
    const value = instance[prop as keyof APIProxy<Record<string, unknown>>];

    // Bind methods to the instance
    if (typeof value === "function") {
      return value.bind(instance);
    }

    return value;
  },
});
