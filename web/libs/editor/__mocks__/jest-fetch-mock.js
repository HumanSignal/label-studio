/**
 * Mock for jest-fetch-mock (the package name is still jest-fetch-mock).
 * vitest.setup stubs global fetch with vi.fn(); this mock configures that stub via mockResponseOnce etc.
 */
const mock = {
  mockResponseOnce(body, init) {
    if (typeof globalThis.fetch?.mockResolvedValueOnce === "function") {
      globalThis.fetch.mockResolvedValueOnce(new Response(body, init));
    }
    return mock;
  },
  mockReject(value) {
    if (typeof globalThis.fetch?.mockRejectOnce === "function") {
      globalThis.fetch.mockRejectOnce(value);
    }
    return mock;
  },
  mockRejectOnce(value) {
    if (typeof globalThis.fetch?.mockRejectOnce === "function") {
      globalThis.fetch.mockRejectOnce(value);
    }
    return mock;
  },
  mockResponse(body, init) {
    if (typeof globalThis.fetch?.mockResolvedValue === "function") {
      globalThis.fetch.mockResolvedValue(new Response(body, init));
    }
    return mock;
  },
  resetMocks() {},
  enableMocks() {},
  disableMocks() {},
};

export default mock;
