import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { loadLiveTipsCollection } from "./utils";

describe("loadLiveTipsCollection", () => {
  const originalHostname = APP_SETTINGS.hostname;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    APP_SETTINGS.hostname = originalHostname;
  });

  it.each([
    ["a root deployment", "http://localhost/", "http://localhost/heidi-tips/"],
    ["a non-root deployment", "http://localhost/label-studio/", "http://localhost/label-studio/heidi-tips/"],
  ])("fetches Heidi tips with the configured base path for %s", (_scenario, hostname, expectedURL) => {
    APP_SETTINGS.hostname = hostname;
    const fetchMock = mock(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    loadLiveTipsCollection();

    expect(fetchMock.mock.calls[0][0]).toBe(expectedURL);
  });
});
