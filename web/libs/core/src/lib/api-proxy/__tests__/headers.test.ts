import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { APIProxy } from "../index";
import { REQUESTED_WITH_HEADER, REQUESTED_WITH_VALUE } from "../same-origin-fetch";
// biome-ignore lint/suspicious/noExplicitAny: the DM proxy is plain JS with no shipped types
import { APIProxy as DMAPIProxy } from "../../../../../datamanager/src/utils/api-proxy/index.js";

/**
 * FIT-2967: every unsafe (POST/PUT/PATCH/DELETE) SAME-ORIGIN request made through either of the
 * two API proxies must carry `X-Requested-With: XMLHttpRequest` — the custom-header CSRF signal
 * that FIT-2968 will start enforcing server-side. GET requests must NOT carry it, and neither
 * may any cross-origin request (a `cors` proxy or a per-endpoint gateway on another origin),
 * because a custom header forces a CORS preflight that can fail the write.
 */

const SAME_ORIGIN_GATEWAY = `${window.location.origin}/api`;
const CROSS_ORIGIN_GATEWAY = "https://ml-backend.example.com/api";

describe("shared header constant", () => {
  it("is the exact header FIT-2968 will enforce", () => {
    expect(REQUESTED_WITH_HEADER).toBe("X-Requested-With");
    expect(REQUESTED_WITH_VALUE).toBe("XMLHttpRequest");
  });
});

