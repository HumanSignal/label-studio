import { afterEach, describe, expect, it, mock } from "bun:test";

import { interactiveCapabilityStore } from "../store";

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
  interactiveCapabilityStore.invalidateAll();
});

describe("interactiveCapabilityStore", () => {
  it("marks failed discovery as error and retries instead of caching empty bindings", async () => {
    interactiveCapabilityStore.invalidateAll();
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403 })),
    ) as unknown as typeof fetch;

    await interactiveCapabilityStore.load(7, 99);

    expect(interactiveCapabilityStore.getStatus(7)).toBe("error");
    expect(interactiveCapabilityStore.getBindings(7)).toEqual([]);

    const capabilities = {
      model_info: { name: "SAM2" },
      prompts: ["point", "box"],
      targets: [{ tag: "VideoVectorLabels", output: "polygon", features: ["track"] }],
    };
    globalThis.fetch = mock((input: string) => {
      if (input.endsWith("/api/ml/interactive-backends?project=7")) {
        return Promise.resolve(jsonResponse([{ id: 10, is_interactive: true }]));
      }
      if (input.endsWith("/api/ml/10/interactive-annotating")) {
        return Promise.resolve(jsonResponse({ data: { result: [{ value: capabilities }] } }));
      }
      return Promise.resolve(new Response("Forbidden", { status: 403 }));
    }) as unknown as typeof fetch;

    await interactiveCapabilityStore.load(7, 99);

    expect(interactiveCapabilityStore.getStatus(7)).toBe("loaded");
    expect(interactiveCapabilityStore.getBindings(7)).toMatchObject([
      {
        backendId: 10,
        modelInfo: { name: "SAM2" },
        controlTag: "VideoVectorLabels",
        output: "polygon",
        prompts: ["point", "box"],
      },
    ]);
    expect(interactiveCapabilityStore.getBindings(7)[0].features.has("track")).toBe(true);
  });
});
