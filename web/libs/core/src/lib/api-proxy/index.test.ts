import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { APIProxy } from "./index";

describe("APIProxy path-parameter URL encoding", () => {
  const originalFetch = globalThis.fetch;
  let recordedUrls: string[];

  beforeEach(() => {
    recordedUrls = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      recordedUrls.push(url);
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("encodes a model_version containing spaces, slashes, and parentheses (BROS-1109)", async () => {
    const api = new APIProxy({
      gateway: "http://localhost/api",
      endpoints: {
        modelStats: "/projects/:pk/model-stats/:model_version/agreement-groundtruth",
      },
    });

    await api.invoke("modelStats", {
      pk: 348,
      model_version: "NER__Span-based NER labeling (PER/ORG/LOC/MISC) with character offsets",
      per_label: false,
    });

    expect(recordedUrls).toHaveLength(1);
    const url = new URL(recordedUrls[0]);
    expect(url.pathname).toBe(
      "/api/projects/348/model-stats/NER__Span-based%20NER%20labeling%20(PER%2FORG%2FLOC%2FMISC)%20with%20character%20offsets/agreement-groundtruth",
    );
    expect(url.searchParams.get("per_label")).toBe("false");
  });

  it("leaves numeric IDs unchanged after encoding", async () => {
    const api = new APIProxy({
      gateway: "http://localhost/api",
      endpoints: {
        project: "/projects/:pk",
      },
    });

    await api.invoke("project", { pk: 123 });

    expect(new URL(recordedUrls[0]).pathname).toBe("/api/projects/123");
  });

  it("encodes a slash inside a string path-param so it does not split routing segments", async () => {
    const api = new APIProxy({
      gateway: "http://localhost/api",
      endpoints: {
        thing: "/things/:slug/details",
      },
    });

    await api.invoke("thing", { slug: "a/b" });

    expect(new URL(recordedUrls[0]).pathname).toBe("/api/things/a%2Fb/details");
  });

  it("encodes whitespace inside string path-params", async () => {
    const api = new APIProxy({
      gateway: "http://localhost/api",
      endpoints: {
        thing: "/things/:name",
      },
    });

    await api.invoke("thing", { name: "hello world" });

    expect(new URL(recordedUrls[0]).pathname).toBe("/api/things/hello%20world");
  });

  it("preserves optional path-param behavior when value is undefined", async () => {
    const api = new APIProxy({
      gateway: "http://localhost/api",
      endpoints: {
        thing: "/things/:slug?",
      },
    });

    await api.invoke("thing", {});

    expect(new URL(recordedUrls[0]).pathname).toBe("/api/things");
  });
});