describe("APIProxy.getDefaultHeaders (services/lso/web/libs/core)", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("adds X-Requested-With for %s", (method) => {
    const api = new APIProxy({ gateway: SAME_ORIGIN_GATEWAY, endpoints: {} });
    const headers = api.getDefaultHeaders(method);

    expect(headers[REQUESTED_WITH_HEADER]).toBe(REQUESTED_WITH_VALUE);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it.each(["GET", "HEAD", "OPTIONS"] as const)("does not add X-Requested-With for %s", (method) => {
    const api = new APIProxy({ gateway: SAME_ORIGIN_GATEWAY, endpoints: {} });
    const headers = api.getDefaultHeaders(method);

    expect(headers[REQUESTED_WITH_HEADER]).toBeUndefined();
  });

  it.each([
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ] as const)("does not add X-Requested-With for %s when the proxy runs in cors mode", (method) => {
    const api = new APIProxy({ gateway: CROSS_ORIGIN_GATEWAY, endpoints: {} });

    expect(api.requestMode).toBe("cors");

    const headers = api.getDefaultHeaders(method);

    expect(headers[REQUESTED_WITH_HEADER]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not add X-Requested-With when the resolved URL is on another origin", () => {
    const api = new APIProxy({ gateway: SAME_ORIGIN_GATEWAY, endpoints: {} });

    expect(api.getDefaultHeaders("POST", `${CROSS_ORIGIN_GATEWAY}/predict`)[REQUESTED_WITH_HEADER]).toBeUndefined();
    expect(api.getDefaultHeaders("POST", `${SAME_ORIGIN_GATEWAY}/projects`)[REQUESTED_WITH_HEADER]).toBe(
      REQUESTED_WITH_VALUE,
    );
  });
});

describe("Data Manager APIProxy.getDefaultHeaders (services/lso/web/libs/datamanager)", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("adds X-Requested-With for %s", (method) => {
    const api = new DMAPIProxy({ gateway: SAME_ORIGIN_GATEWAY, endpoints: {} });
    const headers = api.getDefaultHeaders(method);

    expect(headers[REQUESTED_WITH_HEADER]).toBe(REQUESTED_WITH_VALUE);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it.each(["GET", "HEAD", "OPTIONS"])("does not add X-Requested-With for %s", (method) => {
    const api = new DMAPIProxy({ gateway: SAME_ORIGIN_GATEWAY, endpoints: {} });
    const headers = api.getDefaultHeaders(method);

    expect(headers[REQUESTED_WITH_HEADER]).toBeUndefined();
  });

  it.each([
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ])("does not add X-Requested-With for %s when the proxy runs in cors mode", (method) => {
    const api = new DMAPIProxy({ gateway: CROSS_ORIGIN_GATEWAY, endpoints: {} });

    expect(api.requestMode).toBe("cors");

    const headers = api.getDefaultHeaders(method);

    expect(headers[REQUESTED_WITH_HEADER]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not add X-Requested-With when the resolved URL is on another origin", () => {
    const api = new DMAPIProxy({ gateway: SAME_ORIGIN_GATEWAY, endpoints: {} });

    expect(api.getDefaultHeaders("POST", `${CROSS_ORIGIN_GATEWAY}/predict`)[REQUESTED_WITH_HEADER]).toBeUndefined();
    expect(api.getDefaultHeaders("POST", `${SAME_ORIGIN_GATEWAY}/projects`)[REQUESTED_WITH_HEADER]).toBe(
      REQUESTED_WITH_VALUE,
    );
  });
});

describe("APIProxy end-to-end header wiring", () => {
  const originalFetch = globalThis.fetch;
  let lastRequestHeaders: Headers | undefined;
  let lastRequestMethod: string | undefined;
  let lastRequestBody: BodyInit | null | undefined;

  beforeEach(() => {
    lastRequestHeaders = undefined;
    lastRequestMethod = undefined;
    lastRequestBody = undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      lastRequestHeaders = new Headers(init?.headers);
      lastRequestMethod = init?.method;
      lastRequestBody = init?.body;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("carries X-Requested-With on a PUT request through ApiProxy", async () => {
    const api = new APIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { updateThing: "PUT:/things/:pk" },
    });

    await api.invoke("updateThing", { pk: 1 }, { body: { name: "updated" } });

    expect(lastRequestMethod).toBe("PUT");
    expect(lastRequestHeaders?.get(REQUESTED_WITH_HEADER)).toBe(REQUESTED_WITH_VALUE);
    expect(lastRequestHeaders?.get("Content-Type")).toBe("application/json");
    expect(lastRequestBody).toBe(JSON.stringify({ name: "updated" }));
  });

  it("does not add X-Requested-With on a GET request through ApiProxy", async () => {
    const api = new APIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { thing: "/things/:pk" },
    });

    await api.invoke("thing", { pk: 1 });

    expect(lastRequestMethod).toBe("GET");
    expect(lastRequestHeaders?.has(REQUESTED_WITH_HEADER)).toBe(false);
  });

  it("does not add X-Requested-With on a POST through a cors-mode ApiProxy (cross-origin gateway)", async () => {
    const api = new APIProxy({
      gateway: CROSS_ORIGIN_GATEWAY,
      endpoints: { predict: "POST:/predict" },
    });

    await api.invoke("predict", {}, { body: { text: "hello" } });

    expect(lastRequestMethod).toBe("POST");
    expect(lastRequestHeaders?.has(REQUESTED_WITH_HEADER)).toBe(false);
  });

  it("does not add X-Requested-With when a per-endpoint gateway points at another origin", async () => {
    const api = new APIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { predict: { path: "/predict", method: "POST", gateway: CROSS_ORIGIN_GATEWAY } },
    });

    expect(api.requestMode).toBe("same-origin");

    await api.invoke("predict", {}, { body: { text: "hello" } });

    expect(lastRequestMethod).toBe("POST");
    expect(lastRequestHeaders?.has(REQUESTED_WITH_HEADER)).toBe(false);
  });

  it("keeps X-Requested-With on a multipart FormData POST (Content-Type is stripped, not the custom header)", async () => {
    const api = new APIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { upload: { path: "/uploads", method: "POST", headers: { "Content-Type": "multipart/form-data" } } },
    });

    const formData = new FormData();
    formData.append("file", new Blob(["hello"]), "hello.txt");

    await api.invoke("upload", {}, { body: formData });

    expect(lastRequestMethod).toBe("POST");
    expect(lastRequestHeaders?.get(REQUESTED_WITH_HEADER)).toBe(REQUESTED_WITH_VALUE);
    // Content-Type is deliberately removed so fetch can set the multipart boundary itself.
    expect(lastRequestHeaders?.get("Content-Type")).not.toBe("multipart/form-data");
  });

  it("does not force application/json onto a FormData PUT (no explicit Content-Type)", async () => {
    const api = new APIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { replaceThing: "PUT:/things/:pk" },
    });

    const formData = new FormData();
    formData.append("file", new Blob(["hello"]), "hello.txt");

    await api.invoke("replaceThing", { pk: 1 }, { body: formData });

    expect(lastRequestMethod).toBe("PUT");
    expect(lastRequestBody).toBeInstanceOf(FormData);
    expect(lastRequestHeaders?.get(REQUESTED_WITH_HEADER)).toBe(REQUESTED_WITH_VALUE);
    // Left to fetch so it can set the multipart boundary itself.
    expect(lastRequestHeaders?.has("Content-Type")).toBe(false);
  });
});

