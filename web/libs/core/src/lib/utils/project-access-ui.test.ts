import {
  PROJECT_ACCESS_HELD_EVENT,
  PROJECT_ACCESS_HELD_KEY,
  annotationEditable,
  clearProjectAccessHold,
  holdProjectAccessDenied,
  httpMethodFromEndpoint,
  isProjectAccessHeld,
  shouldBlockRequestWhileProjectAccessHeld,
  shouldHoldProjectRequestDenied,
  subscribeProjectAccessHeld,
} from "./project-access-ui";

describe("annotation ownership", () => {
  test.each([
    [{ id: 41, completed_by: null }, false],
    [{ id: 41 }, false],
    [{ id: "local-id", pk: "41", user: null }, false],
    [{ id: "local-id", pk: null, user: null, userGenerate: true, sentUserGenerate: false }, true],
    [{ id: "local-id", pk: undefined, user: null }, true],
    [{ id: 41, completed_by: { id: "7" } }, true],
    [{ id: 41, completed_by: { id: 8 } }, false],
    [{ id: "local-id", pk: "41", user: { id: 7 } }, true],
    [{ id: "local-id", pk: "41", user: { id: 8 } }, false],
  ])("member editability for %j is %j", (annotation, expected) => {
    expect(annotationEditable(annotation, 7, false)).toBe(expected);
  });

  test("a manager can edit a persisted annotation whose author was deleted", () => {
    expect(annotationEditable({ id: 41, completed_by: null }, 7, true)).toBe(true);
  });

  test.each([
    [false, null, false],
    [false, 7, true],
    [false, 8, false],
    [true, 8, false],
  ])("private draft editability requires its owner (manager=%j, owner=%j)", (canManage, owner, expected) => {
    const draft = {
      id: "local-id",
      pk: null,
      user: owner,
      userGenerate: true,
      sentUserGenerate: false,
      draftId: 12,
    };
    expect(annotationEditable(draft, 7, canManage)).toBe(expected);
  });
});

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

test("an ML backends 403 on the data page does not hold, an annotation write 403 does", () => {
  const page = "/projects/5/data";

  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/ml?project=5")).toBe(false);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/storages?project=5")).toBe(false);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/webhooks/?project=5")).toBe(false);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/projects/5/import")).toBe(false);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/projects/5/export?exportType=JSON")).toBe(
    false,
  );
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/projects/9/")).toBe(false);

  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/tasks/7/annotations/")).toBe(true);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/annotations/3/")).toBe(true);
  expect(shouldHoldProjectRequestDenied(page, 404, "http://localhost:8080/api/drafts/2/")).toBe(true);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/tasks/7/")).toBe(true);
  expect(shouldHoldProjectRequestDenied(page, 403, "http://localhost:8080/api/projects/5/")).toBe(true);
  expect(shouldHoldProjectRequestDenied(page, 404, "http://localhost:8080/api/dm/project?project=5")).toBe(true);

  expect(shouldHoldProjectRequestDenied("/organization", 403, "http://localhost:8080/api/annotations/3/")).toBe(false);
  expect(shouldHoldProjectRequestDenied(page, 500, "http://localhost:8080/api/annotations/3/")).toBe(false);
});
