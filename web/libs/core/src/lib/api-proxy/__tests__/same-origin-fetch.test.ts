import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { sameOriginFetch } from "../same-origin-fetch";

describe("sameOriginFetch", () => {
  const originalFetch = globalThis.fetch;
  let lastInput: RequestInfo | URL | undefined;
  let lastInit: RequestInit | undefined;

  beforeEach(() => {
    lastInput = undefined;
    lastInit = undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      lastInput = input;
      lastInit = init;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.each([
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ])("adds X-Requested-With for a same-origin relative %s request", async (method) => {
    await sameOriginFetch("/api/projects/1/", { method });

    const headers = new Headers(lastInit?.headers);

    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
  });

  it.each(["post", "put", "patch", "delete"])("is case-insensitive for method %s", async (method) => {
    await sameOriginFetch("/api/projects/1/", { method });

    const headers = new Headers(lastInit?.headers);

    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
  });

  it("adds X-Requested-With for a same-origin absolute-URL POST", async () => {
    await sameOriginFetch(`${window.location.origin}/api/projects/`, { method: "POST" });

    const headers = new Headers(lastInit?.headers);

    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
  });

  it("does not add X-Requested-With for a GET request", async () => {
    await sameOriginFetch("/api/projects/1/");

    const headers = new Headers(lastInit?.headers);

    expect(headers.has("X-Requested-With")).toBe(false);
  });

  it("does not add X-Requested-With when method defaults to GET (no init)", async () => {
    await sameOriginFetch("/api/projects/1/");

    expect(lastInput).toBe("/api/projects/1/");
    const headers = new Headers(lastInit?.headers);
    expect(headers.has("X-Requested-With")).toBe(false);
  });

  it("does NOT add X-Requested-With for a cross-origin POST (presigned upload / third-party)", async () => {
    await sameOriginFetch("https://my-bucket.s3.amazonaws.com/upload-path?X-Amz-Signature=abc", {
      method: "POST",
    });

    const headers = new Headers(lastInit?.headers);

    expect(headers.has("X-Requested-With")).toBe(false);
  });

  it("does NOT add X-Requested-With for a cross-origin PUT", async () => {
    await sameOriginFetch("https://third-party.example.com/api/resource", { method: "PUT" });

    const headers = new Headers(lastInit?.headers);

    expect(headers.has("X-Requested-With")).toBe(false);
  });

  it("preserves other init options (credentials, body) unchanged", async () => {
    const body = JSON.stringify({ hello: "world" });

    await sameOriginFetch("/api/things/", {
      method: "POST",
      credentials: "same-origin",
      body,
    });

    expect(lastInit?.credentials).toBe("same-origin");
    expect(lastInit?.body).toBe(body);
  });

  it("preserves existing headers alongside the new one", async () => {
    await sameOriginFetch("/api/things/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Custom": "1" },
    });

    const headers = new Headers(lastInit?.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Custom")).toBe("1");
    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
  });

  it("supports a Request object as input", async () => {
    const request = new Request(`${window.location.origin}/api/things/`, { method: "DELETE" });

    await sameOriginFetch(request);

    const headers = new Headers(lastInit?.headers);

    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
  });
});