describe("Data Manager APIProxy end-to-end header wiring", () => {
  const originalFetch = globalThis.fetch;
  let lastRequestHeaders: Headers | undefined;
  let lastRequestMethod: string | undefined;
  let lastRequestBody: BodyInit | null | undefined;

  beforeEach(() => {
    lastRequestHeaders = undefined;
    lastRequestMethod = undefined;
    lastRequestBody = undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      lastRequestHeaders = new Headers(init?.headers);
      lastRequestMethod = init?.method;
      lastRequestBody = init?.body;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("carries X-Requested-With on a PUT request through the DM proxy", async () => {
    const api = new DMAPIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { updateThing: "PUT:/things/:pk" },
    });

    await api.call("updateThing", { params: { pk: 1 }, body: { name: "updated" } });

    expect(lastRequestMethod).toBe("PUT");
    expect(lastRequestHeaders?.get(REQUESTED_WITH_HEADER)).toBe(REQUESTED_WITH_VALUE);
    expect(lastRequestHeaders?.get("Content-Type")).toBe("application/json");
    expect(lastRequestBody).toBe(JSON.stringify({ name: "updated" }));
  });

  it("does not add X-Requested-With on a GET request through the DM proxy", async () => {
    const api = new DMAPIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { thing: "/things/:pk" },
    });

    await api.call("thing", { params: { pk: 1 } });

    expect(lastRequestMethod).toBe("GET");
    expect(lastRequestHeaders?.has(REQUESTED_WITH_HEADER)).toBe(false);
  });

  it("does not add X-Requested-With on a POST through a cors-mode DM proxy (cross-origin gateway)", async () => {
    const api = new DMAPIProxy({
      gateway: CROSS_ORIGIN_GATEWAY,
      endpoints: { predict: "POST:/predict" },
    });

    await api.call("predict", { body: { text: "hello" } });

    expect(lastRequestMethod).toBe("POST");
    expect(lastRequestHeaders?.has(REQUESTED_WITH_HEADER)).toBe(false);
  });

  it("does not add X-Requested-With when a per-endpoint gateway points at another origin", async () => {
    const api = new DMAPIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { predict: { path: "/predict", method: "POST", gateway: CROSS_ORIGIN_GATEWAY } },
    });

    expect(api.requestMode).toBe("same-origin");

    await api.call("predict", { body: { text: "hello" } });

    expect(lastRequestMethod).toBe("POST");
    expect(lastRequestHeaders?.has(REQUESTED_WITH_HEADER)).toBe(false);
  });

  it("does not force application/json onto a multipart FormData PUT through the DM proxy", async () => {
    const api = new DMAPIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { replaceThing: "PUT:/things/:pk" },
    });

    const formData = new FormData();
    formData.append("file", new Blob(["hello"]), "hello.txt");

    await api.call("replaceThing", { params: { pk: 1 }, body: formData });

    expect(lastRequestMethod).toBe("PUT");
    expect(lastRequestBody).toBeInstanceOf(FormData);
    expect(lastRequestHeaders?.get(REQUESTED_WITH_HEADER)).toBe(REQUESTED_WITH_VALUE);
    // Left to fetch so it can set the multipart boundary itself.
    expect(lastRequestHeaders?.has("Content-Type")).toBe(false);
  });

  it("keeps an explicit multipart FormData POST working (Content-Type stripped, header kept)", async () => {
    const api = new DMAPIProxy({
      gateway: SAME_ORIGIN_GATEWAY,
      endpoints: { upload: { path: "/uploads", method: "POST", headers: { "Content-Type": "multipart/form-data" } } },
    });

    const formData = new FormData();
    formData.append("file", new Blob(["hello"]), "hello.txt");

    await api.call("upload", { body: formData });

    expect(lastRequestMethod).toBe("POST");
    expect(lastRequestBody).toBeInstanceOf(FormData);
    expect(lastRequestHeaders?.get(REQUESTED_WITH_HEADER)).toBe(REQUESTED_WITH_VALUE);
    expect(lastRequestHeaders?.has("Content-Type")).toBe(false);
  });
});
