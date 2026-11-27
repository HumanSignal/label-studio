import { registerAnalytics } from "./analytics";
import type { Mock } from "bun:test";

describe("analytics", () => {
  const testPath = "/page";
  let originalRequestIdleCallback: any;
  let originalSendBeacon: any;
  let mockSendBeacon: Mock<any>;

  beforeEach(() => {
    // Mock window.requestIdleCallback
    originalRequestIdleCallback = window.requestIdleCallback;
    window.requestIdleCallback = (cb: any) => cb();

    // Mock navigator.sendBeacon
    originalSendBeacon = navigator.sendBeacon;
    mockSendBeacon = mock(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: mockSendBeacon,
      configurable: true,
    });

    // Reset APP_SETTINGS before each test
    (window as any).APP_SETTINGS = {
      collect_analytics: true,
    };

    // Keep URL deterministic across runners without redefining non-configurable location.
    window.history.replaceState({}, "", testPath);
  });

  afterEach(() => {
    // Restore original functions
    window.requestIdleCallback = originalRequestIdleCallback;
    Object.defineProperty(navigator, "sendBeacon", {
      value: originalSendBeacon,
      configurable: true,
    });
  });

  it("should register analytics function on window", () => {
    registerAnalytics();
    expect(window.__lsa).toBeDefined();
  });

  it("should not send analytics when collect_analytics is false", () => {
    registerAnalytics();
    (window as any).APP_SETTINGS.collect_analytics = false;

    window.__lsa("test.event", { data: "value" });
    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("should send analytics with correct payload using sendBeacon", () => {
    registerAnalytics();

    window.__lsa("test.event", { data: "value" });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    const [url, _data] = mockSendBeacon.mock.calls[0];

    expect(url).toMatch(/^\/__lsa\/\?/);
    const params = new URLSearchParams(url.split("?")[1]);
    const payload = JSON.parse(params.get("__") || "");

    expect(payload).toEqual({
      data: "value",
      event: "test.event",
      url: `${window.location.origin}${testPath}`,
    });
  });

  it("should fallback to Image when sendBeacon is not available", () => {
    // Remove sendBeacon
    Object.defineProperty(navigator, "sendBeacon", {
      value: null,
      configurable: true,
    });

    const mockImage = { src: "" };
    const originalImage = (globalThis as any).Image;
    const imageCtor = mock(() => mockImage);
    (window as any).Image = imageCtor;
    (globalThis as any).Image = imageCtor;

    registerAnalytics();
    window.__lsa("test.event", { data: "value" });

    expect(window.Image).toHaveBeenCalled();
    expect(mockImage.src).toMatch(/^\/__lsa\/\?/);

    // Restore Image constructor
    (window as any).Image = originalImage;
    (globalThis as any).Image = originalImage;
  });

  it("should handle errors gracefully", () => {
    mockSendBeacon.mockImplementation(() => {
      throw new Error("Network error");
    });

    registerAnalytics();

    expect(() => {
      window.__lsa("test.event", { data: "value" });
    }).not.toThrow();
  });

  it("should work with minimal parameters", () => {
    registerAnalytics();

    window.__lsa("test.event");

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    const [url] = mockSendBeacon.mock.calls[0];
    const params = new URLSearchParams(url.split("?")[1]);
    const payload = JSON.parse(params.get("__") || "");

    expect(payload).toEqual({
      event: "test.event",
      url: `${window.location.origin}${testPath}`,
    });
  });
});
