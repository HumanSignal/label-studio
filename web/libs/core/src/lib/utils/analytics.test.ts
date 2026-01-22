import { registerAnalytics } from "./analytics";

describe("analytics", () => {
  const testUrl = "http://test.com/page";
  let originalRequestIdleCallback: any;
  let originalSendBeacon: any;
  let mockSendBeacon: jest.Mock;

  beforeEach(() => {
    // Mock window.requestIdleCallback
    originalRequestIdleCallback = window.requestIdleCallback;
    window.requestIdleCallback = (cb: any) => cb();

    // Mock navigator.sendBeacon
    originalSendBeacon = navigator.sendBeacon;
    mockSendBeacon = jest.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: mockSendBeacon,
      configurable: true,
    });

    // Reset APP_SETTINGS before each test
    (window as any).APP_SETTINGS = {
      collect_analytics: true,
    };

    // Mock window.location - simple pattern works with JSDOM 22 (jest-environment-jsdom v29)
    Object.defineProperty(window, "location", {
      value: { href: testUrl },
      configurable: true,
      writable: true,
    });
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
    const [url, data] = mockSendBeacon.mock.calls[0];

    expect(url).toMatch(/^\/__lsa\/\?/);
    const params = new URLSearchParams(url.split("?")[1]);
    const payload = JSON.parse(params.get("__") || "");

    expect(payload).toEqual({
      data: "value",
      event: "test.event",
      url: testUrl,
    });
  });

  it("should fallback to Image when sendBeacon is not available", () => {
    // Remove sendBeacon
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
    });

    const mockImage = { src: "" };
    const originalImage = window.Image;
    (window as any).Image = jest.fn(() => mockImage);

    registerAnalytics();
    window.__lsa("test.event", { data: "value" });

    expect(window.Image).toHaveBeenCalled();
    expect(mockImage.src).toMatch(/^\/__lsa\/\?/);

    // Restore Image constructor
    (window as any).Image = originalImage;
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
      url: testUrl,
    });
  });
});
