import {
  PROJECT_ACCESS_HELD_EVENT,
  PROJECT_ACCESS_HELD_KEY,
  clearProjectAccessHold,
  holdProjectAccessDenied,
  httpMethodFromEndpoint,
  isProjectAccessHeld,
  shouldBlockRequestWhileProjectAccessHeld,
  subscribeProjectAccessHeld,
} from "./project-access-ui";

afterEach(() => {
  clearProjectAccessHold();
  window.history.pushState(null, "", "/");
});

test("a data manager hold runs the banner subscriber", () => {
  const seen: boolean[] = [];
  const unsubscribe = subscribeProjectAccessHeld(() => {
    seen.push(isProjectAccessHeld());
  });

  window.history.pushState(null, "", "/projects/5/data");
  holdProjectAccessDenied();

  expect(seen).toEqual([true]);
  expect(isProjectAccessHeld()).toBe(true);
  expect((window as unknown as Record<string, unknown>)[PROJECT_ACCESS_HELD_KEY]).toBe(true);

  // The other bundle only shares window: a hold flag plus the event reaches this subscriber.
  clearProjectAccessHold();
  (window as unknown as Record<string, unknown>)[PROJECT_ACCESS_HELD_KEY] = true;
  window.dispatchEvent(new Event(PROJECT_ACCESS_HELD_EVENT));

  expect(seen).toEqual([true, false, true]);
  expect(isProjectAccessHeld()).toBe(true);
  expect(shouldBlockRequestWhileProjectAccessHeld("POST")).toBe(true);

  unsubscribe();
});

test("a held GET still proceeds, a held POST does not, and a new project id clears the hold", () => {
  window.history.pushState(null, "", "/projects/5/data");
  holdProjectAccessDenied();

  expect(shouldBlockRequestWhileProjectAccessHeld(httpMethodFromEndpoint("GET:/projects/:pk"))).toBe(false);
  expect(shouldBlockRequestWhileProjectAccessHeld(httpMethodFromEndpoint("POST:/projects"))).toBe(true);
  expect(shouldBlockRequestWhileProjectAccessHeld(httpMethodFromEndpoint("PATCH:/projects/:pk"))).toBe(true);
  expect(shouldBlockRequestWhileProjectAccessHeld(httpMethodFromEndpoint("PUT:/projects/:pk/members/:user_id/"))).toBe(
    true,
  );
  expect(shouldBlockRequestWhileProjectAccessHeld(httpMethodFromEndpoint("DELETE:/projects/:pk"))).toBe(true);

  window.history.pushState(null, "", "/projects/5/settings");
  expect(isProjectAccessHeld()).toBe(true);

  window.history.pushState(null, "", "/projects/8/data");
  expect(isProjectAccessHeld()).toBe(false);
  expect(shouldBlockRequestWhileProjectAccessHeld("POST")).toBe(false);
});
