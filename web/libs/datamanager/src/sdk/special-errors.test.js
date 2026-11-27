import { describe, expect, test } from "bun:test";
import { errorHandlerAllowSpecialErrors } from "./special-errors";

const refusal = (status, reason) => ({
  status,
  response: { detail: "refused", ...(reason ? { display_context: { reason } } : {}) },
});

describe("errorHandlerAllowSpecialErrors", () => {
  test("lets a paused user's 403 reach the app", () => {
    expect(errorHandlerAllowSpecialErrors(refusal(403, "PAUSED"))).toBe(false);
  });

  test("lets a Done project's 403 reach the app, so the open stream can end", () => {
    expect(errorHandlerAllowSpecialErrors(refusal(403, "PROJECT_DONE"))).toBe(false);
  });

  test("keeps handling any other refusal in the data manager", () => {
    expect(errorHandlerAllowSpecialErrors(refusal(403))).toBe(true);
    expect(errorHandlerAllowSpecialErrors(refusal(500, "PROJECT_DONE"))).toBe(true);
  });
});
