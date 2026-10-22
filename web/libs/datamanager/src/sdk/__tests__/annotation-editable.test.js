import { annotationEditable, shouldHoldProjectAccessDenied } from "../lsf-sdk";

test("another annotator's result is read only for a member", () => {
  expect(annotationEditable({ completed_by: 2 }, 1, false)).toBe(false);
  expect(annotationEditable({ completed_by: 1 }, 1, false)).toBe(true);
  expect(annotationEditable({ completed_by: 2 }, 1, true)).toBe(true);
});

test("project denial stays on the page", () => {
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 403)).toBe(true);
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 404)).toBe(true);
  expect(shouldHoldProjectAccessDenied("/organization", 404)).toBe(false);
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 401)).toBe(false);
});
