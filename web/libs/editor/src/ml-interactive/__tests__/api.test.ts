import { afterEach, describe, expect, it, mock } from "bun:test";

import { fetchCapabilities, fetchInteractiveBackends } from "../api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ml-interactive/api", () => {
  it("maps paginated interactive backend responses", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        jsonResponse({
          results: [
            { id: 10, title: "SAM2", ignored: true },
            { id: 11, title: "Other" },
          ],
        }),
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchInteractiveBackends(7)).resolves.toEqual([
      { id: 10, title: "SAM2" },
      { id: 11, title: "Other" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost/api/ml/interactive-backends?project=7");
  });

  it("discovers member-accessible backend IDs when the management list is forbidden", async () => {
    globalThis.fetch = mock((input: string) =>
      Promise.resolve(
        input.endsWith("/api/ml/interactive-backends?project=7")
          ? jsonResponse([{ id: 10, is_interactive: true }])
          : new Response("Forbidden", { status: 403 }),
      ),
    ) as unknown as typeof fetch;

    await expect(fetchInteractiveBackends(7)).resolves.toEqual([{ id: 10, title: undefined }]);
  });

  it("rejects non-OK backend discovery responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403 })),
    ) as unknown as typeof fetch;

    await expect(fetchInteractiveBackends(7)).rejects.toThrow("Failed to fetch interactive ML backends: 403");
  });

  it("parses capability responses from interactive annotating", async () => {
    const capabilities = {
      model_info: { name: "SAM2" },
      prompts: ["point", "box"],
      targets: [{ tag: "VideoVectorLabels", output: "polygon", features: ["track"] }],
    };
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ data: { result: [{ value: capabilities }] } })),
    ) as unknown as typeof fetch;

    await expect(fetchCapabilities(10, 99)).resolves.toEqual(capabilities);
  });

  it("rejects non-OK capability responses instead of treating them as no bindings", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403 })),
    ) as unknown as typeof fetch;

    await expect(fetchCapabilities(10, 99)).rejects.toThrow("Failed to fetch ML backend capabilities: 403");
  });

  it("returns null for malformed successful capability responses", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ data: { result: [{ value: {} }] } })),
    ) as unknown as typeof fetch;

    await expect(fetchCapabilities(10, 99)).resolves.toBeNull();
  });
});
