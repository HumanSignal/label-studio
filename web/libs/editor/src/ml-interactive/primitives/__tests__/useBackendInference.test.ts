import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { InteractiveController } from "../../controller";
import { useBackendInference } from "../useBackendInference";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe("useBackendInference member discovery", () => {
  it("resolves a legacy controller and predicts without access to the management list", async () => {
    const fetchMock = mock((input: string) => {
      if (input.endsWith("/api/ml/interactive-backends?project=7")) {
        return Promise.resolve(Response.json([{ id: 10, is_interactive: true }]));
      }
      if (input.endsWith("/api/ml/10/interactive-annotating")) {
        return Promise.resolve(Response.json({ data: { result: [] } }));
      }
      return Promise.resolve(new Response("Forbidden", { status: 403 }));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const item = {
      annotation: { store: { project: { id: 7 }, task: { id: 99 } } },
      state: "resolving",
      isVideo: false,
      setState: mock(),
      setError: mock(),
    } as unknown as InteractiveController;

    const { result, rerender } = renderHook(() => useBackendInference(item));
    await waitFor(() => expect(item.setState).toHaveBeenCalledWith("stopped"));
    rerender();
    expect(result.current.predict).not.toBeNull();
    await result.current.predict?.([{ x: 5, y: 5, positive: true }], 100, 100);

    expect(item.setError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/ml/10/interactive-annotating",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"task":99'),
      }),
    );
    expect(item.setState).toHaveBeenCalledWith("prompting");
  });
});
