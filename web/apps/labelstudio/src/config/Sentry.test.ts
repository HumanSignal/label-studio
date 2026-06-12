import type { Mock } from "bun:test";
import * as sentryBrowserModule from "@sentry/browser";
import * as sentryReactModule from "@sentry/react";

const mockAppSettings = {
  debug: false,
  sentry_dsn: "test-dsn",
  sentry_environment: "test",
  sentry_rate: "0.25",
  user: { email: "test@example.com", username: "testuser" },
  version: { "label-studio-os-package": { version: "1.0.0", commit: "abc123" } },
};

(global as any).APP_SETTINGS = mockAppSettings;
Object.defineProperty(window, "APP_SETTINGS", {
  writable: true,
  value: mockAppSettings,
});

describe("Sentry Configuration (Open Source)", () => {
  let Sentry: any;
  let captureException: any;

  beforeAll(async () => {
    Sentry = sentryBrowserModule;
    const SentryModule = await import(`./Sentry?bun_reload=${Date.now()}`);
    captureException = SentryModule.captureException;
  });

  beforeEach(() => {
    mock.clearAllMocks();
    spyOn(sentryBrowserModule, "init").mockImplementation(mock());
    spyOn(sentryBrowserModule, "setUser").mockImplementation(mock());
    spyOn(sentryBrowserModule, "setTags").mockImplementation(mock());
    spyOn(sentryBrowserModule, "browserTracingIntegration").mockImplementation(mock(() => ({})));
    spyOn(sentryBrowserModule, "captureException").mockImplementation(mock(() => "test-event-id"));
    spyOn(sentryReactModule, "reactRouterV5BrowserTracingIntegration").mockImplementation(mock(() => ({})));
    spyOn(sentryReactModule, "withSentryRouting").mockImplementation((component: any) => component);
  });

  describe("captureException with sentry_skip flag", () => {
    it("should call Sentry.captureException for normal errors", () => {
      const error = new Error("Test error");
      const context = { extra: { source: "test" } };

      captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, context);
    });

    it("should skip Sentry when sentry_skip flag is true", () => {
      const error = new Error("Test error");
      const context = { extra: { sentry_skip: true } };

      const result = captureException(error, context);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(result).toBe("");
    });

    it("should call Sentry when sentry_skip flag is false", () => {
      const error = new Error("Test error");
      const context = { extra: { sentry_skip: false } };

      captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, context);
    });

    it("should call Sentry when sentry_skip flag is missing", () => {
      const error = new Error("Test error");
      const context = { extra: { other: "data" } };

      captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, context);
    });

    it("should call Sentry when context has no extra property", () => {
      const error = new Error("Test error");
      const context = { tags: { source: "test" } };

      captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, context);
    });

    it("should call Sentry when context is undefined", () => {
      const error = new Error("Test error");

      captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined);
    });
  });

  describe("SENTRY_ENABLED=false behavior", () => {
    let consoleSpy: Mock<any>;

    beforeEach(() => {
      consoleSpy = spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should not call Sentry when debug=true", async () => {
      (global as any).APP_SETTINGS = { ...mockAppSettings, debug: true };

      const SentryModule = await import(`./Sentry?bun_reload=${Date.now()}`);
      const error = new Error("Test error");
      const result = SentryModule.captureException(error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(error, undefined);
      expect(result).toBe("");

      (global as any).APP_SETTINGS = mockAppSettings;
    });

    it("should not call Sentry when DSN is missing", async () => {
      (global as any).APP_SETTINGS = { ...mockAppSettings, sentry_dsn: null };

      const SentryModule = await import(`./Sentry?bun_reload=${Date.now()}`);
      const error = new Error("Test error");
      const result = SentryModule.captureException(error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(error, undefined);
      expect(result).toBe("");

      (global as any).APP_SETTINGS = mockAppSettings;
    });
  });
});
