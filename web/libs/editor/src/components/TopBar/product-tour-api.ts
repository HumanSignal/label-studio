/**
 * Product-tour API for the classic editor.
 *
 * The editor mounts in its own React root, outside the app's `ApiProvider`, so it cannot use `useAPI`.
 * This talks to the same `current-user/product-tour` endpoints through its own `APIProxy`.
 */
import { APIProxy } from "@humansignal/core/lib/api-proxy";

type CallApiOptions = { params?: Record<string, unknown>; body?: Record<string, unknown> };

let api: APIProxy<Record<string, unknown>> | undefined;

function getApi() {
  // Created lazily: `window.APP_SETTINGS` is not populated yet when this module is first imported.
  api ??= new APIProxy({
    gateway: `${window.APP_SETTINGS?.hostname ?? ""}/api`,
    endpoints: {
      getProductTour: "GET:/current-user/product-tour",
      updateProductTour: "PATCH:/current-user/product-tour",
    },
  });
  return api;
}

// One shared object: `TourProvider` keys its callbacks on the identity of what `useAPI` returns.
const productTourApi = {
  callApi: (method: string, { params, body }: CallApiOptions = {}) => getApi().invoke(method, params, { body }),
};

export const useProductTourApi = () => productTourApi;
