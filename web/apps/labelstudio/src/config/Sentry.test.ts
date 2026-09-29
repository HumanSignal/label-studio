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

  describe("isBrowserInjectedRangeError", () => {
    let isBrowserInjectedRangeError: any;

    beforeAll(async () => {
      const SentryModule = await import(`./Sentry?bun_reload=${Date.now()}`);
      isBrowserInjectedRangeError = SentryModule.isBrowserInjectedRangeError;
    });

    it("should return true for RangeError Maximum call stack size exceeded when every frame is the injected document URL, even when in_app is true", () => {
      window.history.pushState({}, "", "/projects/285203/labeling");
      try {
        const documentUrl = window.location.origin + window.location.pathname;
        const event: any = {
          exception: {
            values: [
              {
                type: "RangeError",
                value: "Maximum call stack size exceeded.",
                stacktrace: {
                  frames: [
                    { filename: documentUrl, lineno: 190, colno: 70, in_app: true },
                    { filename: documentUrl, function: "Ok", lineno: 226, colno: 63, in_app: true },
                    { filename: documentUrl, function: "Qk", lineno: 226, colno: 408, in_app: true },
                  ],
                },
              },
            ],
          },
        };

        expect(isBrowserInjectedRangeError(event)).toBe(true);
      } finally {
        window.history.pushState({}, "", "/");
      }
    });

    it("should return false for RangeError with application frames even when in_app is true", () => {
      const event: any = {
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: {
                frames: [
                  { filename: "https://app.humansignal.com/static/js/main.js", function: "renderApp", in_app: true },
                ],
              },
            },
          ],
        },
      };

      expect(isBrowserInjectedRangeError(event)).toBe(false);
    });

    it("should return false for RangeError with a production Vite bundle frame (/react-app/main-<hash>.js)", () => {
      const event: any = {
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: {
                frames: [
                  {
                    filename: "https://app.humansignal.com/react-app/main-AbC123.js",
                    function: "renderApp",
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
      };

      expect(isBrowserInjectedRangeError(event)).toBe(false);
    });

    it("should return false (keep) for a RangeError frame with no filename", () => {
      const event: any = {
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: {
                frames: [{ lineno: 1, colno: 1, in_app: true }],
              },
            },
          ],
        },
      };

      expect(isBrowserInjectedRangeError(event)).toBe(false);
    });

    it("should return false (keep) for a RangeError with a blob: frame", () => {
      const event: any = {
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: {
                frames: [
                  { filename: "blob:https://app.humansignal.com/1234-5678-90ab-cdef", function: "eval", in_app: true },
                ],
              },
            },
          ],
        },
      };

      expect(isBrowserInjectedRangeError(event)).toBe(false);
    });

    it("should return false for non-RangeError errors", () => {
      const event: any = {
        exception: {
          values: [
            {
              type: "TypeError",
              value: "Cannot read property 'foo' of undefined",
              stacktrace: {
                frames: [{ filename: "https://app.humansignal.com/projects/285203/labeling" }],
              },
            },
          ],
        },
      };

      expect(isBrowserInjectedRangeError(event)).toBe(false);
    });

    it("should return false if stack frames are empty", () => {
      const event: any = {
        exception: {
          values: [
            {
              type: "RangeError",
              value: "Maximum call stack size exceeded.",
              stacktrace: {
                frames: [],
              },
            },
          ],
        },
      };

      expect(isBrowserInjectedRangeError(event)).toBe(false);
    });
  });
});
