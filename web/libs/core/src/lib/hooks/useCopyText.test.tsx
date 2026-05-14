import { renderHook, act } from "@testing-library/react";
import { useCopyText } from "./useCopyText";

/**
 * Regression tests for FIT-1774: the new editor's sandboxed iframe rejects
 * `navigator.clipboard.writeText` when the embed lacks the `copyToClipboard`
 * RPC capability. Before the fix, those rejections leaked into the host page
 * console as "Unhandled (in promise) Error: Clipboard write is not allowed in
 * this embed". The shared `copyText` helper now swallows rejection and the
 * hook only flips its `copied` flag on actual success.
 */
describe("useCopyText", () => {
  let originalClipboard: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    }
  });

  function installClipboard(writeText: (text: string) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  }

  it("flips `copied` to true when the write resolves and back to false after the timeout", async () => {
    const writeText = mock(async () => {});
    installClipboard(writeText);

    const { result } = renderHook(() => useCopyText({ defaultText: "abc", timeout: 50 }));
    expect(result.current[1]).toBe(false);

    await act(async () => {
      result.current[0]();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(writeText).toHaveBeenCalledWith("abc");
    expect(result.current[1]).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(result.current[1]).toBe(false);
  });

  it("does NOT leak an unhandled rejection when the clipboard write is denied (sandbox iframe)", async () => {
    const writeText = mock(async () => {
      throw new Error("Clipboard write is not allowed in this embed");
    });
    installClipboard(writeText);

    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const unhandled = mock(() => {});
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", unhandled);
    }

    const { result } = renderHook(() => useCopyText({ defaultText: "abc", timeout: 50 }));

    await act(async () => {
      result.current[0]();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // `copied` must stay false because the write failed.
    expect(result.current[1]).toBe(false);
    // The rejection must be swallowed and only logged as a warning.
    expect(warnSpy).toHaveBeenCalled();
    // No unhandled rejection event must reach the host window.
    expect(unhandled).not.toHaveBeenCalled();

    if (typeof window !== "undefined") {
      window.removeEventListener("unhandledrejection", unhandled);
    }
    warnSpy.mockRestore();
  });

  it("does not throw when navigator.clipboard.writeText is missing entirely", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() => useCopyText({ defaultText: "abc", timeout: 50 }));
    await act(async () => {
      result.current[0]();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current[1]).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
